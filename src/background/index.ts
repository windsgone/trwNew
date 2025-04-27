import { getAllRules } from '../utils/storage';
import { findBestMatchRule } from '../utils/rules';
import { updateRule } from '../utils/storage';

const pendingMessages = new Map<number, any>();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONTENT_SCRIPT_READY' && sender.tab && sender.tab.id) {
    const tabId = sender.tab.id;
    if (pendingMessages.has(tabId)) {
      const pendingMessage = pendingMessages.get(tabId);
      try {
        chrome.tabs.sendMessage(tabId, pendingMessage).catch(error => {
          console.log(`重试发送消息到标签 ${tabId} 失败: ${error.message}`);
        });
      } catch (error) {
        console.log(`重试发送消息到标签 ${tabId} 时出错: ${error}`);
      }
      pendingMessages.delete(tabId);
    }
    sendResponse({ success: true });
    return true;
  } else if (message.type === 'UPDATE_RULE') {
    // 处理更新规则的消息
    updateRule(message.payload)
      .then(() => {
        console.log(`已更新规则: ${message.payload.id}`);
        if (sendResponse) sendResponse({ success: true });
      })
      .catch(error => {
        console.error(`更新规则失败: ${error.message}`);
        if (sendResponse) sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  return false; // 添加默认返回值
});

async function sendMessageToTab(tabId: number, message: any) {
  try {
    await chrome.tabs.sendMessage(tabId, message).catch(() => {
      console.log(`将消息添加到待处理队列: 标签 ${tabId}`);
      pendingMessages.set(tabId, message);
    });
  } catch (error) {
    console.log(`发送消息到标签 ${tabId} 时出错，添加到待处理队列`);
    pendingMessages.set(tabId, message);
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    const rules = await getAllRules();
    const bestMatchRule = findBestMatchRule(tab.url, rules);
    
    if (bestMatchRule) {
      const message = {
        type: 'APPLY_TAB_RULE',
        payload: bestMatchRule
      };
      
      setTimeout(() => {
        sendMessageToTab(tabId, message);
      }, 500); // 给内容脚本一些时间来加载
    }
  }
});

chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId === 0 && !details.url.startsWith('chrome://')) {
    const rules = await getAllRules();
    const bestMatchRule = findBestMatchRule(details.url, rules);
    
    if (bestMatchRule) {
      const message = {
        type: 'APPLY_TAB_RULE',
        payload: bestMatchRule
      };
      
      setTimeout(() => {
        sendMessageToTab(details.tabId, message);
      }, 500); // 给内容脚本一些时间来加载
    }
  }
});
