import { TabRule, CreateTabRuleInput } from '../types';

const RULES_KEY = 'tab_rename_rules';

export async function getAllRules(): Promise<TabRule[]> {
  const result = await chrome.storage.local.get(RULES_KEY);
  return result[RULES_KEY] || [];
}

export async function saveRule(input: CreateTabRuleInput): Promise<TabRule> {
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
  
  throw new Error(`未找到ID为 ${updatedRule.id} 的规则`);
}

export async function deleteRule(id: string): Promise<void> {
  const rules = await getAllRules();
  const filteredRules = rules.filter(rule => rule.id !== id);
  await chrome.storage.local.set({ [RULES_KEY]: filteredRules });
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
