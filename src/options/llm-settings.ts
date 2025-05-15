/**
 * LLM 设置页面功能实现
 */

import { 
  LLMSettings, 
  ProviderSettings,
  LLMProviderType
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
const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
const modelSelect = document.getElementById('model-select') as HTMLSelectElement;
const systemPromptTextarea = document.getElementById('system-prompt') as HTMLTextAreaElement;
const userPromptTextarea = document.getElementById('user-prompt') as HTMLTextAreaElement;
const testApiKeyBtn = document.getElementById('test-api-key') as HTMLButtonElement;
const clearApiKeyBtn = document.getElementById('clear-api-key') as HTMLButtonElement;
const resetPromptsBtn = document.getElementById('reset-prompts') as HTMLButtonElement;
const saveLlmSettingsBtn = document.getElementById('save-llm-settings') as HTMLButtonElement;

// 状态变量
let currentSettings: LLMSettings | null = null;
let isApiKeyTesting = false;

/**
 * 初始化 LLM 设置页面
 */
export async function initLLMSettings(): Promise<void> {
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
    
    // 显示当前活跃提供商的设置
    const activeProvider = currentSettings.activeProvider;
    const providerSettings = currentSettings.providers[activeProvider];
    
    if (providerSettings) {
      // 设置 API Key (显示为掩码)
      apiKeyInput.value = providerSettings.apiKey ? '••••••••••••••••••••••' : '';
      
      // 设置选中的模型
      modelSelect.value = providerSettings.selectedModel;
      
      // 设置提示词
      systemPromptTextarea.value = providerSettings.systemPrompt;
      userPromptTextarea.value = providerSettings.userPrompt;
    }
  } catch (error) {
    console.error('加载 LLM 设置失败:', error);
    showNotification(getMessage('errorLoadingSettings'), 'error');
  }
}

/**
 * 设置事件监听器
 */
function setupEventListeners(): void {
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
  
  // 保存设置
  saveLlmSettingsBtn.addEventListener('click', async () => {
    await saveSettings();
  });
  
  // 当输入 API Key 时，如果是新输入（非掩码），则保存原始值
  apiKeyInput.addEventListener('input', () => {
    const value = apiKeyInput.value;
    if (value && !value.includes('•')) {
      // 验证 API Key 格式
      if (value.startsWith('sk-')) {
        apiKeyInput.classList.remove('invalid');
      } else {
        apiKeyInput.classList.add('invalid');
      }
    }
  });
}

/**
 * 测试 API Key 是否有效
 */
async function testApiKey(): Promise<void> {
  if (isApiKeyTesting) return;
  
  const apiKey = apiKeyInput.value;
  
  // 如果是掩码，则使用存储的 API Key
  const actualApiKey = apiKey.includes('•') && currentSettings 
    ? currentSettings.providers[currentSettings.activeProvider]?.apiKey || ''
    : apiKey;
  
  // 验证 API Key 格式
  if (!actualApiKey || !actualApiKey.startsWith('sk-')) {
    showNotification(getMessage('invalidApiKeyFormat'), 'error');
    return;
  }
  
  try {
    isApiKeyTesting = true;
    testApiKeyBtn.disabled = true;
    testApiKeyBtn.textContent = getMessage('loading'); // 使用已存在的 'loading' 消息键代替不存在的 'testing'
    
    // 创建 OpenAI 服务实例并验证 API Key
    const openaiService = new OpenAIService(actualApiKey);
    const isValid = await openaiService.validateApiKey();
    
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
  
  if (currentSettings && currentSettings.activeProvider) {
    const activeProvider = currentSettings.activeProvider;
    if (currentSettings.providers[activeProvider]) {
      currentSettings.providers[activeProvider]!.apiKey = '';
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
 * 保存 LLM 设置
 */
async function saveSettings(): Promise<void> {
  if (!currentSettings) return;
  
  try {
    const activeProvider = currentSettings.activeProvider as LLMProviderType;
    const apiKey = apiKeyInput.value;
    const selectedModel = modelSelect.value;
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
    
    // 准备提供商设置
    const providerSettings: ProviderSettings = {
      apiKey: apiKey.includes('•') && currentSettings.providers[activeProvider]
        ? currentSettings.providers[activeProvider]!.apiKey
        : apiKey,
      models: currentSettings.providers[activeProvider]?.models || ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
      selectedModel,
      systemPrompt,
      userPrompt
    };
    
    // 更新提供商设置
    await updateProviderSettings(activeProvider, providerSettings);
    
    // 设置活跃提供商
    await setActiveProvider(activeProvider);
    
    // 重新加载设置
    await loadSettings();
    
    showNotification(getMessage('settingsSaved'), 'success');
  } catch (error) {
    console.error('保存 LLM 设置失败:', error);
    showNotification(getMessage('errorSavingSettings'), 'error');
  }
}

/**
 * 显示通知
 * @param message 通知消息
 * @param type 通知类型
 */
function showNotification(message: string, type: 'success' | 'error' | 'info'): void {
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
