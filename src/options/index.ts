import { TabRule } from '../types';
import { getAllRules, deleteRule } from '../utils/storage';
import { applyLocalization, getMessage } from '../utils/i18nUtils';

let ruleIdToDelete: string | null = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 应用国际化
  applyLocalization();
  
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
  
  // 添加鼠标悬停事件
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
  
  loadRules();
  
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
  
  async function loadRules() {
    if (!rulesTable || !rulesTableBody || !loadingState || !emptyState) {
      console.error('无法找到必要的DOM元素');
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
      console.error('加载规则失败:', error);
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
