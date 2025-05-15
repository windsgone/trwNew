import { getAllRules, updateRule, savePageInfo } from '../utils/storage';
import { findBestMatchRule } from '../utils/rules';
import { migrateDataIfNeeded } from '../utils/migration';

// 在扩展安装或更新时触发数据迁移
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`扩展${details.reason === 'install' ? '安装' : '更新'}完成，版本: ${chrome.runtime.getManifest().version}`);
  
  if (details.reason === 'install' || details.reason === 'update') {
    try {
      console.log('start...');
      await migrateDataIfNeeded();
      console.log('done');
    } catch (error) {
      console.error('failed:', error);
    }
  }
});

const pendingMessages = new Map<number, any>();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONTENT_SCRIPT_READY' && sender?.tab?.id) {
    const tabId = sender.tab.id;
    
    // 处理页面信息
    if (message.payload?.pageInfo && sender.tab?.url) {
      // 保存页面信息到存储
      savePageInfo(sender.tab.url!, message.payload.pageInfo)
        .catch((error: Error) => {
          console.error(`[BACKGROUND] Failed to save page info for ${sender.tab?.url}: ${error.message}`);
        });
    }
    
    if (pendingMessages.has(tabId)) {
      const pendingMessage = pendingMessages.get(tabId);
      try {
        chrome.tabs.sendMessage(tabId, pendingMessage).catch((error: Error) => {
          console.error(`[BACKGROUND] Failed to resend pending message to tab ${tabId}: ${error.message}`);
        });
      } catch (error: unknown) {
        console.error(`[BACKGROUND] Error resending pending message to tab ${tabId}:`, error);
      }
      pendingMessages.delete(tabId);
    }
    sendResponse({ success: true });
    return true;
  } else if (message.type === 'UPDATE_RULE') {
    updateRule(message.payload)
      .then(() => {
        if (sendResponse) sendResponse({ success: true });
      })
      .catch(error => {
        console.error(`[BACKGROUND] Failed to update rule ${message.payload.id}: ${error.message}`);
        if (sendResponse) sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (message.type === 'APPLY_RULE_NOW' && message.payload && message.payload.tabId && message.payload.rule) {
    const { tabId, rule } = message.payload;
    sendMessageToTab(tabId, { type: 'APPLY_TAB_RULE', payload: rule });
    if (sendResponse) sendResponse({ success: true });
    return true;
  } else if (message.action === 'openOptionsPageAndShowLlm') {
    const optionsUrl = chrome.runtime.getURL('src/options/index.html?tab=llm');

    chrome.tabs.query({ url: chrome.runtime.getURL('src/options/index.html*') }, (tabs) => {
      if (tabs.length > 0) {
        // 如果选项页面已打开，则更新其URL并激活
        chrome.tabs.update(tabs[0].id!, { active: true, url: optionsUrl });
      } else {
        // 否则，打开新的选项页面
        chrome.tabs.create({ url: optionsUrl });
      }
    });
    return true; 
  }
  return false; // Indicate async response is not sent for unhandled messages
});

async function sendMessageToTab(tabId: number, message: any) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error: any) {
    if (error.message?.includes('Could not establish connection') || error.message?.includes('Receiving end does not exist')) {
      pendingMessages.set(tabId, message);
    } else {
      console.error(`[BACKGROUND] Error sending message to tab ${tabId}, adding to pending queue:`, error);
      pendingMessages.set(tabId, message); // Still add to pending for other errors, maybe temporary
    }
  }
}

chrome.tabs.onUpdated.addListener(async (_tabId, _changeInfo, _tab) => {
});

chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId === 0 && details.url && !details.url.startsWith('chrome://') && !details.url.startsWith('edge://') && !details.url.startsWith('about:')) {
    const rules = await getAllRules();
    const bestMatchRule = findBestMatchRule(details.url, rules);

    if (bestMatchRule) {
      const message = { type: 'APPLY_TAB_RULE', payload: bestMatchRule };
      sendMessageToTab(details.tabId, message); // Send directly
    }
  }
});
