import { CreateTabRuleInput, TabRule } from '../types';
import { createNewRule, addRecentEmoji, getAllRules, updateRule } from '../utils/storage';
import { createEmojiPicker } from '../components/EmojiPicker';
import { emojiToFaviconDataUrl } from '../utils/emoji';
import { findBestMatchRule } from '../utils/rules';

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
  const container = document.querySelector('.container') as HTMLDivElement;

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

  let matchedRule: TabRule | null = null; // 用于存储匹配到的规则
  let currentTabUrl = '';
  let currentTabTitle = '';
  let currentTabFavicon = '';

  try {
    // 1. 获取当前激活的 Tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      // 对于无效 tab 或浏览器内部页面，显示提示并禁用表单
      showStatus('无法为当前页面创建规则', 'error');
      form.style.display = 'none'; // 或禁用所有输入
      return;
    }
    currentTabUrl = tab.url;
    currentTabTitle = tab.title || '';
    currentTabFavicon = tab.favIconUrl || '';

    // 2. 获取所有规则
    const allRules = await getAllRules();

    // 3. 查找最佳匹配规则 (修正参数顺序)
    matchedRule = findBestMatchRule(currentTabUrl, allRules);

    // 4. 根据匹配结果填充表单
    if (matchedRule) {
      // --- 情况 A: 找到匹配规则 ---
      urlPatternInput.value = matchedRule.urlPattern;
      titleInput.value = matchedRule.title;

      // 设置匹配模式显示和单选按钮
      const modeRadio = matchModeRadios.find(r => r.value === matchedRule!.matchMode);
      if (modeRadio) {
        modeRadio.checked = true;
        // 触发 change 事件来更新显示和 active 类 (如果事件监听器已设置)
        modeRadio.dispatchEvent(new Event('change')); 
      } else {
        // 如果规则中的模式无效，默认选中第一个
        modeExact.checked = true;
        modeExact.dispatchEvent(new Event('change'));
      }

      // 更新 URL 显示区域
      const urlDisplaySpan = urlDisplay.querySelector('span');
      if (urlDisplaySpan) {
        urlDisplaySpan.textContent = matchedRule.urlPattern;
      }
      const modeText = modeRadio?.nextElementSibling?.textContent || 'is'; // 获取对应文本
      matchModeDisplay.textContent = modeText;

      // 设置 Favicon
      if (matchedRule.faviconEmoji) {
        updateFaviconPreview(matchedRule.faviconEmoji);
      } else {
        // 如果规则没有 emoji，尝试使用原始 favicon
        faviconImg.src = currentTabFavicon || 'icons/icon48.png'; // 使用当前 Tab 的或默认图标
      }

      // 存储匹配规则的 ID，以便后续更新时使用（如果URL/模式未改变）
      form.dataset.matchedRuleId = matchedRule!.id; 

    } else {
      // --- 情况 B: 未找到匹配规则 ---
      // 使用当前 Tab 的信息填充
      urlPatternInput.value = currentTabUrl;
      titleInput.value = currentTabTitle;
      modeExact.checked = true; // 默认选中 exact
      modeExact.dispatchEvent(new Event('change')); // 触发 change 更新 UI

      const urlDisplaySpan = urlDisplay.querySelector('span');
      if (urlDisplaySpan) {
        urlDisplaySpan.textContent = currentTabUrl;
      }
      matchModeDisplay.textContent = 'is'; // 默认显示 'is'

      // 设置 Favicon (使用当前页面的)
      faviconImg.src = currentTabFavicon || 'icons/icon48.png'; // 使用当前 Tab 的或默认图标

      // 清除可能存在的旧 ID
      delete form.dataset.matchedRuleId; 
    }

  } catch (error) {
    console.error('初始化 Popup 失败:', error);
    showStatus('加载失败，请重试', 'error');
    // 可以考虑禁用表单等
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
      faviconPreview.classList.remove('active'); // 移除高亮
      saveBtn.style.display = 'block'; // 恢复显示保存按钮
      // 移除容器元素
      const containers = document.querySelectorAll('.emoji-picker-container');
      containers.forEach(container => {
        container.remove();
      });

      // 恢复 body 高度
      document.body.style.height = '';
      document.body.style.minHeight = '';
    }
  }

  // 点击favicon预览显示表情选择器
  faviconPreview.addEventListener('click', function handleFaviconClick() {
    // 如果选择器已显示，则关闭它
    if (emojiPicker) {
      closeEmojiPicker();
      return;
    }

    // 如果 URL 输入组是展开状态，则收起它
    if (urlInputGroup.classList.contains('expanded')) {
        urlInputGroup.classList.remove('expanded');
        urlInputGroup.classList.add('collapsed');
    }

    // 激活 favicon 预览状态
    faviconPreview.classList.add('active');

    // 隐藏提交按钮
    saveBtn.style.display = 'none';

    // 创建表情选择器容器
    const pickerContainer = document.createElement('div');
    pickerContainer.className = 'emoji-picker-container';

    // 将表情选择器容器添加到 .container 中
    container.appendChild(pickerContainer);

    // 计算 top 位置
    const faviconRect = faviconPreview.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    // 定位在 favicon 下方，并考虑 container 的边框和 padding
    const topPosition = faviconRect.bottom - containerRect.top + scrollTop + 16; // 5px 间距
    pickerContainer.style.top = `${topPosition}px`;

    // 创建表情选择器
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

    // 调整 body 高度以确保 picker 可见
    setTimeout(() => {
        const pickerRect = pickerContainer.getBoundingClientRect();
        const requiredBodyHeight = pickerRect.bottom + window.scrollY + 10; // 10px 底部间距
        const currentBodyHeight = document.body.offsetHeight;

        if (requiredBodyHeight > currentBodyHeight) {
            document.body.style.height = `${requiredBodyHeight}px`;
            document.body.style.minHeight = `${requiredBodyHeight}px`;
        }
    }, 0); // 使用 setTimeout 确保 picker 已渲染并获取正确尺寸
  });

  // 更新favicon预览
  function updateFaviconPreview(emoji: string) {
    // 使用导入的函数生成 Data URL，指定预览尺寸为 32
    const dataUrl = emojiToFaviconDataUrl(emoji, 32); 

    // 更新预览图像
    faviconImg.src = dataUrl;

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

      // --- 保存逻辑修改点 (下一步实现) ---
      // ... 这里将添加查找现有规则并决定更新或创建的逻辑 ...

      const formUrlPattern = ruleInput.urlPattern;
      const formMatchMode = ruleInput.matchMode;
      const allRules = await getAllRules();
      const existingRule = allRules.find(r => r.urlPattern === formUrlPattern && r.matchMode === formMatchMode);

      let savedOrUpdatedRule: TabRule | null = null;

      if (existingRule) {
        // 更新现有规则
        const updatedData: TabRule = {
          ...existingRule, // 保留 id, originalTitle, originalFavicon
          title: ruleInput.title,
          faviconEmoji: ruleInput.faviconEmoji,
          // urlPattern 和 matchMode 保持不变，因为它们是查找条件
          updatedAt: Date.now()
        };
        savedOrUpdatedRule = await updateRule(updatedData);
        showStatus('规则更新成功！', 'success');
      } else {
        // 创建新规则 (复用之前的 ruleInput)
        savedOrUpdatedRule = await createNewRule(ruleInput);
        showStatus('规则保存成功！', 'success');
      }

      // 如果成功保存/更新了规则，并且选择了表情，添加到最近使用
      if (savedOrUpdatedRule && savedOrUpdatedRule.faviconEmoji) {
        await addRecentEmoji(savedOrUpdatedRule.faviconEmoji);
      }

      // 刷新当前页面以应用规则
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true }); // 重新获取 tab
      if (activeTab?.id) {
        chrome.tabs.reload(activeTab.id);
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
