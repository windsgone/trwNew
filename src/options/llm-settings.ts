/**
 * LLM 设置页面功能实现
 */

import { 
  LLMSettings, 
  ProviderSettings,
  LLMProviderType,
  LLMModel,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_USER_PROMPT
} from '../utils/llm/types';
import { 
  getLLMSettings, 
  updateProviderSettings, 
  setActiveProvider, 
  resetProviderPrompts 
} from '../utils/storage';
import { OpenAIService } from '../utils/llm/providers/openai-provider';
import { getMessage } from '../utils/i18nUtils';

// DOM 元素
const providerRadioGroup = document.getElementById('provider-radio-group') as HTMLDivElement;
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
const systemPromptTextarea = document.getElementById('system-prompt') as HTMLTextAreaElement;
const userPromptTextarea = document.getElementById('user-prompt') as HTMLTextAreaElement;
const testApiKeyBtn = document.getElementById('test-api-key') as HTMLButtonElement;
const clearApiKeyBtn = document.getElementById('clear-api-key') as HTMLButtonElement;
const resetPromptsBtn = document.getElementById('reset-prompts') as HTMLButtonElement;

// 状态变量
let currentSettings: LLMSettings | null = null;
let isApiKeyTesting = false;
let saveTimeouts: Record<string, number> = {};

/**
 * 初始化 LLM 设置页面
 */
export async function initLLMSettings(): Promise<void> {
  // 填充提供商列表
  await populateProviderOptions();
  
  // 加载当前设置
  await loadSettings();
  
  // 添加事件监听器
  setupEventListeners();
}

/**
 * 加载当前 LLM 设置
 */
async function loadSettings(): Promise<void> {
  try {
    currentSettings = await getLLMSettings();
    
    // 设置提供商选择框的值
    const activeProviderRadio = document.getElementById(`provider-${currentSettings.activeProvider}`) as HTMLInputElement;
    if (activeProviderRadio) {
      activeProviderRadio.checked = true;
    }
    
    // 显示当前活跃提供商的设置
    const activeProvider = currentSettings.activeProvider;
    const providerSettings = currentSettings.providers[activeProvider] as ProviderSettings;
    
    if (providerSettings) {
      // 设置 API Key (显示为掌码)
      apiKeyInput.value = providerSettings.apiKey ? '••••••••••••••••••••' : '';
      
      // 动态生成模型选项
      const firstModelId = await populateModelOptions();
      
      // 设置选中的模型，如果没有已选模型则使用第一个模型
      if (providerSettings.selectedModel && modelSelect.querySelector(`option[value="${providerSettings.selectedModel}"]`)) {
        modelSelect.value = providerSettings.selectedModel;
      } else if (firstModelId) {
        modelSelect.value = firstModelId;
        // 更新设置中的选中模型
        if (currentSettings.providers[activeProvider]) {
          const settings = currentSettings.providers[activeProvider] as ProviderSettings;
          settings.selectedModel = firstModelId;
        }
      }
      
      // 设置提示词
      systemPromptTextarea.value = providerSettings.systemPrompt;
      userPromptTextarea.value = providerSettings.userPrompt;
    }
  } catch (error) {
    console.error(getMessage('errorLoadingSettings') + ':', error);
    showNotification(getMessage('errorLoadingSettings'), 'error');
  }
}

/**
 * 填充提供商选项
 */
