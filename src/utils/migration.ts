import { TabRule, MatchMode, RecentEmojis } from '../types';
import { generateId } from './storage';

// 旧版本的存储键名
const OLD_FAVICON_HISTORY_KEY = 'faviconHistory';
const OLD_FREQUENTLY_USED_EMOJIS_KEY = 'frequentlyUsedEmojis';
const OLD_TAB_HISTORY_KEY = 'tabHistory';

// 新版本的存储键名
const NEW_RULES_KEY = 'tab_rename_rules';
const NEW_RECENT_EMOJIS_KEY = 'recent_emojis';

// 迁移标志键名
const MIGRATION_COMPLETED_KEY = 'data_migration_v1_completed';

// 最大最近表情符号数量
const MAX_RECENT_EMOJIS = 18;

/**
 * 检查并执行数据迁移
 * 在扩展更新时或首次访问数据时调用
 */
export async function migrateDataIfNeeded(): Promise<void> {
  try {
    // 检查是否已经迁移过
    const migrationFlag = await chrome.storage.local.get(MIGRATION_COMPLETED_KEY);
    if (migrationFlag[MIGRATION_COMPLETED_KEY]) {
      console.log('already migrated');
      return; // 已经迁移过，不需要再次迁移
    }

    console.log('start migrate...');
    
    // 1. 迁移标签规则
    await migrateTabRules();
    
    // 2. 迁移最近使用的表情符号
    await migrateRecentEmojis();
    
    // 设置迁移完成标志
    await chrome.storage.local.set({ [MIGRATION_COMPLETED_KEY]: true });
    console.log('migrate success');
  } catch (error) {
    console.error('migrate failed:', error);
    // 这里可以添加错误处理逻辑，如重试或通知用户
  }
}

/**
 * 迁移标签规则数据
 * 将旧版本的 tabHistory 和 faviconHistory 合并为新版本的 tab_rename_rules
 */
async function migrateTabRules(): Promise<void> {
  // 获取旧数据
  const oldData = await chrome.storage.local.get([
    OLD_TAB_HISTORY_KEY, 
    OLD_FAVICON_HISTORY_KEY
  ]);
  
  const tabHistory = oldData[OLD_TAB_HISTORY_KEY] || {};
  const faviconHistory = oldData[OLD_FAVICON_HISTORY_KEY] || {};
  
  // 检查是否有数据需要迁移
  if (Object.keys(tabHistory).length === 0 && Object.keys(faviconHistory).length === 0) {
    console.log('no tab need migrate');
    return;
  }
  
  // 合并 tabHistory 和 faviconHistory 数据
  const newRules: TabRule[] = [];
  
  // 处理 tabHistory 数据
  for (const url in tabHistory) {
    const tabData = tabHistory[url];
    const faviconData = faviconHistory[url];
    
    const newRule: TabRule = {
      id: generateId(),
      urlPattern: url,
      matchMode: 'exact' as MatchMode,
      title: tabData.newTitle || '',
      faviconEmoji: faviconData?.emoji || '',
      originalTitle: tabData.originalTitle || '',
      originalFavicon: tabData.originalFaviconUrl || '',
      updatedAt: faviconData?.timestamp || Date.now()
    };
    
    newRules.push(newRule);
  }
  
  // 处理仅在 faviconHistory 中存在的 URL
  for (const url in faviconHistory) {
    // 如果该 URL 已经在 tabHistory 中处理过，则跳过
    if (tabHistory[url]) continue;
    
    const faviconData = faviconHistory[url];
    
    const newRule: TabRule = {
      id: generateId(),
      urlPattern: url,
      matchMode: 'exact' as MatchMode,
      title: '',
      faviconEmoji: faviconData.emoji || '',
      originalTitle: '',
      originalFavicon: '',
      updatedAt: faviconData.timestamp || Date.now()
    };
    
    newRules.push(newRule);
  }
  
  // 保存新格式数据
  if (newRules.length > 0) {
    await chrome.storage.local.set({ [NEW_RULES_KEY]: newRules });
    console.log(` ${newRules.length} tab rule migrate successful`);
    
    // 可选：备份旧数据
    await chrome.storage.local.set({
      'backup_tab_history': tabHistory,
      'backup_favicon_history': faviconHistory
    });
  }
}

/**
 * 迁移最近使用的表情符号数据
 * 将旧版本的 frequentlyUsedEmojis 转换为新版本的 recent_emojis
 */
async function migrateRecentEmojis(): Promise<void> {
  // 获取旧数据
  const oldData = await chrome.storage.local.get(OLD_FREQUENTLY_USED_EMOJIS_KEY);
  const frequentlyUsedEmojis = oldData[OLD_FREQUENTLY_USED_EMOJIS_KEY] || [];
  
  if (!Array.isArray(frequentlyUsedEmojis) || frequentlyUsedEmojis.length === 0) {
    console.log('no emoji need migrate');
    return;
  }
  
  // 按时间戳排序（从新到旧）
  frequentlyUsedEmojis.sort((a, b) => b.timestamp - a.timestamp);
  
  // 提取表情符号并限制数量
  const newEmojis: RecentEmojis = frequentlyUsedEmojis
    .map(item => item.emoji)
    .filter(Boolean) // 过滤掉可能的空值
    .slice(0, MAX_RECENT_EMOJIS);
  
  // 保存新格式数据
  if (newEmojis.length > 0) {
    await chrome.storage.local.set({ [NEW_RECENT_EMOJIS_KEY]: newEmojis });
    console.log(` ${newEmojis.length} emoji migrate successful`);
    
    // 可选：备份旧数据
    await chrome.storage.local.set({
      'backup_frequently_used_emojis': frequentlyUsedEmojis
    });
  }
}
