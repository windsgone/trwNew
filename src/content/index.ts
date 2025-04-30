import { TabRule } from '../types';
import { emojiToFaviconDataUrl } from '../utils/emoji';

let observer: MutationObserver | null = null;
let currentRule: TabRule | null = null;

function applyTabRule(rule: TabRule) {
  currentRule = rule; // Keep track of the current rule
  
  let isRuleUpdated = false;
  
  // --- Store original values only if they haven't been stored yet --- 
  // Check if we need to store the original title
  if (document.title && (!rule.originalTitle || rule.originalTitle === rule.title)) {
    rule.originalTitle = document.title;
    isRuleUpdated = true;
  }
  
  // Check if we need to store the original favicon
  const faviconLink = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  const currentFaviconHref = faviconLink?.getAttribute('href');
  if (currentFaviconHref && (!rule.originalFavicon || rule.originalFavicon === emojiToFaviconDataUrl(rule.faviconEmoji))) { 
    // Avoid storing the emoji data URL as original
    if (!currentFaviconHref.startsWith('data:image/png;base64')) { 
      rule.originalFavicon = currentFaviconHref;
      isRuleUpdated = true;
    }
  }
  // ------------------------------------------------------------------

  if (isRuleUpdated) {
    chrome.runtime.sendMessage({ type: 'UPDATE_RULE', payload: rule }, _response => {
      if (chrome.runtime.lastError) {
        // Consider more robust error handling if needed
      }
    });
  }
  
  updateTitle(rule.title);
  updateFavicon(rule.faviconEmoji);
  
  if (!observer) {
    setupMutationObserver();
  }
}

function updateTitle(title: string) {
  if (document.title !== title) {
    document.title = title;
  } else {
  }
}

function updateFavicon(emoji: string) {
  if (!emoji) {
    return;
  }
  
  const faviconUrl = emojiToFaviconDataUrl(emoji);
  
  let link = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]') as HTMLLinkElement | null;
  
  if (!link) {
    link = document.createElement('link') as HTMLLinkElement;
    link.rel = 'icon'; // Set rel attribute
    document.head.appendChild(link);
  }

  if (link.getAttribute('href') !== faviconUrl) {
    link.setAttribute('href', faviconUrl);
  } else {
  }
}

function setupMutationObserver() {
  if (observer) {
    return;
  }
  const headElement = document.querySelector('head');
  if (!headElement) {
      return;
  }
  
  observer = new MutationObserver((mutations) => {
    let titleNeedsReset = false;
    mutations.forEach((mutation) => {
      // Check if the <title> element itself was added/removed or its direct text node child changed
      if (mutation.target.nodeName === 'TITLE' && (mutation.type === 'childList' || mutation.type === 'characterData')) {
         // Handles case where <title> element content changes or element is replaced
          if (currentRule && document.title !== currentRule.title) {
             titleNeedsReset = true;
          }
      } else if (mutation.type === 'characterData' && mutation.target.parentNode?.nodeName === 'TITLE') {
         // Handles case where the text node inside <title> changes
         if (currentRule && document.title !== currentRule.title) {
            titleNeedsReset = true;
         }
       }
     });
    if (titleNeedsReset && currentRule) {
        updateTitle(currentRule.title);
    }
  });
  
  observer.observe(headElement, {
    subtree: true, // Observe changes within the head subtree
    childList: true, // Observe addition/removal of nodes (like <title> or <link>)
    characterData: true // Observe changes to text nodes (like the content of <title>)
  });
}

function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    try {
      if (message.type === 'APPLY_TAB_RULE') {
        applyTabRule(message.payload);
        sendResponse({ success: true });
      } else {
        // It's important to handle the case where sendResponse might not be called
        // For unhandled messages, we don't need to send a response.
        return false; // Indicate we are not sending an async response here
      }
    } catch (err) {
      sendResponse({ success: false, error: String(err) });
    }
    return true; 
  });
}

function notifyBackgroundScriptReady() {
  try {
    chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' }, _response => {
      if (chrome.runtime.lastError) {
        setTimeout(notifyBackgroundScriptReady, 1000);
      } else {
      }
    });
  } catch (err) {
    setTimeout(notifyBackgroundScriptReady, 1000);
  }
}

// --- Initialization --- 
setupMessageListener();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    notifyBackgroundScriptReady();
  });
} else {
  notifyBackgroundScriptReady();
}
