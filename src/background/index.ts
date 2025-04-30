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
          console.error(`[BACKGROUND] Failed to resend pending message to tab ${tabId}: ${error.message}`);
        });
      } catch (error) {
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
