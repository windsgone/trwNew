import emojiData from '../emoji/emojiData';
import { getRecentEmojis, addRecentEmoji } from '../utils/storage';

interface EmojiPickerOptions {
  container: HTMLElement;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

// 表情分类
const CATEGORIES: Record<string, string> = {
  recent: '最近使用',
  smileys: '笑脸与情感',
  animals: '动物与自然',
  food: '食物与饮料',
  activity: '活动',
  travel: '旅行与地点',
  objects: '物品',
  symbols: '符号',
  flags: '旗帜'
};

// 分类对应的图标
const CATEGORY_ICONS: Record<string, string> = {
  recent: '🕒',
  smileys: '😀',
  animals: '🐱',
  food: '🍔',
  activity: '⚽',
  travel: '🚗',
  objects: '💡',
  symbols: '❤️',
  flags: '🏁'
};

export function createEmojiPicker(options: EmojiPickerOptions) {
  // 创建DOM结构
  const pickerElement = document.createElement('div');
  pickerElement.className = 'emoji-picker';
  
  // 创建分类标签栏
  const tabsElement = createCategoryTabs();
  
  // 创建搜索框
  const searchElement = createSearchInput(options);
  
  // 创建表情容器
  const emojiContainerElement = document.createElement('div');
  emojiContainerElement.className = 'emoji-container';
  
  // 组装DOM
  pickerElement.appendChild(tabsElement);
  pickerElement.appendChild(searchElement);
  pickerElement.appendChild(emojiContainerElement);
  
  // 初始化
  init(pickerElement, emojiContainerElement, options);
  
  // 添加到容器
  options.container.appendChild(pickerElement);
  
  // 返回控制函数
  return {
    destroy: () => {
      // 移除全局点击事件监听器
      const handler = (pickerElement as any)._documentClickHandler;
      if (handler) {
        document.removeEventListener('click', handler);
      }
      
      // 移除DOM元素
      if (options.container.contains(pickerElement)) {
        options.container.removeChild(pickerElement);
      }
    }
  };
}

// 初始化函数
async function init(
  pickerElement: HTMLElement, 
  containerElement: HTMLElement, 
  options: EmojiPickerOptions
) {
  // 加载最近使用的表情
  const recentEmojis = await getRecentEmojis();
  
  // 渲染最近使用的表情
  if (recentEmojis.length > 0) {
    renderEmojiCategory('recent', recentEmojis, containerElement, options);
  }
  
  // 按分类整理表情
  const categorizedEmojis = categorizeEmojis();
  
  // 渲染各分类的表情
  Object.entries(categorizedEmojis).forEach(([category, emojis]) => {
    renderEmojiCategory(category, emojis, containerElement, options);
  });
  
  // 设置点击外部关闭
  const documentClickHandler = (e: MouseEvent) => {
    if (!pickerElement.contains(e.target as Node) && 
        !options.container.contains(e.target as Node)) {
      options.onClose();
    }
  };
  
  document.addEventListener('click', documentClickHandler);
  
  // 默认激活第一个标签
  const firstTab = pickerElement.querySelector('.emoji-tab') as HTMLElement;
  if (firstTab) {
    firstTab.click();
  }
  
  // 将事件处理器附加到pickerElement，以便在destroy时可以访问
  (pickerElement as any)._documentClickHandler = documentClickHandler;
}

// 按分类整理表情
function categorizeEmojis() {
  const categorized: Record<string, string[]> = {};
  
  Object.entries(emojiData).forEach(([emoji, data]: [string, any]) => {
    const category = data.category;
    
    if (!categorized[category]) {
      categorized[category] = [];
    }
    
    categorized[category].push(emoji);
  });
  
  return categorized;
}

// 渲染表情分类
function renderEmojiCategory(
  category: string, 
  emojis: string[], 
  container: HTMLElement, 
  options: EmojiPickerOptions
) {
  const categoryElement = document.createElement('div');
  categoryElement.className = 'emoji-category';
  categoryElement.id = `category-${category}`;
  
  // 分类标题
  const titleElement = document.createElement('h3');
  titleElement.textContent = CATEGORIES[category] || category;
  categoryElement.appendChild(titleElement);
  
  // 表情网格
  const gridElement = document.createElement('div');
  gridElement.className = 'emoji-grid';
  
  // 添加表情
  emojis.forEach(emoji => {
    const emojiElement = document.createElement('div');
    emojiElement.className = 'emoji-item';
    emojiElement.textContent = emoji;
    
    // 获取表情的关键词作为标题
    const emojiInfo = (emojiData as Record<string, any>)[emoji];
    if (emojiInfo && emojiInfo.keywords && emojiInfo.keywords.length > 0) {
      emojiElement.title = emojiInfo.keywords[0];
    }
    
    // 点击选择表情
    emojiElement.addEventListener('click', async () => {
      await options.onSelect(emoji);
    });
    
    gridElement.appendChild(emojiElement);
  });
  
  categoryElement.appendChild(gridElement);
  container.appendChild(categoryElement);
}

// 创建分类标签栏
function createCategoryTabs() {
  const tabsElement = document.createElement('div');
  tabsElement.className = 'emoji-tabs';
  
  // 添加分类标签
  Object.entries(CATEGORIES).forEach(([category, name]) => {
    const tabElement = document.createElement('div');
    tabElement.className = 'emoji-tab';
    tabElement.dataset.category = category;
    
    // 添加图标
    tabElement.textContent = CATEGORY_ICONS[category] || '📋';
    tabElement.title = name;
    
    // 点击切换分类
    tabElement.addEventListener('click', () => {
      // 移除所有活动状态
      document.querySelectorAll('.emoji-tab').forEach(tab => {
        tab.classList.remove('active');
      });
      
      // 添加活动状态
      tabElement.classList.add('active');
      
      // 滚动到对应分类
      const categoryElement = document.getElementById(`category-${category}`);
      if (categoryElement) {
        categoryElement.scrollIntoView();
      }
    });
    
    tabsElement.appendChild(tabElement);
  });
  
  return tabsElement;
}

// 创建搜索输入框
function createSearchInput(options: EmojiPickerOptions) {
  const searchElement = document.createElement('div');
  searchElement.className = 'emoji-search';
  
  // 创建搜索图标容器
  const searchIconContainer = document.createElement('div');
  searchIconContainer.className = 'search-icon-container';
  
  // 添加搜索图标 SVG
  const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgElement.setAttribute('width', '16');
  svgElement.setAttribute('height', '16');
  svgElement.setAttribute('viewBox', '0 0 20 20');
  
  const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathElement.setAttribute('d', 'M12.9 14.32a8 8 0 1 1 1.41-1.41l5.35 5.33-1.42 1.42-5.33-5.34zM8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12z');
  
  svgElement.appendChild(pathElement);
  searchIconContainer.appendChild(svgElement);
  
  const inputElement = document.createElement('input');
  inputElement.type = 'text';
  
  // 将搜索图标和输入框添加到搜索元素中
  searchElement.appendChild(searchIconContainer);
  searchElement.appendChild(inputElement);
  
  // 搜索功能
  inputElement.addEventListener('input', (e) => {
    const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
    
    if (!searchTerm) {
      // 显示所有表情
      document.querySelectorAll('.emoji-item').forEach(item => {
        (item as HTMLElement).style.display = 'flex';
      });
      
      // 显示所有分类
      document.querySelectorAll('.emoji-category').forEach(category => {
        (category as HTMLElement).style.display = 'block';
      });
      
      return;
    }
    
    // 隐藏所有分类
    document.querySelectorAll('.emoji-category').forEach(category => {
      (category as HTMLElement).style.display = 'none';
    });
    
    // 创建搜索结果分类
    let searchResultsElement = document.getElementById('category-search-results');
    if (!searchResultsElement) {
      searchResultsElement = document.createElement('div');
      searchResultsElement.className = 'emoji-category';
      searchResultsElement.id = 'category-search-results';
      
      const titleElement = document.createElement('h3');
      titleElement.textContent = '搜索结果';
      searchResultsElement.appendChild(titleElement);
      
      const gridElement = document.createElement('div');
      gridElement.className = 'emoji-grid';
      searchResultsElement.appendChild(gridElement);

      // 新增：没有找到表情的提示元素
      const noResultsMessageElement = document.createElement('p');
      noResultsMessageElement.id = 'no-results-message';
      noResultsMessageElement.textContent = '没有找到相关表情';
      noResultsMessageElement.style.display = 'none'; // 初始隐藏
      searchResultsElement.appendChild(noResultsMessageElement);
      
      document.querySelector('.emoji-container')?.appendChild(searchResultsElement);
    }
    
    // 清空搜索结果
    const gridElement = searchResultsElement.querySelector('.emoji-grid');
    if (gridElement) {
      gridElement.innerHTML = '';
    }
    
    // 过滤表情
    Object.entries(emojiData).forEach(([emoji, data]: [string, any]) => {
      // 检查关键词是否匹配
      const matches = data.keywords.some((keyword: string) => 
        keyword.toLowerCase().includes(searchTerm)
      );
      
      if (matches) {
        const emojiElement = document.createElement('div');
        emojiElement.className = 'emoji-item';
        emojiElement.textContent = emoji;
        emojiElement.title = data.keywords[0];
        
        // 点击选择表情
        emojiElement.addEventListener('click', async () => {
          await addRecentEmoji(emoji);
          await options.onSelect(emoji);
        });
        
        gridElement?.appendChild(emojiElement);
      }
    });
    
    // 显示搜索结果分类
    searchResultsElement.style.display = 'block';
    
    // 如果没有找到表情，则显示提示
    const noResultsMessage = searchResultsElement.querySelector('#no-results-message') as HTMLElement;
    if (noResultsMessage && gridElement?.children.length === 0) {
      noResultsMessage.style.display = 'block';
    } else if (noResultsMessage) {
      noResultsMessage.style.display = 'none';
    }
  });
  
  return searchElement;
}
