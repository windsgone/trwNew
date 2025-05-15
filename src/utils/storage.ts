import { TabRule, CreateTabRuleInput, RecentEmojis } from '../types';
import { migrateDataIfNeeded } from './migration';
import { LLMSettings, LLMProviderType, ProviderSettings, DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_PROMPT } from './llm/types';
import { PageInfo } from './pageInfo';

const RULES_KEY = 'tab_rename_rules';
const RECENT_EMOJIS_KEY = 'recent_emojis';
const MAX_RECENT_EMOJIS = 18; 
const LLM_SETTINGS_KEY = 'llm_settings';
const PAGE_INFO_KEY = 'page_info';
const MAX_PAGE_INFO_ENTRIES = 100; // 最大存储的页面信息数量

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

/**
 * 获取LLM设置
 * 如果不存在，则返回默认设置
 */
export async function getLLMSettings(): Promise<LLMSettings> {
  const result = await chrome.storage.local.get(LLM_SETTINGS_KEY);
  
  if (result[LLM_SETTINGS_KEY]) {
    return result[LLM_SETTINGS_KEY] as LLMSettings;
  }
  
  // 返回默认设置
  return getDefaultLLMSettings();
}

/**
 * 保存LLM设置
 */
export async function saveLLMSettings(settings: LLMSettings): Promise<void> {
  await chrome.storage.local.set({ [LLM_SETTINGS_KEY]: settings });
}

/**
 * 更新特定提供商的设置
 */
export async function updateProviderSettings(
  providerType: LLMProviderType,
  settings: ProviderSettings
): Promise<LLMSettings> {
  const llmSettings = await getLLMSettings();
  
  llmSettings.providers[providerType] = settings;
  
  // 如果这是第一个配置的提供商，将其设为活跃提供商
  if (!llmSettings.activeProvider) {
    llmSettings.activeProvider = providerType;
  }
  
  await saveLLMSettings(llmSettings);
  return llmSettings;
}

/**
 * 设置活跃的LLM提供商
 */
export async function setActiveProvider(providerType: LLMProviderType): Promise<LLMSettings> {
  const llmSettings = await getLLMSettings();
  
  // 确保该提供商已配置
  if (!llmSettings.providers[providerType]) {
    throw new Error(`提供商 ${providerType} 尚未配置`);
  }
  
  llmSettings.activeProvider = providerType;
  await saveLLMSettings(llmSettings);
  return llmSettings;
}

/**
 * 获取默认的LLM设置
 */
export function getDefaultLLMSettings(): LLMSettings {
  return {
    activeProvider: LLMProviderType.OPENAI,
    providers: {
      [LLMProviderType.OPENAI]: {
        apiKey: '',
        models: ['gpt-3.5-turbo', 'gpt-4'],
        selectedModel: 'gpt-3.5-turbo',
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        userPrompt: DEFAULT_USER_PROMPT
      }
    }
  };
}

/**
 * 重置LLM设置为默认值
 */
export async function resetLLMSettings(): Promise<LLMSettings> {
  const defaultSettings = getDefaultLLMSettings();
  await saveLLMSettings(defaultSettings);
  return defaultSettings;
}

/**
 * 重置特定提供商的提示词为默认值
 */
export async function resetProviderPrompts(providerType: LLMProviderType): Promise<LLMSettings> {
  const llmSettings = await getLLMSettings();
  
  if (llmSettings.providers[providerType]) {
    llmSettings.providers[providerType]!.systemPrompt = DEFAULT_SYSTEM_PROMPT;
    llmSettings.providers[providerType]!.userPrompt = DEFAULT_USER_PROMPT;
    await saveLLMSettings(llmSettings);
  }
  
  return llmSettings;
}

/**
 * 页面信息存储接口
 */
export interface StoredPageInfo {
  url: string;
  domain: string;
  path: string;
  meta: PageInfo;
  mainContent: string;
  timestamp: number;
}

/**
 * 保存页面信息
 * @param url 页面URL
 * @param pageInfo 页面信息对象
 */
