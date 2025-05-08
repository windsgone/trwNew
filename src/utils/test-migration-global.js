/**
 * 数据迁移测试工具 - 全局版本
 * 将测试函数暴露到全局作用域，方便在控制台中调用
 */

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
window.createMockOldData = async function() {
  // 清除所有现有数据
  await chrome.storage.local.clear();
  
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
};

/**
 * 清除所有存储数据
 */
window.clearAllData = async function() {
  await chrome.storage.local.clear();
  console.log('已清除所有存储数据');
};

/**
 * 查看当前存储中的所有数据
 */
window.viewAllData = async function() {
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
};

/**
 * 重置迁移标志，以便再次测试
 */
window.resetMigrationFlag = async function() {
  await chrome.storage.local.remove(MIGRATION_COMPLETED_KEY);
  console.log('已重置数据迁移标志，可以再次执行迁移测试');
};

/**
 * 执行完整的测试流程
 */
window.runMigrationTest = async function() {
  console.log('===== 开始数据迁移测试 =====');
  
  // 步骤1: 创建模拟数据
  console.log('步骤1: 创建模拟的旧版数据');
  await window.createMockOldData();
  
  // 步骤2: 查看初始数据
  console.log('步骤2: 查看初始数据');
  await window.viewAllData();
  
  // 步骤3: 执行迁移
  console.log('步骤3: 执行数据迁移');
  // 这里需要调用您的迁移函数
  // 由于无法直接导入，我们可以使用以下方式：
  if (typeof chrome.runtime.getBackgroundPage === 'function') {
    const bg = await chrome.runtime.getBackgroundPage();
    if (bg && bg.migrateDataIfNeeded) {
      await bg.migrateDataIfNeeded();
    } else {
      console.error('无法找到迁移函数，请确保在background.js中导出了migrateDataIfNeeded函数');
    }
  } else {
    console.log('请手动触发迁移函数，例如重新加载扩展或调用chrome.runtime.reload()');
  }
  
  // 步骤4: 查看迁移后的数据
  console.log('步骤4: 查看迁移后的数据');
  await window.viewAllData();
  
  console.log('===== 数据迁移测试完成 =====');
};

console.log('数据迁移测试工具已加载，可以使用以下函数：');
console.log('- createMockOldData(): 创建模拟的旧版数据');
console.log('- viewAllData(): 查看当前存储中的所有数据');
console.log('- resetMigrationFlag(): 重置迁移标志');
console.log('- runMigrationTest(): 执行完整的测试流程');
console.log('- clearAllData(): 清除所有存储数据');
