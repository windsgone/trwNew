/**
 * 数据迁移测试工具
 * 用于测试从旧版数据结构到新版数据结构的迁移
 */

import { migrateDataIfNeeded } from './migration';

// 旧版本的存储键名
const OLD_FAVICON_HISTORY_KEY = 'faviconHistory';
const OLD_FREQUENTLY_USED_EMOJIS_KEY = 'frequentlyUsedEmojis';
const OLD_TAB_HISTORY_KEY = 'tabHistory';

// 新版本的存储键名
const NEW_RULES_KEY = 'tab_rename_rules';
const NEW_RECENT_EMOJIS_KEY = 'recent_emojis';

// 迁移标志键名
const MIGRATION_COMPLETED_KEY = 'data_migration_v1_completed';

/**
 * 创建模拟的旧版数据用于测试
 */
export async function createMockOldData(): Promise<void> {
  // 清除所有现有数据
  await clearAllData();
  
  // 创建模拟数据
  const mockData = {
    [OLD_FAVICON_HISTORY_KEY]: {
      "https://www.baidu.com/": {
        "emoji": "😃",
        "timestamp": Date.now(),
        "url": "https://www.baidu.com/"
      },
      "https://www.github.com/": {
        "emoji": "🐱",
        "timestamp": Date.now() - 10000,
        "url": "https://www.github.com/"
      }
    },
    [OLD_FREQUENTLY_USED_EMOJIS_KEY]: [
      {
        "emoji": "😃",
        "timestamp": Date.now()
      },
      {
        "emoji": "🐱",
        "timestamp": Date.now() - 10000
      },
      {
        "emoji": "🚀",
        "timestamp": Date.now() - 20000
      }
    ],
    [OLD_TAB_HISTORY_KEY]: {
      "https://www.baidu.com/": {
        "newTitle": "百度搜索",
        "originalFaviconUrl": "https://www.baidu.com/favicon.ico",
        "originalTitle": "百度一下，你就知道",
        "url": "https://www.baidu.com/"
      },
      "https://www.zhihu.com/": {
        "newTitle": "知乎问答",
        "originalFaviconUrl": "https://static.zhihu.com/heifetz/favicon.ico",
        "originalTitle": "知乎 - 有问题，就会有答案",
        "url": "https://www.zhihu.com/"
      }
    }
  };
  
  // 写入存储
  await chrome.storage.local.set(mockData);
  console.log('已创建模拟的旧版数据：', mockData);
}

/**
 * 清除所有存储数据
 */
export async function clearAllData(): Promise<void> {
  await chrome.storage.local.clear();
  console.log('已清除所有存储数据');
}

/**
 * 查看当前存储中的所有数据
 */
export async function viewAllData(): Promise<void> {
  const allData = await chrome.storage.local.get(null);
  console.log('当前存储中的所有数据：', allData);
  
  // 检查是否有新版数据
  if (allData[NEW_RULES_KEY]) {
    console.log(`新版标签规则数据 (${allData[NEW_RULES_KEY].length} 条):`, allData[NEW_RULES_KEY]);
  } else {
    console.log('没有新版标签规则数据');
  }
  
  if (allData[NEW_RECENT_EMOJIS_KEY]) {
    console.log(`新版表情符号数据 (${allData[NEW_RECENT_EMOJIS_KEY].length} 个):`, allData[NEW_RECENT_EMOJIS_KEY]);
  } else {
    console.log('没有新版表情符号数据');
  }
  
  // 检查是否有旧版数据
  if (allData[OLD_TAB_HISTORY_KEY]) {
    console.log('旧版标签历史数据:', allData[OLD_TAB_HISTORY_KEY]);
  }
  
  if (allData[OLD_FAVICON_HISTORY_KEY]) {
    console.log('旧版图标历史数据:', allData[OLD_FAVICON_HISTORY_KEY]);
  }
  
  if (allData[OLD_FREQUENTLY_USED_EMOJIS_KEY]) {
    console.log('旧版表情符号数据:', allData[OLD_FREQUENTLY_USED_EMOJIS_KEY]);
  }
  
  // 检查迁移标志
  if (allData[MIGRATION_COMPLETED_KEY]) {
    console.log('数据迁移已完成');
  } else {
    console.log('数据迁移尚未完成');
  }
}

/**
 * 执行完整的测试流程
 */
export async function runMigrationTest(): Promise<void> {
  console.log('===== 开始数据迁移测试 =====');
  
  // 步骤1: 创建模拟数据
  console.log('步骤1: 创建模拟的旧版数据');
  await createMockOldData();
  
  // 步骤2: 查看初始数据
  console.log('步骤2: 查看初始数据');
  await viewAllData();
  
  // 步骤3: 执行迁移
  console.log('步骤3: 执行数据迁移');
  await migrateDataIfNeeded();
  
  // 步骤4: 查看迁移后的数据
  console.log('步骤4: 查看迁移后的数据');
  await viewAllData();
  
  console.log('===== 数据迁移测试完成 =====');
}

/**
 * 重置迁移标志，以便再次测试
 */
export async function resetMigrationFlag(): Promise<void> {
  await chrome.storage.local.remove(MIGRATION_COMPLETED_KEY);
  console.log('已重置数据迁移标志，可以再次执行迁移测试');
}