export async function savePageInfo(url: string, pageInfo: any): Promise<void> {
  // 获取现有的页面信息
  const storedPageInfoMap = await getPageInfoMap();
  
  // 处理不同的数据结构
  let domain = '';
  let path = '';
  let meta = null;
  let mainContent = '';
  
  // 如果pageInfo有meta属性（旧结构）
  if (pageInfo.meta) {
    domain = pageInfo.meta.domain || '';
    path = pageInfo.meta.path || '';
    meta = pageInfo.meta;
    mainContent = pageInfo.mainContent || '';
  } else {
    // 新结构：pageInfo本身包含所需字段
    domain = pageInfo.domain || '';
    path = pageInfo.path || '';
    meta = {
      title: pageInfo.title || '',
      url: pageInfo.url || url,
      domain: pageInfo.domain || '',
      path: pageInfo.path || '',
      description: pageInfo.description || ''
    };
    mainContent = '';
  }
  
  // 创建新的页面信息条目
  const pageInfoEntry: StoredPageInfo = {
    url,
    domain,
    path,
    meta,
    mainContent,
    timestamp: pageInfo.timestamp || Date.now()
  };
  
  // 更新或添加页面信息
  storedPageInfoMap.set(url, pageInfoEntry);
  
  // 如果超出最大存储数量，删除最旧的条目
  if (storedPageInfoMap.size > MAX_PAGE_INFO_ENTRIES) {
    // 按时间戳排序
    const sortedEntries = Array.from(storedPageInfoMap.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // 删除最旧的条目，直到符合最大存储数量
    while (sortedEntries.length > MAX_PAGE_INFO_ENTRIES) {
      const oldestEntry = sortedEntries.shift();
      if (oldestEntry) {
        storedPageInfoMap.delete(oldestEntry[0]);
      }
    }
  }
  
  // 保存到存储
  await savePageInfoMap(storedPageInfoMap);
}

/**
 * 获取特定URL的页面信息
 * @param url 页面URL
 * @returns 页面信息对象，如果不存在则返回null
 */
export async function getPageInfo(url: string): Promise<StoredPageInfo | null> {
  const storedPageInfoMap = await getPageInfoMap();
  return storedPageInfoMap.get(url) || null;
}

/**
 * 获取特定域名的所有页面信息
 * @param domain 域名
 * @returns 该域名下的所有页面信息
 */
export async function getPageInfoByDomain(domain: string): Promise<StoredPageInfo[]> {
  const storedPageInfoMap = await getPageInfoMap();
  return Array.from(storedPageInfoMap.values())
    .filter(info => info.domain === domain);
}

/**
 * 删除特定URL的页面信息
 * @param url 页面URL
 */
export async function deletePageInfo(url: string): Promise<void> {
  const storedPageInfoMap = await getPageInfoMap();
  storedPageInfoMap.delete(url);
  await savePageInfoMap(storedPageInfoMap);
}

/**
 * 获取所有页面信息
 * @returns 所有存储的页面信息
 */
export async function getAllPageInfo(): Promise<StoredPageInfo[]> {
  const storedPageInfoMap = await getPageInfoMap();
  return Array.from(storedPageInfoMap.values());
}

/**
 * 获取页面信息Map
 * @returns 页面信息Map
 */
async function getPageInfoMap(): Promise<Map<string, StoredPageInfo>> {
  const result = await chrome.storage.local.get(PAGE_INFO_KEY);
  const pageInfoObj = result[PAGE_INFO_KEY] || {};
  
  // 将对象转换为Map
  const pageInfoMap = new Map<string, StoredPageInfo>();
  Object.entries(pageInfoObj).forEach(([key, value]) => {
    pageInfoMap.set(key, value as StoredPageInfo);
  });
  
  return pageInfoMap;
}

/**
 * 保存页面信息Map
 * @param pageInfoMap 页面信息Map
 */
async function savePageInfoMap(pageInfoMap: Map<string, StoredPageInfo>): Promise<void> {
  // 将Map转换为对象
  const pageInfoObj: Record<string, StoredPageInfo> = {};
  pageInfoMap.forEach((value, key) => {
    pageInfoObj[key] = value;
  });
  
  // 保存到存储
  await chrome.storage.local.set({ [PAGE_INFO_KEY]: pageInfoObj });
}