async function populateProviderOptions(): Promise<void> {
  // 清空当前选项
  providerRadioGroup.innerHTML = '';
  
  // 获取所有提供商类型
  const providerTypes = Object.values(LLMProviderType);
  
  // 生成选项
  providerTypes.forEach((providerType, index) => {
    const radioOption = document.createElement('div');
    radioOption.className = 'radio-option';
    
    const radioInput = document.createElement('input');
    radioInput.type = 'radio';
    radioInput.name = 'provider';
    radioInput.id = `provider-${providerType}`;
    radioInput.value = providerType;
    
    // 第一个选项默认选中
    if (index === 0) {
      radioInput.checked = true;
    }
    
    const radioLabel = document.createElement('label');
    radioLabel.htmlFor = `provider-${providerType}`;
    
    // 设置显示名称
    switch (providerType) {
      case LLMProviderType.OPENAI:
        radioLabel.textContent = 'OpenAI';
        break;
      // 未来可能添加的其他提供商
      // case LLMProviderType.CLAUDE:
      //   radioLabel.textContent = 'Anthropic Claude';
      //   break;
      default:
        radioLabel.textContent = providerType;
    }
    
    // 尝试查找对应的国际化键
    const i18nKey = `provider${providerType.charAt(0).toUpperCase() + providerType.slice(1)}`;
    radioLabel.setAttribute('data-i18n', i18nKey);
    
    radioOption.appendChild(radioInput);
    radioOption.appendChild(radioLabel);
    providerRadioGroup.appendChild(radioOption);
  });
}

/**
 * 设置事件监听器
 */
function setupEventListeners(): void {
  // 提供商切换 - 立即保存
  providerRadioGroup.addEventListener('change', async (event) => {
    if (!currentSettings || !(event.target instanceof HTMLInputElement)) return;
    
    const selectedProvider = event.target.value as LLMProviderType;
    
    // 如果选择了不同的提供商，更新活跃提供商并重新加载设置
    if (selectedProvider !== currentSettings.activeProvider) {
      try {
        // 首先确保提供商设置存在
        if (!currentSettings.providers[selectedProvider]) {
          console.log(`为 ${selectedProvider} 提供商创建新的设置`);
          
          // 创建一个新的提供商设置对象
          const newProviderSettings: ProviderSettings = {
            apiKey: '',
            models: [],
            selectedModel: '',
            systemPrompt: DEFAULT_SYSTEM_PROMPT,
            userPrompt: DEFAULT_USER_PROMPT
          };
          
          // 使用索引签名更新提供商设置
          currentSettings.providers = {
            ...currentSettings.providers,
            [selectedProvider]: newProviderSettings
          };
          
          // 保存新的提供商设置
          await updateProviderSettings(selectedProvider, newProviderSettings);
        }
        
        // 更新活跃提供商
        await setActiveProvider(selectedProvider);
        
        // 更新当前设置中的活跃提供商
        currentSettings.activeProvider = selectedProvider;
        
        // 先清空当前选项，确保模型列表清空
        modelSelect.innerHTML = '';
        
        // 动态生成模型选项
        const firstModelId = await populateModelOptions();
        
        // 设置选中的模型，如果没有已选模型则使用第一个模型
        const providerSettings = currentSettings.providers[selectedProvider] as ProviderSettings;
        if (providerSettings) {
          if (providerSettings.selectedModel && modelSelect.querySelector(`option[value="${providerSettings.selectedModel}"]`)) {
            modelSelect.value = providerSettings.selectedModel;
          } else if (firstModelId) {
            modelSelect.value = firstModelId;
            // 更新设置中的选中模型
            if (currentSettings.providers[selectedProvider]) {
              const updatedProviderSettings = currentSettings.providers[selectedProvider] as ProviderSettings;
              if (updatedProviderSettings) {
                updatedProviderSettings.selectedModel = firstModelId;
                await updateProviderSettings(selectedProvider, {
                  apiKey: updatedProviderSettings.apiKey,
                  models: updatedProviderSettings.models,
                  selectedModel: firstModelId,
                  systemPrompt: updatedProviderSettings.systemPrompt,
                  userPrompt: updatedProviderSettings.userPrompt
                });
              }
            }
          }
          
          // 设置 API Key (显示为掌码)
          apiKeyInput.value = (providerSettings as ProviderSettings).apiKey ? '••••••••••••••••••••' : '';
          
          // 设置提示词
          systemPromptTextarea.value = (providerSettings as ProviderSettings).systemPrompt;
          userPromptTextarea.value = (providerSettings as ProviderSettings).userPrompt;
        }
        
        const providerChangedMsg = getMessage('providerChanged') || `已切换到OpenAI提供商`;
        showNotification(providerChangedMsg, 'success');
      } catch (error) {
        console.error('切换提供商失败:', error);
        const errorChangingProviderMsg = getMessage('errorChangingProvider') || '切换提供商失败';
        showNotification(errorChangingProviderMsg, 'error');
      }
    }
  });
  
  // 测试 API Key
  testApiKeyBtn.addEventListener('click', async () => {
    await testApiKey();
  });
  
  // 清除 API Key
  clearApiKeyBtn.addEventListener('click', () => {
    clearApiKey();
  });
  
  // 重置提示词
  resetPromptsBtn.addEventListener('click', async () => {
    await resetPrompts();
  });
  
  // 当输入 API Key 时，如果是新输入（非掩码），则保存原始值
  apiKeyInput.addEventListener('input', () => {
    const value = apiKeyInput.value;
    if (value && !value.includes('•')) {
      // 移除自动格式校验，允许任何格式的 API Key
      apiKeyInput.classList.remove('invalid');
      // 使用防抖保存 API Key
      debounceSave('apiKey', async () => {
        await saveApiKey(value);
      });
    }
  });
  
  // 模型选择 - 立即保存
  modelSelect.addEventListener('change', () => {
    const selectedModel = modelSelect.value;
    if (selectedModel && currentSettings) {
      debounceSave('model', async () => {
        await saveSelectedModel(selectedModel);
      });
    }
  });
  
  // System Prompt 输入 - 防抖保存
  systemPromptTextarea.addEventListener('input', () => {
    debounceSave('systemPrompt', async () => {
      await savePrompts();
    });
  });
  
  // User Prompt 输入 - 防抖保存
  userPromptTextarea.addEventListener('input', () => {
    debounceSave('userPrompt', async () => {
      await savePrompts();
    });
  });
}

