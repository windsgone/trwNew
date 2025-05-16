import { TabRule } from '../types';
import { emojiToFaviconDataUrl } from '../utils/emoji';
import { getPageInfoWithTimestamp } from '../utils/pageInfo';

let observer: MutationObserver | null = null;
let currentRule: TabRule | null = null;

function applyTabRule(rule: TabRule) {
  currentRule = rule; 
  
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
  

  if (isRuleUpdated) {
    chrome.runtime.sendMessage({ type: 'UPDATE_RULE', payload: rule }, _response => {
      if (chrome.runtime.lastError) {
        
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
  }
}

// 定义重试次数和间隔
let faviconRetryCount = 0;
const MAX_FAVICON_RETRIES = 5;
const RETRY_INTERVAL_MS = 500;

function updateFavicon(emoji: string) {
  if (!emoji) {
    return;
  }
  
  const faviconUrl = emojiToFaviconDataUrl(emoji);
  
  // 重置重试计数
  faviconRetryCount = 0;
  
  // 执行更新，并设置重试机制
  updateFaviconWithRetry(faviconUrl);
}

function updateFaviconWithRetry(faviconUrl: string) {
  // 查找所有可能的favicon链接
  const allFaviconLinks = document.querySelectorAll(
    'link[rel*="icon"], link[rel="apple-touch-icon"], link[rel="mask-icon"], link[rel="fluid-icon"]'
  );
  
  // 首先尝试更新现有的favicon链接
  let updated = false;
  if (allFaviconLinks.length > 0) {
    // 创建要更新的favicon类型优先级列表
    const priorityRels = ['icon', 'shortcut icon', 'apple-touch-icon', 'mask-icon', 'fluid-icon'];
    
    // 按优先级尝试更新
    for (const relType of priorityRels) {
      const matchingLinks = Array.from(allFaviconLinks).filter(
        link => link.getAttribute('rel')?.toLowerCase().includes(relType.toLowerCase())
      );
      
      if (matchingLinks.length > 0) {
        matchingLinks.forEach(link => {
          try {
            (link as HTMLLinkElement).href = faviconUrl;
            updated = true;
          } catch (e) {
          }
        });
      }
    }
    
    // 如果没有按优先级找到，则更新所有favicon
    if (!updated) {
      allFaviconLinks.forEach(link => {
        try {
          (link as HTMLLinkElement).href = faviconUrl;
          updated = true;
        } catch (e) {
        }
      });
    }
  }
  
  // 如果没有找到或更新失败，创建新的favicon链接
  if (!updated) {
    try {
      // 创建标准favicon
      let standardIcon = document.createElement('link');
      standardIcon.rel = 'icon';
      standardIcon.href = faviconUrl;
      document.head.appendChild(standardIcon);
      
      // 创建shortcut icon
      let shortcutIcon = document.createElement('link');
      shortcutIcon.rel = 'shortcut icon';
      shortcutIcon.href = faviconUrl;
      document.head.appendChild(shortcutIcon);
      
      // 创建apple-touch-icon
      let appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      appleIcon.href = faviconUrl;
      document.head.appendChild(appleIcon);
      
      updated = true;
    } catch (e) {
    }
  }
  
  // 检查是否需要重试
  if (!updated && faviconRetryCount < MAX_FAVICON_RETRIES) {
    faviconRetryCount++;
    setTimeout(() => updateFaviconWithRetry(faviconUrl), RETRY_INTERVAL_MS);
  } else if (!updated) {
    // 达到最大重试次数仍未成功
  } else {
    // 成功更新favicon
    // 设置一个延迟检查，确保favicon没有被网站重新覆盖
    setTimeout(() => {
      const currentFavicons = document.querySelectorAll('link[rel*="icon"]');
      let needsReapply = false;
      
      currentFavicons.forEach(icon => {
        if ((icon as HTMLLinkElement).href !== faviconUrl) {
          needsReapply = true;
        }
      });
      
      if (needsReapply) {
        updateFaviconWithRetry(faviconUrl);
      }
    }, 1000); // 1秒后检查
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
    let faviconNeedsReset = false;
    
    mutations.forEach((mutation) => {
      // 检查标题变化
      if (mutation.target.nodeName === 'TITLE' && (mutation.type === 'childList' || mutation.type === 'characterData')) {
         // 处理<title>元素内容变化或元素被替换的情况
          if (currentRule && document.title !== currentRule.title) {
             titleNeedsReset = true;
          }
      } else if (mutation.type === 'characterData' && mutation.target.parentNode?.nodeName === 'TITLE') {
         // 处理<title>内的文本节点变化的情况
         if (currentRule && document.title !== currentRule.title) {
            titleNeedsReset = true;
         }
      }
      
      // 检查favicon变化
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // 检查是否添加了新的favicon链接
        mutation.addedNodes.forEach(node => {
          if (node.nodeName === 'LINK') {
            const link = node as HTMLLinkElement;
            const rel = link.getAttribute('rel');
            if (rel && rel.includes('icon') && currentRule) {
              faviconNeedsReset = true;
            }
          }
        });
      }
      
      // 检查现有favicon属性变化
      if (mutation.type === 'attributes' && 
          mutation.attributeName === 'href' && 
          (mutation.target as Element).getAttribute('rel')?.includes('icon')) {
        if (currentRule) {
          const targetHref = (mutation.target as HTMLLinkElement).getAttribute('href');
          const emojiUrl = emojiToFaviconDataUrl(currentRule.faviconEmoji);
          if (targetHref !== emojiUrl) {
            faviconNeedsReset = true;
          }
        }
      }
    });
    
    // 应用需要的更新
    if (currentRule) {
      if (titleNeedsReset) {
        updateTitle(currentRule.title);
      }
      
      if (faviconNeedsReset) {
        updateFavicon(currentRule.faviconEmoji);
      }
    }
  });
  
  observer.observe(headElement, {
    subtree: true, 
    childList: true, 
    characterData: true, 
    attributes: true, 
    attributeFilter: ['href', 'rel'] 
  });
}

function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    try {
      if (message.type === 'APPLY_TAB_RULE') {
        applyTabRule(message.payload);
        sendResponse({ success: true });
      } else if (message.type === 'GET_PAGE_INFO') {
        // 获取页面信息并返回给弹出窗口
        const pageInfo = getPageInfoWithTimestamp();
        sendResponse({ success: true, pageInfo });
      } else {
        return false; 
      }
    } catch (err) {
      sendResponse({ success: false, error: String(err) });
    }
    return true; 
  });
}

function notifyBackgroundScriptReady() {
  try {
    // 提取页面信息
    const pageInfo = getPageInfoWithTimestamp();
    
    // 发送内容脚本就绪消息和页面信息
    chrome.runtime.sendMessage({ 
      type: 'CONTENT_SCRIPT_READY',
      payload: { pageInfo }
    }, _response => {
      if (chrome.runtime.lastError) {
        setTimeout(notifyBackgroundScriptReady, 1000);
      }
    });
  } catch (err) {
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
