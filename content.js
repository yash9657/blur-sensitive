// Check if the extension is already initialized
if (window.pageBlurProInitialized) {
  console.log('Page Blur Pro already initialized');
} else {
  window.pageBlurProInitialized = true;

  class PageBlurPro {
    constructor() {
      this.blurIntensity = 5;
      this.activeMode = null;
      this.blurs = new Map();
      this.isDrawing = false;
      this.currentArea = null;
      this.extensionContextValid = true;
      this.init();
    }

    async init() {
      try {
        // Check if we can access chrome.runtime
        if (!chrome?.runtime?.id) {
          console.error('Extension context is invalid');
          this.extensionContextValid = false;
          return;
        }

        await this.loadSavedSettings();
        this.setupEventListeners();
        this.applyBlurs();
      } catch (error) {
        console.error('Error initializing PageBlurPro:', error);
        this.extensionContextValid = false;
      }
    }

    setupEventListeners() {
      document.addEventListener('mousedown', this.handleMouseDown.bind(this));
      document.addEventListener('mouseup', this.handleMouseUp.bind(this));
      document.addEventListener('mousemove', this.handleMouseMove.bind(this));
      document.addEventListener('mouseover', this.handleMouseOver.bind(this));
      document.addEventListener('mouseout', this.handleMouseOut.bind(this));
      document.addEventListener('click', this.handleClick.bind(this));
      document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
      document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
      
      // Listen for DOM changes
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            this.checkForNewElements(mutation.addedNodes);
          }
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    async loadSavedSettings() {
      try {
        if (!this.extensionContextValid) return;
        
        const result = await chrome.storage.local.get(['blurs', 'activeMode', 'blurIntensity']);
        
        // Restore blur intensity
        if (result.blurIntensity) {
          this.blurIntensity = result.blurIntensity;
        }
        
        // Restore active mode
        if (result.activeMode) {
          this.setMode(result.activeMode);
        }
        
        // Restore blurs
        if (result.blurs) {
          this.blurs = new Map(Object.entries(result.blurs));
          // Filter out any invalid blurs
          this.blurs.forEach((blur, selector) => {
            if (!document.querySelector(selector)) {
              this.blurs.delete(selector);
            }
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        this.extensionContextValid = false;
      }
    }

    async saveSettings() {
      try {
        if (!this.extensionContextValid) {
          // Try to reinitialize the extension context
          this.extensionContextValid = true;
          await this.init();
          if (!this.extensionContextValid) {
            console.warn('Unable to reinitialize extension context');
            return;
          }
        }
        
        const settings = {
          blurs: Object.fromEntries(this.blurs),
          activeMode: this.activeMode,
          blurIntensity: this.blurIntensity
        };
        
        await chrome.storage.local.set(settings);
      } catch (error) {
        console.error('Error saving settings:', error);
        this.extensionContextValid = false;
        // Don't throw the error, just log it
      }
    }

    setMode(mode) {
      this.activeMode = mode;
      
      // Force cursor update by adding/removing a class to the body
      document.body.classList.remove('page-blur-pro-area-mode', 'page-blur-pro-element-mode');
      
      if (mode === 'area') {
        document.body.classList.add('page-blur-pro-area-mode');
        // Create a temporary overlay to ensure cursor changes
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 9998;
          cursor: crosshair;
          pointer-events: none;
        `;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 100);
      } else if (mode === 'element') {
        document.body.classList.add('page-blur-pro-element-mode');
      }
      
      // Reset any active drawing
      if (this.currentArea) {
        this.currentArea.remove();
        this.currentArea = null;
      }
      this.isDrawing = false;
      
      // Save the mode
      this.saveSettings();
    }

    updateBlurIntensity(value) {
      this.blurIntensity = parseInt(value);
      
      // Update all existing blurs with the new intensity
      this.blurs.forEach((blur, selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (element.classList.contains('page-blur-pro-blurred')) {
            if (blur.type === 'area') {
              element.style.backdropFilter = `blur(${this.blurIntensity}px)`;
              element.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            } else {
              element.style.filter = `blur(${this.blurIntensity}px)`;
            }
          }
        });
      });
      
      this.saveSettings();
    }

    handleMouseDown(e) {
      if (this.activeMode === 'area' && !this.isDrawing) {
        this.isDrawing = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        
        // Create the area element
        this.currentArea = document.createElement('div');
        this.currentArea.className = 'page-blur-pro-area';
        this.currentArea.style.cssText = `
          position: fixed;
          left: ${this.startX}px;
          top: ${this.startY}px;
          width: 0;
          height: 0;
          background-color: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(${this.blurIntensity}px);
          border: 2px dashed rgba(255, 255, 255, 0.5);
          pointer-events: none;
          z-index: 9999;
        `;
        document.body.appendChild(this.currentArea);
      }
    }

    handleMouseMove(e) {
      if (this.activeMode === 'area' && this.isDrawing && this.currentArea) {
        const width = Math.abs(e.clientX - this.startX);
        const height = Math.abs(e.clientY - this.startY);
        const left = Math.min(e.clientX, this.startX);
        const top = Math.min(e.clientY, this.startY);
        
        this.currentArea.style.cssText = `
          position: fixed;
          left: ${left}px;
          top: ${top}px;
          width: ${width}px;
          height: ${height}px;
          background-color: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(${this.blurIntensity}px);
          border: 2px dashed rgba(255, 255, 255, 0.5);
          pointer-events: none;
          z-index: 9999;
        `;
      }
    }

    handleMouseUp(e) {
      if (this.activeMode === 'area' && this.isDrawing) {
        this.isDrawing = false;
        if (this.currentArea) {
          const rect = this.currentArea.getBoundingClientRect();
          if (rect.width > 10 && rect.height > 10) {
            // Add a slight delay to make the transition smoother
            setTimeout(() => {
              this.addBlur({
                type: 'area',
                element: this.currentArea,
                rect: rect
              });
            }, 50);
          } else {
            this.currentArea.remove();
          }
          this.currentArea = null;
        }
      }
    }

    handleMouseOver(e) {
      if (this.activeMode === 'element') {
        e.target.classList.add('page-blur-pro-highlight');
      }
    }

    handleMouseOut(e) {
      if (this.activeMode === 'element') {
        e.target.classList.remove('page-blur-pro-highlight');
      }
    }

    handleClick(e) {
      try {
        if (!this.extensionContextValid) return;
        
        const target = e.target;
        if (target.classList.contains('page-blur-pro-blurred')) {
          e.preventDefault();
          e.stopPropagation();
          this.removeBlur(target);
        } else if (this.activeMode === 'element') {
          this.applyBlur(target);
        }
      } catch (error) {
        console.error('Error handling click:', error);
      }
    }

    handleSelectionChange() {
      if (this.activeMode === 'text') {
        const selection = window.getSelection();
        if (selection.toString().trim()) {
          const range = selection.getRangeAt(0);
          const span = document.createElement('span');
          span.className = 'page-blur-pro-text';
          try {
            range.surroundContents(span);
            this.addBlur({
              type: 'text',
              element: span
            });
            selection.removeAllRanges();
          } catch (e) {
            console.error('Error applying text blur:', e);
          }
        }
      }
    }

    handleContextMenu(e) {
      try {
        if (!this.extensionContextValid) return;
        
        const target = e.target;
        if (!target.classList.contains('page-blur-pro-blurred')) {
          this.applyBlur(target);
          e.preventDefault();
        }
      } catch (error) {
        console.error('Error handling context menu:', error);
      }
    }

    addBlur(blur) {
      if (!blur || !blur.element) return;
      
      const selector = this.generateSelector(blur.element);
      if (!selector) return;
      
      this.blurs.set(selector, {
        type: blur.type || 'element',
        selector,
        timestamp: Date.now(),
        rect: blur.rect
      });
      
      this.applyBlur(blur.element, blur.type);
      this.saveSettings();
      this.updatePopup();
    }

    removeBlur(element) {
      try {
        if (!this.extensionContextValid || !element) return;
        
        const selector = this.generateSelector(element);
        if (!selector) return;
        
        // Remove all blur-related styles
        element.classList.remove('page-blur-pro-blurred');
        element.style.filter = '';
        element.style.backdropFilter = '';
        element.style.backgroundColor = '';
        
        // If it's an area blur, remove the element entirely
        if (element.classList.contains('page-blur-pro-area')) {
          element.remove();
        }
        
        // Remove from storage
        this.blurs.delete(selector);
        
        // Save changes and update UI
        this.saveSettings();
        this.updatePopup();
      } catch (error) {
        console.error('Error removing blur:', error);
      }
    }

    applyBlur(element, type = 'element') {
      try {
        if (!this.extensionContextValid || !element) return;
        
        element.classList.add('page-blur-pro-blurred');
        
        if (type === 'area') {
          element.style.backdropFilter = `blur(${this.blurIntensity}px)`;
          element.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          element.style.pointerEvents = 'auto';
        } else {
          element.style.filter = `blur(${this.blurIntensity}px)`;
        }
      } catch (error) {
        console.error('Error applying blur:', error);
      }
    }

    applyBlurs() {
      try {
        if (!this.extensionContextValid) return;
        
        this.blurs.forEach((blur, selector) => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            if (element && !element.classList.contains('page-blur-pro-blurred')) {
              this.applyBlur(element, blur.type);
            }
          });
        });
      } catch (error) {
        console.error('Error applying blurs:', error);
      }
    }

    updatePopup() {
      try {
        if (!this.extensionContextValid) return;
        
        const blurList = Array.from(this.blurs.values()).map(blur => ({
          type: blur.type,
          selector: blur.selector,
          timestamp: blur.timestamp,
          rect: blur.rect
        }));
        
        chrome.runtime.sendMessage({
          action: 'updateBlurList',
          blurs: blurList,
          activeMode: this.activeMode,
          blurIntensity: this.blurIntensity
        }).catch(() => {
          // Ignore errors when popup is not open
        });
      } catch (error) {
        console.error('Error updating popup:', error);
      }
    }

    checkForNewElements(nodes) {
      try {
        if (!this.extensionContextValid) return;
        
        for (const node of nodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.applyBlursToElement(node);
          }
        }
      } catch (error) {
        console.error('Error checking for new elements:', error);
      }
    }

    applyBlursToElement(element) {
      try {
        if (!this.extensionContextValid) return;
        
        this.blurs.forEach((blur, selector) => {
          const elements = element.querySelectorAll(selector);
          elements.forEach(el => {
            if (!el.classList.contains('page-blur-pro-blurred')) {
              this.applyBlur(el, blur.type);
            }
          });
        });
      } catch (error) {
        console.error('Error applying blurs to element:', error);
      }
    }

    generateSelector(element) {
      try {
        if (!element || !element.tagName) return null;
        
        let selector = element.tagName.toLowerCase();
        if (element.id) {
          selector += `#${element.id}`;
        } else if (element.className) {
          selector += `.${element.className.split(' ').join('.')}`;
        }
        return selector;
      } catch (error) {
        console.error('Error generating selector:', error);
        return null;
      }
    }
  }

  // Initialize the extension
  const pageBlurPro = new PageBlurPro();

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      if (message.action === 'ping') {
        sendResponse({ status: 'ok' });
        return true;
      } else if (message.action === 'setMode') {
        pageBlurPro.setMode(message.mode);
        sendResponse({ status: 'ok' });
        return true;
      } else if (message.action === 'updateBlurIntensity') {
        pageBlurPro.updateBlurIntensity(message.value);
        sendResponse({ status: 'ok' });
        return true;
      } else if (message.action === 'unblur') {
        const blurs = Array.from(pageBlurPro.blurs.values());
        if (message.index >= 0 && message.index < blurs.length) {
          const blur = blurs[message.index];
          const elements = document.querySelectorAll(blur.selector);
          elements.forEach(element => {
            if (element.classList.contains('page-blur-pro-blurred')) {
              pageBlurPro.removeBlur(element);
            }
          });
        }
        sendResponse({ status: 'ok' });
        return true;
      } else if (message.action === 'unblurAll') {
        // Get all blurred elements, including area blurs and text blurs
        const blurredElements = document.querySelectorAll('.page-blur-pro-blurred');
        const areaElements = document.querySelectorAll('.page-blur-pro-area');
        const textElements = document.querySelectorAll('.page-blur-pro-text');
        
        // Remove all regular blurred elements
        blurredElements.forEach(element => {
          pageBlurPro.removeBlur(element);
        });
        
        // Remove all area blur elements
        areaElements.forEach(element => {
          element.remove();
        });
        
        // Remove all text blur elements
        textElements.forEach(element => {
          // Unwrap the text content
          const parent = element.parentNode;
          while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
          }
          parent.removeChild(element);
        });
        
        // Clear the blurs map
        pageBlurPro.blurs.clear();
        
        // Save the empty state
        pageBlurPro.saveSettings();
        
        sendResponse({ status: 'ok' });
        return true;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });
} 