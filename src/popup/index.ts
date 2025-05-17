import { CreateTabRuleInput, TabRule } from '../types';
import { createNewRule, addRecentEmoji, getAllRules, updateRule } from '../utils/storage';
import { createEmojiPicker } from '../components/EmojiPicker';
import { emojiToFaviconDataUrl } from '../utils/emoji';
import { findBestMatchRule } from '../utils/rules';
import { applyLocalization, getMessage } from '../utils/i18nUtils';
import { llmManager } from '../utils/llm/llm-manager';
import { PageInfo } from '../utils/llm/types';

document.addEventListener('DOMContentLoaded', async () => {
  
  applyLocalization();
  const form = document.getElementById('rule-form') as HTMLFormElement;
  const unsupportedPageNotice = document.getElementById('unsupported-page-notice') as HTMLDivElement;
  const titleInput = document.getElementById('title') as HTMLTextAreaElement;
  const urlPatternInput = document.getElementById('urlPattern') as HTMLInputElement;
  const urlDisplay = document.getElementById('url-display') as HTMLDivElement;
  const matchModeDisplay = document.getElementById('match-mode-display') as HTMLDivElement;
  const clearTitleBtn = document.getElementById('clear-title') as HTMLButtonElement;
  const faviconImg = document.getElementById('favicon-img') as HTMLImageElement;
  const faviconPreview = document.getElementById('favicon-preview') as HTMLElement;
  const optionsBtn = document.getElementById('options-btn') as HTMLElement;
  const statusMessage = document.getElementById('status-message') as HTMLDivElement;
  const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
  const aiGenerateBtn = document.getElementById('ai-generate-btn') as HTMLButtonElement;
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

    // 在初始内容（如图标、标题等）加载并填充到表单后，
    // 确保 titleInput 的高度被重置为单行。
    resetTextareaHeight(titleInput);

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
      if (activeTab?.id && savedOrUpdatedRule) {
        // 使用 APPLY_RULE_NOW 消息类型直接应用规则，而不是刷新整个页面
        chrome.runtime.sendMessage({
          type: 'APPLY_RULE_NOW',
          payload: {
            tabId: activeTab.id,
            rule: savedOrUpdatedRule
          }
        });
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

  // 自动调整textarea高度的函数
  function autoResizeTextarea(textarea: HTMLTextAreaElement) {
    // 重置高度，以便在内容减少时也能正确计算
    textarea.style.height = 'auto';
    // 设置高度为scrollHeight
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  // 重置为单行高度的函数
  function resetTextareaHeight(textarea: HTMLTextAreaElement) {
    // 恢复到默认高度
    textarea.style.height = '';
  }

  // 为标题输入框添加动态高度调整的事件监听器
  titleInput.addEventListener('focus', () => autoResizeTextarea(titleInput));
  titleInput.addEventListener('input', () => autoResizeTextarea(titleInput));
  titleInput.addEventListener('blur', () => resetTextareaHeight(titleInput));

  // 初始化LLM管理器
  try {
    await llmManager.initialize();
    console.log(getMessage('successLlmManagerInitialized'));
  } catch (error) {
    console.error(getMessage('errorLlmManagerInitFailed'), error);
  }

  // AI生成按钮点击事件
  aiGenerateBtn.addEventListener('click', async () => {
    try {
      // 检查URL是否有效
      if (!urlPatternInput.value.trim()) {
        showStatus(getMessage('errorUrlPatternRequired'), 'error');
        return;
      }

      // 设置生成中状态
      aiGenerateBtn.classList.add('generating');
      aiGenerateBtn.disabled = true;
      
      // 添加多彩渐变流动效果到标题输入框
      const titleInputContainer = document.querySelector('.title-input') as HTMLElement;
      titleInputContainer.classList.add('ai-generating');
      
      showStatus(getMessage('generatingTitle'), 'success');

      // 检查LLM管理器是否初始化
      const settings = llmManager.getSettings();
      if (!settings) {
        console.log(getMessage('reinitializingLlmManager'));
        await llmManager.initialize();
      }

      // 检查是否有API密钥
      const currentSettings = llmManager.getSettings();
      if (!currentSettings) {
        throw new Error(getMessage('errorLlmSettingsNotInitialized'));
      }
      
      const activeProvider = currentSettings.activeProvider;
      const providerSettings = currentSettings.providers[activeProvider];
      
      if (!providerSettings || !providerSettings.apiKey) {
        // 显示更明确的错误消息
        showStatus(getMessage('errorApiKeyRequired'), 'error');
        
        // 延迟发送消息，给用户时间看到错误消息，并让后台脚本处理打开/切换到LLM标签页
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: 'openOptionsPageAndShowLlm' });
        }, 2000);
        
        return; // 提前返回，不再继续执行
      }

      // 获取当前活动标签页的完整页面信息
      let pageInfo: PageInfo;
      try {
        // 尝试从当前标签页获取完整页面信息
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
          // 向内容脚本请求页面信息
          const response = await new Promise<{pageInfo?: any}>((resolve) => {
            chrome.tabs.sendMessage(activeTab.id!, { type: 'GET_PAGE_INFO' }, (result) => {
              resolve(result || {});
            });
          });
          
          if (response?.pageInfo) {
            // 使用从内容脚本获取的完整页面信息
            pageInfo = {
              url: urlPatternInput.value, // 使用用户输入的URL模式
              title: titleInput.value || response.pageInfo.title || '',
              description: response.pageInfo.description || ''
            };
          } else {
            throw new Error(getMessage('errorCannotGetPageInfo'));
          }
        } else {
          throw new Error(getMessage('errorCannotGetCurrentTab'));
        }
      } catch (error) {
        // 如果无法获取完整页面信息，则使用默认值
        pageInfo = {
          url: urlPatternInput.value,
          title: titleInput.value || document.title || '',
          description: ''
        };
      }

      // 调用LLM生成标题
      const response = await llmManager.generateText(pageInfo, {
        maxTokens: 50,
        temperature: 0.7,
        timeoutMs: 15000
      });

      // 填充生成的标题到标题输入框
      if (response && response.content) {
        titleInput.value = response.content.trim();
        showStatus(getMessage('successTitleGenerated'), 'success');
      } else {
        showStatus(getMessage('errorGeneratingTitle'), 'error');
      }
    } catch (error) {
      showStatus(getMessage('errorGeneratingTitleWithReason', [(error instanceof Error ? error.message : getMessage('unknownError'))]), 'error');
    } finally {
      // 恢复按钮状态
      aiGenerateBtn.classList.remove('generating');
      aiGenerateBtn.disabled = false;
      
      // 移除标题输入框的多彩渐变流动效果
      const titleInputContainer = document.querySelector('.title-input') as HTMLElement;
      titleInputContainer.classList.remove('ai-generating');
    }
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
