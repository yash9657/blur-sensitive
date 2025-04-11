document.addEventListener('DOMContentLoaded', () => {
  const textBlurBtn = document.getElementById('textBlur');
  const areaBlurBtn = document.getElementById('areaBlur');
  const elementBlurBtn = document.getElementById('elementBlur');
  const blurAmount = document.getElementById('blurAmount');
  const blurValue = document.getElementById('blurValue');
  const blurList = document.getElementById('blurList');
  const unblurList = document.getElementById('unblurList');
  const unblurAllBtn = document.getElementById('unblurAll');

  let activeMode = null;

  // Function to inject content script if needed
  async function ensureContentScriptInjected() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if we can access the tab
      if (!tab || !tab.id) {
        console.error('No active tab found');
        return false;
      }
      
      // Try to send a test message to see if content script is already injected
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        return true; // Content script is already injected
      } catch (error) {
        // Content script is not injected, inject it
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content.css']
        });
        return true;
      }
    } catch (error) {
      console.error('Error injecting content script:', error);
      return false;
    }
  }

  // Update blur intensity display
  blurAmount.addEventListener('input', async (e) => {
    const value = e.target.value;
    blurValue.textContent = `${value}px`;
    
    if (await ensureContentScriptInjected()) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'updateBlurIntensity',
          value: value
        });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  });

  // Load saved blur settings
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (tabs.length === 0) return;
    
    const tab = tabs[0];
    chrome.storage.local.get(['blurs', 'activeMode', 'blurIntensity'], (data) => {
      if (data.blurIntensity) {
        blurAmount.value = data.blurIntensity;
        blurValue.textContent = `${data.blurIntensity}px`;
      }
      
      if (data.activeMode) {
        activeMode = data.activeMode;
        updateActiveButton();
      }
      
      if (data.blurs) {
        updateBlurList(Object.values(data.blurs));
      }
    });
  });

  // Mode selection handlers
  textBlurBtn.addEventListener('click', async () => {
    if (await ensureContentScriptInjected()) {
      setMode('text');
    }
  });
  
  areaBlurBtn.addEventListener('click', async () => {
    if (await ensureContentScriptInjected()) {
      setMode('area');
    }
  });
  
  elementBlurBtn.addEventListener('click', async () => {
    if (await ensureContentScriptInjected()) {
      setMode('element');
    }
  });

  // Unblur all button
  unblurAllBtn.addEventListener('click', async () => {
    if (await ensureContentScriptInjected()) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'unblurAll'
        });
        // Update the blur list immediately
        updateBlurList([]);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  });

  async function setMode(mode) {
    if (activeMode === mode) {
      activeMode = null;
      textBlurBtn.classList.remove('active');
      areaBlurBtn.classList.remove('active');
      elementBlurBtn.classList.remove('active');
    } else {
      activeMode = mode;
      textBlurBtn.classList.remove('active');
      areaBlurBtn.classList.remove('active');
      elementBlurBtn.classList.remove('active');
      document.getElementById(`${mode}Blur`).classList.add('active');
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'setMode',
        mode: activeMode
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
  
  function updateActiveButton() {
    textBlurBtn.classList.remove('active');
    areaBlurBtn.classList.remove('active');
    elementBlurBtn.classList.remove('active');
    
    if (activeMode) {
      document.getElementById(`${activeMode}Blur`).classList.add('active');
    }
  }

  function updateBlurList(blurs) {
    blurList.innerHTML = '';
    unblurList.innerHTML = '';
    
    if (!blurs || blurs.length === 0) {
      blurList.innerHTML = '<div class="empty-list">No blurred elements</div>';
      unblurList.innerHTML = '<div class="empty-list">No blurred elements</div>';
      return;
    }
    
    blurs.forEach((blur, index) => {
      // Add to blur list
      const blurItem = document.createElement('div');
      blurItem.className = 'blur-item';
      
      const blurText = document.createElement('span');
      blurText.textContent = `${blur.type || 'element'} blur`;
      
      blurItem.appendChild(blurText);
      blurList.appendChild(blurItem);
      
      // Add to unblur list
      const unblurItem = document.createElement('div');
      unblurItem.className = 'unblur-item';
      
      const unblurText = document.createElement('span');
      unblurText.textContent = `${blur.type || 'element'} blur`;
      
      const unblurButton = document.createElement('button');
      unblurButton.textContent = 'Unblur';
      unblurButton.className = 'unblur-button';
      unblurButton.onclick = async () => {
        if (await ensureContentScriptInjected()) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          try {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'unblur',
              index: index
            });
            // Remove the item from the list immediately
            const updatedBlurs = blurs.filter((_, i) => i !== index);
            updateBlurList(updatedBlurs);
          } catch (error) {
            console.error('Error sending message:', error);
          }
        }
      };
      
      unblurItem.appendChild(unblurText);
      unblurItem.appendChild(unblurButton);
      unblurList.appendChild(unblurItem);
    });
  }

  // Listen for blur updates from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateBlurList') {
      updateBlurList(message.blurs);
      
      if (message.activeMode !== undefined) {
        activeMode = message.activeMode;
        updateActiveButton();
      }
      
      if (message.blurIntensity !== undefined) {
        blurAmount.value = message.blurIntensity;
        blurValue.textContent = `${message.blurIntensity}px`;
      }
    }
  });
}); 