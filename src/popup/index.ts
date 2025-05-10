import { CreateTabRuleInput, TabRule } from '../types';
import { createNewRule, addRecentEmoji, getAllRules, updateRule } from '../utils/storage';
import { createEmojiPicker } from '../components/EmojiPicker';
import { emojiToFaviconDataUrl } from '../utils/emoji';
import { findBestMatchRule } from '../utils/rules';
import { applyLocalization, getMessage } from '../utils/i18nUtils';

document.addEventListener('DOMContentLoaded', async () => {
  
  applyLocalization();
  const form = document.getElementById('rule-form') as HTMLFormElement;
  const unsupportedPageNotice = document.getElementById('unsupported-page-notice') as HTMLDivElement;
  const titleInput = document.getElementById('title') as HTMLInputElement;
  const urlPatternInput = document.getElementById('urlPattern') as HTMLInputElement;
  const urlDisplay = document.getElementById('url-display') as HTMLDivElement;
  const matchModeDisplay = document.getElementById('match-mode-display') as HTMLDivElement;
  const clearTitleBtn = document.getElementById('clear-title') as HTMLButtonElement;
  const faviconImg = document.getElementById('favicon-img') as HTMLImageElement;
  const faviconPreview = document.getElementById('favicon-preview') as HTMLElement;
  const optionsBtn = document.getElementById('options-btn') as HTMLElement;
  const statusMessage = document.getElementById('status-message') as HTMLDivElement;
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
  const container = document.querySelector('.container') as HTMLDivElement;
  
  // 确保设置按钮在任何页面都能正常工作
  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  
  let emojiPicker: { destroy: () => void } | null = null;

  
  const modeExact = document.getElementById('mode-exact') as HTMLInputElement;
  const modeStartsWith = document.getElementById('mode-startsWith') as HTMLInputElement;
  const modeEndsWith = document.getElementById('mode-endsWith') as HTMLInputElement;
  const modeContains = document.getElementById('mode-contains') as HTMLInputElement;
  const matchModeRadios = [modeExact, modeStartsWith, modeEndsWith, modeContains];

  
  const urlInputGroup = document.getElementById('url-input-group') as HTMLDivElement;
  const toggleUrlBtn = document.getElementById('toggle-url-btn') as HTMLDivElement;

  
  urlInputGroup.classList.add('collapsed');

  
  toggleUrlBtn.addEventListener('click', () => {
    if (urlInputGroup.classList.contains('expanded')) {
      
      urlInputGroup.classList.remove('expanded');
      urlInputGroup.classList.add('collapsed');
    } else {
      
      urlInputGroup.classList.remove('collapsed');
      urlInputGroup.classList.add('expanded');
    }
  });

  
  urlDisplay.addEventListener('click', () => {
    if (urlInputGroup.classList.contains('collapsed')) {
      urlInputGroup.classList.remove('collapsed');
      urlInputGroup.classList.add('expanded');
    }
  });

  
  matchModeDisplay.addEventListener('click', () => {
    if (urlInputGroup.classList.contains('collapsed')) {
      urlInputGroup.classList.remove('collapsed');
      urlInputGroup.classList.add('expanded');
    }
  });

  
  matchModeRadios.forEach(radio => {
    const parentLabel = radio.closest('.match-mode-btn') as HTMLLabelElement;

    if (radio.checked) {
      parentLabel.classList.add('active');
    }

    radio.addEventListener('change', () => {
      if (radio.checked) {
        const modeText = radio.nextElementSibling?.textContent || '';
        matchModeDisplay.textContent = modeText;

        matchModeRadios.forEach(r => {
          const label = r.closest('.match-mode-btn') as HTMLLabelElement;
          if (r === radio) {
            label.classList.add('active');
          } else {
            label.classList.remove('active');
          }
        });
      }
    });
  });

  urlPatternInput.addEventListener('input', () => {
    const urlDisplaySpan = urlDisplay.querySelector('span');
    if (urlDisplaySpan) {
      urlDisplaySpan.textContent = urlPatternInput.value;
    }
  });

  let matchedRule: TabRule | null = null; 
  let currentTabUrl = '';
  let currentTabTitle = '';
  let currentTabFavicon = '';

  try {
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // 检查是否为浏览器特殊页面，这些页面不允许修改标题和图标
    if (!tab || !tab.url || 
        tab.url.startsWith('chrome://') || 
        tab.url.startsWith('edge://') || 
        tab.url.startsWith('about:') || 
        tab.url.startsWith('chrome-extension://') || 
        tab.url.startsWith('edge-extension://') || 
        tab.url.startsWith('extension://') || 
        tab.url.startsWith('moz-extension://') || 
        tab.url.startsWith('view-source:') || 
        tab.url.startsWith('devtools://') || 
        tab.url.startsWith('file://') || 
        tab.url.startsWith('brave://') || 
        tab.url.startsWith('opera://') || 
        tab.url.startsWith('vivaldi://') || 
        tab.url.startsWith('safari://')) {
      // 显示友好提示信息
      unsupportedPageNotice.style.display = 'flex';
      form.style.display = 'none';
      return;
    }
    currentTabUrl = tab.url;
    currentTabTitle = tab.title || '';
    currentTabFavicon = tab.favIconUrl || '';

    
    const allRules = await getAllRules();

    
    matchedRule = findBestMatchRule(currentTabUrl, allRules);

    
    if (matchedRule) {
      
      urlPatternInput.value = matchedRule.urlPattern;
      titleInput.value = matchedRule.title;

      
      const modeRadio = matchModeRadios.find(r => r.value === matchedRule!.matchMode);
      if (modeRadio) {
        modeRadio.checked = true;
        
        modeRadio.dispatchEvent(new Event('change')); 
      } else {
        
        modeExact.checked = true;
        modeExact.dispatchEvent(new Event('change'));
      }

      
      const urlDisplaySpan = urlDisplay.querySelector('span');
      if (urlDisplaySpan) {
        urlDisplaySpan.textContent = matchedRule.urlPattern;
      }
      const modeText = modeRadio?.nextElementSibling?.textContent || 'is'; 
      matchModeDisplay.textContent = modeText;

      
      if (matchedRule.faviconEmoji) {
        updateFaviconPreview(matchedRule.faviconEmoji);
      } else {
        
        faviconImg.src = currentTabFavicon || 'icons/icon48.png'; 
      }

      
      form.dataset.matchedRuleId = matchedRule!.id; 

    } else {
      
      
      urlPatternInput.value = currentTabUrl;
      titleInput.value = currentTabTitle;
      modeExact.checked = true; 
      modeExact.dispatchEvent(new Event('change')); 

      const urlDisplaySpan = urlDisplay.querySelector('span');
      if (urlDisplaySpan) {
        urlDisplaySpan.textContent = currentTabUrl;
      }
      matchModeDisplay.textContent = 'is'; 

      
      faviconImg.src = currentTabFavicon || 'icons/icon48.png'; 

      
      delete form.dataset.matchedRuleId; 
    }

  } catch (error) {
    console.error(getMessage('errorInitPopupFailed'), error);
    showStatus(getMessage('errorLoadingFailed'), 'error');
    
  }

  clearTitleBtn.addEventListener('click', () => {
    titleInput.value = '';
    titleInput.focus();
  });

  
  function closeEmojiPicker() {
    if (emojiPicker) {
      emojiPicker.destroy();
      emojiPicker = null;
      faviconPreview.classList.remove('active'); 
      saveBtn.style.display = 'block'; 
      
      const containers = document.querySelectorAll('.emoji-picker-container');
      containers.forEach(container => {
        container.remove();
      });

      
      document.body.style.height = '';
      document.body.style.minHeight = '';
    }
  }

  
  faviconPreview.addEventListener('click', function handleFaviconClick() {
    
    if (emojiPicker) {
      closeEmojiPicker();
      return;
    }

    
    if (urlInputGroup.classList.contains('expanded')) {
        urlInputGroup.classList.remove('expanded');
        urlInputGroup.classList.add('collapsed');
    }

    
    faviconPreview.classList.add('active');

    
    saveBtn.style.display = 'none';

    
    const pickerContainer = document.createElement('div');
    pickerContainer.className = 'emoji-picker-container';

    
    container.appendChild(pickerContainer);

    
    const faviconRect = faviconPreview.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    const topPosition = faviconRect.bottom - containerRect.top + scrollTop + 16; 
    pickerContainer.style.top = `${topPosition}px`;

    
    emojiPicker = createEmojiPicker({
      container: pickerContainer,
      onSelect: async (emoji) => {
        updateFaviconPreview(emoji);
        await addRecentEmoji(emoji);
        closeEmojiPicker();
      },
      onClose: () => {
        closeEmojiPicker();
      }
    });

    
    setTimeout(() => {
        const pickerRect = pickerContainer.getBoundingClientRect();
        const requiredBodyHeight = pickerRect.bottom + window.scrollY + 10; 
        const currentBodyHeight = document.body.offsetHeight;

        if (requiredBodyHeight > currentBodyHeight) {
            document.body.style.height = `${requiredBodyHeight}px`;
            document.body.style.minHeight = `${requiredBodyHeight}px`;
        }
    }, 0); 
  });

  
  function updateFaviconPreview(emoji: string) {
    
    const dataUrl = emojiToFaviconDataUrl(emoji, 32); 

    
    faviconImg.src = dataUrl;

    
    const ruleInput = form.querySelector('input[name="faviconEmoji"]') as HTMLInputElement;
    if (!ruleInput) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'faviconEmoji';
      input.value = emoji;
      form.appendChild(input);
    } else {
      ruleInput.value = emoji;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      if (!urlPatternInput.value.trim()) {
        showStatus(getMessage('errorUrlPatternRequired'), 'error');
        return;
      }
      if (!titleInput.value.trim()) {
        showStatus(getMessage('errorTitleRequired'), 'error');
        return;
      }

      if (urlPatternInput.value.startsWith('chrome://') || urlPatternInput.value.startsWith('edge://')) {
        showStatus(getMessage('errorBrowserInternalPage'), 'error');
        return;
      }

      const selectedMode = matchModeRadios.find(radio => radio.checked);
      if (!selectedMode) {
        showStatus(getMessage('errorMatchModeRequired'), 'error');
        return;
      }

      const ruleInput: CreateTabRuleInput = {
        title: titleInput.value,
        faviconEmoji: (form.querySelector('input[name="faviconEmoji"]') as HTMLInputElement)?.value || '', 
        matchMode: selectedMode.value as any,
        urlPattern: urlPatternInput.value
      };

      
      

      const formUrlPattern = ruleInput.urlPattern;
      const formMatchMode = ruleInput.matchMode;
      const allRules = await getAllRules();
      const existingRule = allRules.find(r => r.urlPattern === formUrlPattern && r.matchMode === formMatchMode);

      let savedOrUpdatedRule: TabRule | null = null;

      if (existingRule) {
        
        const updatedData: TabRule = {
          ...existingRule, 
          title: ruleInput.title,
          faviconEmoji: ruleInput.faviconEmoji,
          
          updatedAt: Date.now()
        };
        savedOrUpdatedRule = await updateRule(updatedData);
        showStatus(getMessage('successRuleUpdated'), 'success');
      } else {
        
        savedOrUpdatedRule = await createNewRule(ruleInput);
        showStatus(getMessage('successRuleSaved'), 'success');
      }

      
      if (savedOrUpdatedRule && savedOrUpdatedRule.faviconEmoji) {
        await addRecentEmoji(savedOrUpdatedRule.faviconEmoji);
      }

      
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true }); 
      if (activeTab?.id) {
        chrome.tabs.reload(activeTab.id);
      }

      setTimeout(() => {
        window.close();
      }, 1500);

    } catch (error) {
      console.error(getMessage('errorSaveRuleFailed'), error);
      showStatus(getMessage('errorSavingRule'), 'error');
    }
  });

  // 设置按钮的事件监听器已移至页面加载初始化阶段

  function showStatus(message: string, type: 'success' | 'error') {
    statusMessage.textContent = message;
    statusMessage.className = type;

    setTimeout(() => {
      statusMessage.textContent = '';
      statusMessage.className = '';
    }, 3000);
  }
});
