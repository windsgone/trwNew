import { CreateTabRuleInput } from '../types';
import { saveRule } from '../utils/storage';

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('rule-form') as HTMLFormElement;
  const titleInput = document.getElementById('title') as HTMLInputElement;
  const matchModeSelect = document.getElementById('matchMode') as HTMLSelectElement;
  const urlPatternInput = document.getElementById('urlPattern') as HTMLInputElement;
  const clearTitleBtn = document.getElementById('clear-title') as HTMLButtonElement;
  const faviconImg = document.getElementById('favicon-img') as HTMLImageElement;
  const optionsBtn = document.getElementById('options-btn') as HTMLElement;
  const statusMessage = document.getElementById('status-message') as HTMLDivElement;
  
  // URL输入组的收起和展开功能
  const urlInputGroup = document.getElementById('url-input-group') as HTMLDivElement;
  const toggleUrlBtn = document.getElementById('toggle-url-btn') as HTMLDivElement;
  
  // 默认为收起状态
  urlInputGroup.classList.add('collapsed');
  
  // 切换URL输入组的收起和展开状态
  toggleUrlBtn.addEventListener('click', () => {
    if (urlInputGroup.classList.contains('expanded')) {
      // 收起
      urlInputGroup.classList.remove('expanded');
      urlInputGroup.classList.add('collapsed');
    } else {
      // 展开
      urlInputGroup.classList.remove('collapsed');
      urlInputGroup.classList.add('expanded');
    }
  });
  
  // 收起状态下，点击URL输入框会展开
  urlPatternInput.addEventListener('click', () => {
    if (urlInputGroup.classList.contains('collapsed')) {
      urlInputGroup.classList.remove('collapsed');
      urlInputGroup.classList.add('expanded');
    }
  });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.url) {
    urlPatternInput.value = tab.url;

    try {
      if (tab.favIconUrl) {
        faviconImg.src = tab.favIconUrl;
      }
    } catch (error) {
      console.error('获取网站图标失败:', error);
    }
  }

  clearTitleBtn.addEventListener('click', () => {
    titleInput.value = '';
    titleInput.focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      if (!urlPatternInput.value || !titleInput.value) {
        showStatus('请填写必填字段', 'error');
        return;
      }

      if (urlPatternInput.value.startsWith('chrome://') || urlPatternInput.value.startsWith('edge://')) {
        showStatus('不能为浏览器内部页面创建规则', 'error');
        return;
      }

      const ruleInput: CreateTabRuleInput = {
        title: titleInput.value,
        faviconEmoji: '', // 不再使用emoji作为图标
        matchMode: matchModeSelect.value as any,
        urlPattern: urlPatternInput.value
      };

      await saveRule(ruleInput);

      showStatus('规则保存成功！', 'success');

      if (tab.id) {
        chrome.tabs.reload(tab.id);
      }

      setTimeout(() => {
        window.close();
      }, 1500);

    } catch (error) {
      console.error('保存规则失败:', error);
      showStatus('保存规则失败', 'error');
    }
  });

  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  function showStatus(message: string, type: 'success' | 'error') {
    statusMessage.textContent = message;
    statusMessage.className = type;

    setTimeout(() => {
      statusMessage.textContent = '';
      statusMessage.className = '';
    }, 3000);
  }
});
