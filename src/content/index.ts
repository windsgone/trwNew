import { TabRule } from '../types';
import { emojiToFaviconDataUrl } from '../utils/emoji';

let observer: MutationObserver | null = null;
let currentRule: TabRule | null = null;

function applyTabRule(rule: TabRule) {
  currentRule = rule;
  
  let isRuleUpdated = false;
  
  if (document.title && !rule.originalTitle) {
    rule.originalTitle = document.title;
    isRuleUpdated = true;
  }
  
  const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  if (favicon && favicon.getAttribute('href') && !rule.originalFavicon) {
    rule.originalFavicon = favicon.getAttribute('href') || '';
    isRuleUpdated = true;
  }
  
  if (isRuleUpdated) {
    // 将更新后的规则发送回后台脚本
    chrome.runtime.sendMessage({
      type: 'UPDATE_RULE',
      payload: rule
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
  }
}

function updateFavicon(emoji: string) {
  if (!emoji) return;
  
  const faviconUrl = emojiToFaviconDataUrl(emoji);
  
  let link = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]') as HTMLLinkElement | null;
  
  if (!link) {
    link = document.createElement('link') as HTMLLinkElement;
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  
  link!.setAttribute('href', faviconUrl);
}

function setupMutationObserver() {
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.target.nodeName === 'TITLE' && currentRule) {
        updateTitle(currentRule.title);
      }
    }
  });
  
  observer.observe(document.querySelector('head')!, {
    subtree: true,
    childList: true,
    characterData: true
  });
}

function setupMessageListener() {
  try {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      try {
        if (message.type === 'APPLY_TAB_RULE') {
          applyTabRule(message.payload);
          sendResponse({ success: true });
        }
      } catch (err) {
        console.error('处理消息时出错:', err);
        sendResponse({ success: false, error: String(err) });
      }
      return true;
    });
    console.log('内容脚本消息监听器已设置');
  } catch (err) {
    console.error('设置消息监听器时出错:', err);
  }
}

function notifyBackgroundScriptReady() {
  try {
    chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' }, _response => {
      if (chrome.runtime.lastError) {
        console.log('通知后台脚本时出错:', chrome.runtime.lastError);
        setTimeout(notifyBackgroundScriptReady, 1000);
      } else {
        console.log('已通知后台脚本内容脚本已准备好');
      }
    });
  } catch (err) {
    console.error('发送就绪消息时出错:', err);
    setTimeout(notifyBackgroundScriptReady, 1000);
  }
}

setupMessageListener();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    notifyBackgroundScriptReady();
  });
} else {
  notifyBackgroundScriptReady();
}

console.log('Tab Rename Wiz 内容脚本已加载');
