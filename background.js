// Initialize extension when installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Page Blur Pro installed');
});

// Track which tabs have the content script injected
const injectedTabs = new Set();

// Inject content script when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Check if we can inject into this tab
    if (!tab.url.startsWith('http')) {
      console.log('Cannot inject into non-HTTP tab:', tab.url);
      return;
    }
    
    // Check if content script is already injected
    if (injectedTabs.has(tab.id)) {
      // Try to ping the content script to see if it's still responsive
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        console.log('Content script already injected and responsive');
        return;
      } catch (error) {
        // If ping fails, the content script might be invalidated
        console.log('Content script not responsive, reinjecting');
        injectedTabs.delete(tab.id);
      }
    }
    
    // Inject content script
    await injectContentScript(tab);
  } catch (error) {
    console.error('Error handling extension icon click:', error);
  }
});

// Function to inject content scripts
async function injectContentScript(tab) {
  try {
    // First try to inject CSS
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content.css']
    });
    
    // Then inject the content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    
    // Mark tab as injected
    injectedTabs.add(tab.id);
    
    // Remove tab from tracking when it's closed
    chrome.tabs.onRemoved.addListener((tabId) => {
      if (tabId === tab.id) {
        injectedTabs.delete(tabId);
      }
    });
    
    console.log('Content script injected successfully');
  } catch (error) {
    console.error('Error injecting content script:', error);
    // If injection fails, remove tab from tracking
    injectedTabs.delete(tab.id);
  }
}

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === 'updateBlurList') {
      // Forward blur list updates to popup if it's open
      chrome.runtime.sendMessage(message).catch(() => {
        // Ignore errors when popup is not open
      });
    } else if (message.action === 'setMode' && sender.tab) {
      // Forward mode changes to content script
      chrome.tabs.sendMessage(sender.tab.id, message).catch(() => {
        // Ignore errors if content script is not ready
      });
    } else if (message.action === 'updateBlurIntensity' && sender.tab) {
      // Forward blur intensity changes to content script
      chrome.tabs.sendMessage(sender.tab.id, message).catch(() => {
        // Ignore errors if content script is not ready
      });
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
}); 