import { TabRule } from '../types';
import { getAllRules, deleteRule } from '../utils/storage';
import { applyLocalization, getMessage } from '../utils/i18nUtils';
import { initLLMSettings } from './llm-settings';

let ruleIdToDelete: string | null = null;

/**
 * 切换到LLM设置标签页
 */
function switchToLLMTab() {
  console.log(getMessage('tryingSwitchToLLMTab'));
  const llmNavButton = document.getElementById('nav-llm');
  if (llmNavButton) {
    console.log(getMessage('foundLLMNavButton'));
    // 直接切换标签页，而不是模拟点击
    const llmTab = document.getElementById('llm-tab');
    if (llmTab) {
      // 隐藏所有标签页
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
      // 显示LLM标签页
      llmTab.classList.add('active');
      // 更新导航按钮状态
      document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
      llmNavButton.classList.add('active');
      console.log(getMessage('llmTabSwitchSuccess'));
    } else {
      console.error(getMessage('llmTabContentNotFound'));
    }
  } else {
    console.error(getMessage('llmNavButtonNotFound'));
  }
}

// 添加消息监听器，用于接收从popup页面发送的消息
chrome.runtime.onMessage.addListener((message) => {
  console.log(getMessage('receivedMessage'), message);
  // 保留 return true 如果还有其他消息需要异步响应，否则可以移除整个 listener 如果这是唯一的 action
  // 假设可能还有其他 action，暂时保留框架
  if (message.action === 'someOtherAction') {
    // handle other actions
  }
  return true; 
});