/**
 * 测试 API Key 是否有效
 */
async function testApiKey(): Promise<void> {
  if (isApiKeyTesting) return;
  
  const apiKey = apiKeyInput.value;
  
  // 获取当前选中的提供商
  const selectedRadio = document.querySelector('input[name="provider"]:checked') as HTMLInputElement;
  const selectedProvider = selectedRadio ? selectedRadio.value as LLMProviderType : currentSettings?.activeProvider as LLMProviderType;
  
  // 如果是掌码，则使用存储的 API Key
  const actualApiKey = apiKey.includes('•') && currentSettings 
    ? currentSettings.providers[selectedProvider]?.apiKey || ''
    : apiKey;
  
  try {
    isApiKeyTesting = true;
    testApiKeyBtn.disabled = true;
    testApiKeyBtn.textContent = getMessage('loading'); // 使用已存在的 'loading' 消息键代替不存在的 'testing'
    
    let isValid = false;
    
    // 根据不同提供商创建相应的服务实例并验证 API Key
    switch (selectedProvider) {
      case LLMProviderType.OPENAI:
        const openaiService = new OpenAIService(actualApiKey);
        isValid = await openaiService.validateApiKey();
        break;
      // 未来可能添加的其他提供商
      // case LLMProviderType.CLAUDE:
      //   const claudeService = new ClaudeService(actualApiKey);
      //   isValid = await claudeService.validateApiKey();
      //   break;
      default:
        // 默认使用 OpenAI
        const defaultService = new OpenAIService(actualApiKey);
        isValid = await defaultService.validateApiKey();
    }
    
    if (isValid) {
      showNotification(getMessage('apiKeyValid'), 'success');
    } else {
      showNotification(getMessage('apiKeyInvalid'), 'error');
    }
  } catch (error) {
    console.error('测试 API Key 失败:', error);
    showNotification(getMessage('errorTestingApiKey'), 'error');
  } finally {
    isApiKeyTesting = false;
    testApiKeyBtn.disabled = false;
    testApiKeyBtn.textContent = getMessage('testApiKey');
  }
}

/**
 * 清除 API Key
 */
