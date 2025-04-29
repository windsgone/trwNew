import { CreateTabRuleInput } from '../types';
import { saveRule, addRecentEmoji } from '../utils/storage';
import { createEmojiPicker } from '../components/EmojiPicker';

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('rule-form') as HTMLFormElement;
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
  
  // 表情选择器状态
  let emojiPicker: { destroy: () => void } | null = null;
  
  // 匹配模式单选按钮
  const modeExact = document.getElementById('mode-exact') as HTMLInputElement;
  const modeStartsWith = document.getElementById('mode-startsWith') as HTMLInputElement;
  const modeEndsWith = document.getElementById('mode-endsWith') as HTMLInputElement;
  const modeContains = document.getElementById('mode-contains') as HTMLInputElement;
  const matchModeRadios = [modeExact, modeStartsWith, modeEndsWith, modeContains];
  
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
  
  // 收起状态下，点击URL显示区域会展开
  urlDisplay.addEventListener('click', () => {
    if (urlInputGroup.classList.contains('collapsed')) {
      urlInputGroup.classList.remove('collapsed');
      urlInputGroup.classList.add('expanded');
    }
  });
  
  // 收起状态下，点击匹配模式显示区域会展开
  matchModeDisplay.addEventListener('click', () => {
    if (urlInputGroup.classList.contains('collapsed')) {
      urlInputGroup.classList.remove('collapsed');
      urlInputGroup.classList.add('expanded');
    }
  });
  
  // 处理匹配模式单选按钮的变化
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

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.url) {
    urlPatternInput.value = tab.url;
    const urlDisplaySpan = urlDisplay.querySelector('span');
    if (urlDisplaySpan) {
      urlDisplaySpan.textContent = tab.url;
    }

    if (tab.title) {
      titleInput.value = tab.title;
    }

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

  // 关闭表情选择器
  function closeEmojiPicker() {
    if (emojiPicker) {
      emojiPicker.destroy();
      emojiPicker = null;
      
      // 显示提交按钮
      saveBtn.style.display = 'block';
      
      // 移除容器元素
      const containers = document.querySelectorAll('.emoji-picker-container');
      containers.forEach(container => {
        document.body.removeChild(container);
      });
    }
  }
  
  // 点击favicon预览显示表情选择器
  faviconPreview.addEventListener('click', function handleFaviconClick() {
    // 如果选择器已显示，直接返回
    if (emojiPicker) return;
    
    // 隐藏提交按钮
    saveBtn.style.display = 'none';
    
    // 创建表情选择器容器
    const pickerContainer = document.createElement('div');
    pickerContainer.className = 'emoji-picker-container';
    document.body.appendChild(pickerContainer);
    
    // 创建表情选择器
    emojiPicker = createEmojiPicker({
      container: pickerContainer,
      onSelect: async (emoji) => {
        // 更新favicon预览
        updateFaviconPreview(emoji);
        
        // 添加到最近使用
        await addRecentEmoji(emoji);
        
        // 关闭选择器
        closeEmojiPicker();
      },
      onClose: () => {
        closeEmojiPicker();
      }
    });
  });
  
  // 更新favicon预览
  function updateFaviconPreview(emoji: string) {
    // 将表情转换为Data URL
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 16, 16);
    
    // 更新预览图像
    faviconImg.src = canvas.toDataURL();
    
    // 保存表情到表单数据
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
      if (!urlPatternInput.value || !titleInput.value) {
        showStatus('请填写必填字段', 'error');
        return;
      }

      if (urlPatternInput.value.startsWith('chrome://') || urlPatternInput.value.startsWith('edge://')) {
        showStatus('不能为浏览器内部页面创建规则', 'error');
        return;
      }

      const selectedMode = matchModeRadios.find(radio => radio.checked);
      if (!selectedMode) {
        showStatus('请选择匹配模式', 'error');
        return;
      }

      const ruleInput: CreateTabRuleInput = {
        title: titleInput.value,
        faviconEmoji: (form.querySelector('input[name="faviconEmoji"]') as HTMLInputElement)?.value || '', 
        matchMode: selectedMode.value as any,
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