document.addEventListener('DOMContentLoaded', async () => {
  // 应用国际化
  applyLocalization();
  
  // 检查URL参数，如果有tab=llm参数，则自动切换到LLM设置标签页
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tab') === 'llm') {
    // 使用setTimeout确保DOM完全加载后再执行
    setTimeout(switchToLLMTab, 100);
  }
  
  // 导航和标签页切换相关元素
  const navButtons = document.querySelectorAll('.nav-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // 规则管理相关元素
  const rulesTable = document.getElementById('rules-table') as HTMLTableElement;
  const rulesTableBody = document.getElementById('rules-table-body') as HTMLTableSectionElement;
  const loadingState = document.getElementById('loading-state') as HTMLDivElement;
  const emptyState = document.getElementById('empty-state') as HTMLDivElement;
  const confirmModal = document.getElementById('confirm-modal') as HTMLDivElement;
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn') as HTMLButtonElement;
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn') as HTMLButtonElement;
  
  // 匹配模式提示框相关元素
  const matchModeHelp = document.getElementById('match-mode-help') as HTMLSpanElement;
  const matchModeTooltip = document.getElementById('match-mode-tooltip') as HTMLDivElement;
  
  
  // 初始化标签页切换功能
  initTabNavigation();
  
  // 初始化 LLM 设置页面
  initLLMSettings();
  
  // 添加匹配模式提示框鼠标悬停事件
  if (matchModeHelp && matchModeTooltip) {
    matchModeHelp.addEventListener('mouseenter', () => {
      const rect = matchModeHelp.getBoundingClientRect();
      matchModeTooltip.style.display = 'block';
      matchModeTooltip.style.left = `${rect.left - 150 + rect.width / 2}px`; // 居中显示
      matchModeTooltip.style.top = `${rect.bottom + 10}px`; // 在元素下方显示
    });
    
    matchModeHelp.addEventListener('mouseleave', () => {
      matchModeTooltip.style.display = 'none';
    });
  }
  
  // 加载规则数据
  loadRules();
  
  // 删除规则相关事件监听
  cancelDeleteBtn.addEventListener('click', () => {
    hideModal();
  });
  
  confirmDeleteBtn.addEventListener('click', async () => {
    if (ruleIdToDelete) {
      await deleteRule(ruleIdToDelete);
      hideModal();
      loadRules();
    }
  });
  
  /**
   * 初始化标签页导航功能
   */
  function initTabNavigation() {
    navButtons.forEach(button => {
      button.addEventListener('click', () => {
        // 移除所有导航按钮的活动状态
        navButtons.forEach(btn => btn.classList.remove('active'));
        // 为当前点击的按钮添加活动状态
        button.classList.add('active');
        
        // 获取目标标签页ID
        const targetTabId = button.getAttribute('data-tab');
        
        // 隐藏所有标签页内容
        tabContents.forEach(tab => tab.classList.remove('active'));
        
        // 显示目标标签页内容
        if (targetTabId) {
          const targetTab = document.getElementById(targetTabId);
          if (targetTab) {
            targetTab.classList.add('active');
          }
        }
      });
    });
  }
  
  async function loadRules() {
    if (!rulesTable || !rulesTableBody || !loadingState || !emptyState) {
      console.error(getMessage('cannotFindRequiredElements'));
      return;
    }
    rulesTable.style.display = 'none';
    emptyState.style.display = 'none';
    loadingState.style.display = 'block';

    try {
      const rules = await getAllRules();
      
      if (rules.length === 0) {
        rulesTable.style.display = 'none';
        emptyState.style.display = 'flex'; // Use flex for better centering if styles support it
      } else {
        rulesTable.style.display = 'table'; // Or 'block' if table is styled as block
        emptyState.style.display = 'none';
        renderRules(rules, rulesTableBody);
      }
    } catch (error) {
      console.error(getMessage('errorLoadingRules') + ':', error);
      emptyState.style.display = 'flex';
      emptyState.querySelector('p')!.textContent = getMessage('errorLoadingRules');
    } finally {
      loadingState.style.display = 'none';
    }
  }
  
  function renderRules(rules: TabRule[], tableBody: HTMLTableSectionElement) {
    tableBody.innerHTML = ''; // 清空现有的行
    
    rules.forEach((rule, index) => {
      const tr = document.createElement('tr');
      tr.dataset.ruleId = rule.id;

      // 1. 序号
      const tdIndex = document.createElement('td');
      tdIndex.textContent = (index + 1).toString();
      tr.appendChild(tdIndex);

      // 2. 新 Favicon
      const tdFavicon = document.createElement('td');
      // 为了保持简洁，这里直接显示emoji字符。如果需要更复杂的渲染，可以修改。
      tdFavicon.textContent = rule.faviconEmoji;
      tdFavicon.style.textAlign = 'center'; // Center emoji
      tr.appendChild(tdFavicon);

      // 3. 新 Title
      const tdTitle = document.createElement('td');
      tdTitle.textContent = rule.title;
      tr.appendChild(tdTitle);

      // 4. 匹配模式
      const tdMatchMode = document.createElement('td');
      tdMatchMode.textContent = getMatchModeText(rule.matchMode);
      tr.appendChild(tdMatchMode);

      // 5. URL Pattern
      const tdUrlPattern = document.createElement('td');
      tdUrlPattern.textContent = rule.urlPattern;
      tr.appendChild(tdUrlPattern);

      // 6. 删除按钮
      const tdActions = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn'; // 可以复用之前的样式或创建新的
      deleteBtn.textContent = getMessage('deleteButton');
      deleteBtn.addEventListener('click', () => {
        ruleIdToDelete = rule.id;
        showModal();
      });
      tdActions.appendChild(deleteBtn);
      tr.appendChild(tdActions);
      
      tableBody.appendChild(tr);
    });
  }
  
  function getMatchModeText(matchMode: string): string {
    switch (matchMode) {
      case 'exact': return getMessage('exactMatchText');
      case 'startsWith': return getMessage('startsWithMatchText');
      case 'endsWith': return getMessage('endsWithMatchText');
      case 'contains': return getMessage('containsMatchText');
      default: return matchMode;
    }
  }
  
  function showModal() {
    confirmModal.classList.add('show');
  }
  
  function hideModal() {
    confirmModal.classList.remove('show');
    ruleIdToDelete = null;
  }
});