function clearApiKey(): void {
  apiKeyInput.value = '';
  apiKeyInput.classList.remove('invalid');
  
  if (currentSettings) {
    // 获取当前选中的提供商
    const selectedRadio = document.querySelector('input[name="provider"]:checked') as HTMLInputElement;
    const selectedProvider = selectedRadio ? selectedRadio.value as LLMProviderType : currentSettings.activeProvider as LLMProviderType;
    
    if (currentSettings.providers[selectedProvider]) {
      currentSettings.providers[selectedProvider]!.apiKey = '';
    }
  }
  
  showNotification(getMessage('apiKeyCleared'), 'info');
}

/**
 * 重置提示词为默认值
 */
async function resetPrompts(): Promise<void> {
  if (!currentSettings) return;
  
  try {
    // 重置当前活跃提供商的提示词
    await resetProviderPrompts(currentSettings.activeProvider);
    
    // 重新加载设置
    await loadSettings();
    
    showNotification(getMessage('promptsReset'), 'success');
  } catch (error) {
    console.error('重置提示词失败:', error);
    showNotification(getMessage('errorResettingPrompts'), 'error');
  }
}

/**
 * 保存 API Key
 */
async function saveApiKey(apiKey: string): Promise<void> {
  if (!currentSettings) return;
  
  try {
    const activeProvider = currentSettings.activeProvider as LLMProviderType;
    if (!activeProvider) return;
    
    // 获取当前提供商设置
    const providerSettings = currentSettings.providers[activeProvider] || {
      apiKey: '',
      models: [],
      selectedModel: '',
      systemPrompt: '',
      userPrompt: ''
    };
    
    // 更新 API Key
    const updatedSettings: ProviderSettings = {
      ...providerSettings,
      apiKey
    };
    
    // 更新提供商设置
    await updateProviderSettings(activeProvider, updatedSettings);
    
    // 更新当前设置
    if (currentSettings.providers[activeProvider]) {
      currentSettings.providers[activeProvider]!.apiKey = apiKey;
    } else {
      currentSettings.providers[activeProvider] = updatedSettings;
    }
    
    showNotification(getMessage('apiKeySaved'), 'success');
  } catch (error) {
    console.error('保存 API Key 失败:', error);
    showNotification(getMessage('errorSavingApiKey'), 'error');
  }
}

/**
 * 保存选中的模型
 */
async function saveSelectedModel(selectedModel: string): Promise<void> {
  if (!currentSettings) return;
  
  try {
    const activeProvider = currentSettings.activeProvider as LLMProviderType;
    if (!activeProvider) return;
    
    // 获取当前提供商设置
    const providerSettings = currentSettings.providers[activeProvider] as ProviderSettings;
    if (!providerSettings) return;
    
    // 更新选中的模型
    const updatedSettings: ProviderSettings = {
      apiKey: providerSettings.apiKey,
      models: providerSettings.models,
      selectedModel,
      systemPrompt: providerSettings.systemPrompt,
      userPrompt: providerSettings.userPrompt
    };
    
    // 更新提供商设置
    await updateProviderSettings(activeProvider, updatedSettings);
    
    // 更新当前设置
    if (currentSettings.providers[activeProvider]) {
      const settings = currentSettings.providers[activeProvider] as ProviderSettings;
      settings.selectedModel = selectedModel;
    }
    
    showNotification(getMessage('modelSaved'), 'success');
  } catch (error) {
    console.error('保存模型选择失败:', error);
    showNotification(getMessage('errorSavingModel'), 'error');
  }
}

/**
 * 保存提示词
 */
