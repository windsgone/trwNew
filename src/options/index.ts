import { TabRule } from '../types';
import { getAllRules, deleteRule } from '../utils/storage';

let ruleIdToDelete: string | null = null;

document.addEventListener('DOMContentLoaded', async () => {
  const rulesContainer = document.getElementById('rules-container') as HTMLDivElement;
  const emptyState = document.getElementById('empty-state') as HTMLDivElement;
  const addRuleBtn = document.getElementById('add-rule-btn') as HTMLButtonElement;
  const confirmModal = document.getElementById('confirm-modal') as HTMLDivElement;
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn') as HTMLButtonElement;
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn') as HTMLButtonElement;
  
  loadRules();
  
  addRuleBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/index.html') });
  });
  
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
    try {
      const rules = await getAllRules();
      
      if (rules.length === 0) {
        rulesContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
      }
      
      rulesContainer.style.display = 'block';
      emptyState.style.display = 'none';
      
      renderRules(rules);
    } catch (error) {
      console.error('加载规则失败:', error);
      rulesContainer.innerHTML = '<div class="loading">加载失败</div>';
    }
  }
  
  function renderRules(rules: TabRule[]) {
    rulesContainer.innerHTML = '';
    
    rules.forEach(rule => {
      const ruleCard = document.createElement('div');
      ruleCard.className = 'rule-card';
      
      const faviconPreview = document.createElement('div');
      faviconPreview.className = 'favicon-preview';
      faviconPreview.textContent = rule.faviconEmoji;
      
      const ruleDetails = document.createElement('div');
      ruleDetails.className = 'rule-details';
      
      const ruleTitle = document.createElement('div');
      ruleTitle.className = 'rule-title';
      ruleTitle.textContent = rule.title;
      
      const ruleUrl = document.createElement('div');
      ruleUrl.className = 'rule-url';
      ruleUrl.textContent = `${getMatchModeText(rule.matchMode)}: ${rule.urlPattern}`;
      
      const ruleMeta = document.createElement('div');
      ruleMeta.className = 'rule-meta';
      ruleMeta.textContent = `创建于: ${new Date(rule.updatedAt).toLocaleString()}`;
      
      ruleDetails.appendChild(ruleTitle);
      ruleDetails.appendChild(ruleUrl);
      ruleDetails.appendChild(ruleMeta);
      
      const ruleActions = document.createElement('div');
      ruleActions.className = 'rule-actions';
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '删除';
      deleteBtn.addEventListener('click', () => {
        ruleIdToDelete = rule.id;
        showModal();
      });
      
      ruleActions.appendChild(deleteBtn);
      
      ruleCard.appendChild(faviconPreview);
      ruleCard.appendChild(ruleDetails);
      ruleCard.appendChild(ruleActions);
      
      rulesContainer.appendChild(ruleCard);
    });
  }
  
  function getMatchModeText(matchMode: string): string {
    switch (matchMode) {
      case 'exact': return '精确匹配';
      case 'startsWith': return '开头匹配';
      case 'endsWith': return '结尾匹配';
      case 'contains': return '包含匹配';
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
