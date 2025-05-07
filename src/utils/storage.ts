import { TabRule, CreateTabRuleInput, RecentEmojis } from '../types';

const RULES_KEY = 'tab_rename_rules';
const RECENT_EMOJIS_KEY = 'recent_emojis';
const MAX_RECENT_EMOJIS = 18; 

export async function getAllRules(): Promise<TabRule[]> {
  const result = await chrome.storage.local.get(RULES_KEY);
  return result[RULES_KEY] || [];
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
  const result = await chrome.storage.local.get(RECENT_EMOJIS_KEY);
  return result[RECENT_EMOJIS_KEY] || [];
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

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