async function savePrompts(): Promise<void> {
  if (!currentSettings) return;
  
  try {
    const activeProvider = currentSettings.activeProvider as LLMProviderType;
    if (!activeProvider) return;
    
    const systemPrompt = systemPromptTextarea.value;
    const userPrompt = userPromptTextarea.value;
    
    // 验证输入
    if (systemPrompt.trim() === '') {
      showNotification(getMessage('systemPromptEmpty'), 'error');
      return;
    }
    
    if (userPrompt.trim() === '') {
      showNotification(getMessage('userPromptEmpty'), 'error');
      return;
    }
    
    // 检查提示词长度
    if (systemPrompt.length > 3000 || userPrompt.length > 3000) {
      showNotification(getMessage('promptTooLong'), 'error');
      return;
    }
    
    // 获取当前提供商设置
    const providerSettings = currentSettings.providers[activeProvider] as ProviderSettings;
    if (!providerSettings) return;
    
    // 更新提示词
    const updatedSettings: ProviderSettings = {
      apiKey: providerSettings.apiKey,
      models: providerSettings.models,
      selectedModel: providerSettings.selectedModel,
      systemPrompt,
      userPrompt
    };
    
    // 更新提供商设置
    await updateProviderSettings(activeProvider, updatedSettings);
    
    // 更新当前设置
    if (currentSettings.providers[activeProvider]) {
      const settings = currentSettings.providers[activeProvider] as ProviderSettings;
      settings.systemPrompt = systemPrompt;
      settings.userPrompt = userPrompt;
    }
    
    showNotification(getMessage('promptsSaved'), 'success');
  } catch (error) {
    console.error('保存提示词失败:', error);
    showNotification(getMessage('errorSavingPrompts'), 'error');
  }
}

/**
 * 防抖函数 - 避免频繁保存
 */
function debounceSave(key: string, callback: () => Promise<void>, delay: number = 1000): void {
  // 清除之前的定时器
  if (saveTimeouts[key]) {
    window.clearTimeout(saveTimeouts[key]);
  }
  
  // 设置新的定时器
  saveTimeouts[key] = window.setTimeout(async () => {
    await callback();
    delete saveTimeouts[key];
  }, delay);
}

/**
 * 动态生成模型选项
 * @returns 返回第一个模型的ID（如果有的话）
 */
async function populateModelOptions(): Promise<string | null> {
  try {
    if (!currentSettings) return null;
    
    // 清空当前选项
    modelSelect.innerHTML = '';
    
    // 获取当前选择的提供商类型
    const activeProvider = currentSettings.activeProvider as LLMProviderType;
    
    // 根据提供商类型创建相应的服务实例
    let service;
    switch (activeProvider) {
      case LLMProviderType.OPENAI:
        service = new OpenAIService('');
        break;
      default:
        showNotification(getMessage('unsupportedProvider'), 'error');
        return null;
    }
    
    // 根据提供商类型获取模型列表
    let models: LLMModel[] = [];
    switch (activeProvider) {
      case LLMProviderType.OPENAI:
        models = await service.getAvailableModels();
        break;
      default:
        console.error(getMessage('unsupportedProvider') + ':', activeProvider);
        return null;
    }
    
    if (models.length === 0) {
      return null;
    }
    
    // 记录第一个模型的ID
    const firstModelId = models[0].id;
    
    // 生成选项
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.name;
      
      // 尝试查找对应的国际化键
      const i18nKey = `model${model.id.replace(/[-.]/g, '').split('').map((c: string, i: number) => i === 0 ? c.toUpperCase() : c).join('')}`;
      option.setAttribute('data-i18n', i18nKey);
      
      modelSelect.appendChild(option);
    });
    
    return firstModelId;
  } catch (error) {
    console.error(getMessage('loadingModelsFailed') + ':', error);
    return null;
  }
}

/**
 * 显示通知
 * @param message 通知消息
 * @param type 通知类型
 */
function showNotification(message: string, type: 'success' | 'error' | 'info'): void {
  // 如果消息为空，根据通知类型提供默认消息
  if (!message || message.trim() === '') {
    switch (type) {
      case 'success':
        message = '操作成功';
        break;
      case 'error':
        message = '操作失败';
        break;
      case 'info':
        message = '提示信息';
        break;
    }
  }
  
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // 添加到页面
  document.body.appendChild(notification);
  
  // 3秒后自动移除
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}
