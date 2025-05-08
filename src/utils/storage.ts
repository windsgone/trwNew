import { TabRule, CreateTabRuleInput, RecentEmojis } from '../types';
import { migrateDataIfNeeded } from './migration';

const RULES_KEY = 'tab_rename_rules';
const RECENT_EMOJIS_KEY = 'recent_emojis';
const MAX_RECENT_EMOJIS = 18; 

// 旧版本的存储键名
const OLD_FAVICON_HISTORY_KEY = 'faviconHistory';
const OLD_FREQUENTLY_USED_EMOJIS_KEY = 'frequentlyUsedEmojis';
const OLD_TAB_HISTORY_KEY = 'tabHistory';

export async function getAllRules(): Promise<TabRule[]> {
  // 获取新版本数据
  const result = await chrome.storage.local.get(RULES_KEY);
  
  // 如果有新版本数据，直接返回
  if (result[RULES_KEY] && Array.isArray(result[RULES_KEY]) && result[RULES_KEY].length > 0) {
    return result[RULES_KEY];
  }
  
  // 检查是否有旧版本数据
  const oldData = await chrome.storage.local.get([OLD_TAB_HISTORY_KEY, OLD_FAVICON_HISTORY_KEY]);
  const tabHistory = oldData[OLD_TAB_HISTORY_KEY];
  const faviconHistory = oldData[OLD_FAVICON_HISTORY_KEY];
  
  // 如果有旧版本数据，触发迁移
  if ((tabHistory && Object.keys(tabHistory).length > 0) || 
      (faviconHistory && Object.keys(faviconHistory).length > 0)) {
    console.log('检测到旧版本规则数据，正在进行即时迁移');
    await migrateDataIfNeeded();
    
    // 再次尝试获取新格式数据
    const newResult = await chrome.storage.local.get(RULES_KEY);
    return newResult[RULES_KEY] || [];
  }
  
  // 没有任何数据
  return [];
}

// 重命名函数：创建新规则
export async function createNewRule(input: CreateTabRuleInput): Promise<TabRule> {
  const rules = await getAllRules();
  
  const newRule: TabRule = {
    ...input,
    id: generateId(),
    originalTitle: '',
    originalFavicon: '',
    updatedAt: Date.now()
  };
  
  rules.push(newRule);
  await chrome.storage.local.set({ [RULES_KEY]: rules });
  
  return newRule;
}

export async function updateRule(updatedRule: TabRule): Promise<TabRule> {
  const rules = await getAllRules();
  const index = rules.findIndex(rule => rule.id === updatedRule.id);
  
  if (index !== -1) {
    rules[index] = {
      ...updatedRule,
      updatedAt: Date.now()
    };
    await chrome.storage.local.set({ [RULES_KEY]: rules });
    return rules[index];
  }
  
  throw new Error(`can't find ${updatedRule.id} rule`);
}

export async function deleteRule(id: string): Promise<void> {
  const rules = await getAllRules();
  const filteredRules = rules.filter(rule => rule.id !== id);
  await chrome.storage.local.set({ [RULES_KEY]: filteredRules });
}

export async function getRecentEmojis(): Promise<RecentEmojis> {
  // 获取新版本数据
  const result = await chrome.storage.local.get(RECENT_EMOJIS_KEY);
  
  // 如果有新版本数据，直接返回
  if (result[RECENT_EMOJIS_KEY] && Array.isArray(result[RECENT_EMOJIS_KEY]) && result[RECENT_EMOJIS_KEY].length > 0) {
    return result[RECENT_EMOJIS_KEY];
  }
  
  // 检查是否有旧版本数据
  const oldData = await chrome.storage.local.get(OLD_FREQUENTLY_USED_EMOJIS_KEY);
  const oldEmojis = oldData[OLD_FREQUENTLY_USED_EMOJIS_KEY];
  
  // 如果有旧版本数据，触发迁移
  if (oldEmojis && Array.isArray(oldEmojis) && oldEmojis.length > 0) {
    console.log('检测到旧版本表情符号数据，正在进行即时迁移');
    await migrateDataIfNeeded();
    
    // 再次尝试获取新格式数据
    const newResult = await chrome.storage.local.get(RECENT_EMOJIS_KEY);
    return newResult[RECENT_EMOJIS_KEY] || [];
  }
  
  // 没有任何数据
  return [];
}

export async function addRecentEmoji(emoji: string): Promise<RecentEmojis> {
  const recentEmojis = await getRecentEmojis();
  
  // 如果表情已存在，先移除它
  const filteredEmojis = recentEmojis.filter(e => e !== emoji);
  
  // 将新表情添加到最前面
  filteredEmojis.unshift(emoji);
  
  // 限制数量
  const trimmedEmojis = filteredEmojis.slice(0, MAX_RECENT_EMOJIS);
  
  // 保存到存储
  await chrome.storage.local.set({ [RECENT_EMOJIS_KEY]: trimmedEmojis });
  
  return trimmedEmojis;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
