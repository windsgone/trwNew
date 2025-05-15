import { 
  getLLMSettings, 
  saveLLMSettings, 
  updateProviderSettings, 
  setActiveProvider, 
  getDefaultLLMSettings,
  resetLLMSettings,
  resetProviderPrompts
} from '../storage';
import { LLMSettings, LLMProviderType, ProviderSettings, DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_PROMPT } from '../llm/types';

describe('LLM设置存储测试', () => {
  const LLM_SETTINGS_KEY = 'llm_settings';
  
  beforeEach(() => {
    // 重置mock
    jest.clearAllMocks();
    
    // 类型断言chrome API
    (chrome.storage.local.get as jest.Mock) = jest.fn();
    (chrome.storage.local.set as jest.Mock) = jest.fn();
  });

  test('getLLMSettings在存在设置时应返回存储的设置', async () => {
    const mockSettings: LLMSettings = {
      activeProvider: LLMProviderType.OPENAI,
      providers: {
        [LLMProviderType.OPENAI]: {
          apiKey: 'test-api-key',
          models: ['gpt-3.5-turbo', 'gpt-4'],
          selectedModel: 'gpt-4',
          systemPrompt: 'Custom system prompt',
          userPrompt: 'Custom user prompt'
        }
      }
    };
    
    (chrome.storage.local.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({ [LLM_SETTINGS_KEY]: mockSettings });
    });

    const result = await getLLMSettings();
    expect(chrome.storage.local.get).toHaveBeenCalledWith(LLM_SETTINGS_KEY);
    expect(result).toEqual(mockSettings);
  });

  test('getLLMSettings在没有设置时应返回默认设置', async () => {
    (chrome.storage.local.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({});
    });

    const result = await getLLMSettings();
    expect(result).toEqual(getDefaultLLMSettings());
  });

  test('saveLLMSettings应将设置保存到存储中', async () => {
    const settings: LLMSettings = {
      activeProvider: LLMProviderType.OPENAI,
      providers: {
        [LLMProviderType.OPENAI]: {
          apiKey: 'new-api-key',
          models: ['gpt-3.5-turbo'],
          selectedModel: 'gpt-3.5-turbo',
          systemPrompt: 'New system prompt',
          userPrompt: 'New user prompt'
        }
      }
    };
    
    (chrome.storage.local.set as jest.Mock).mockImplementation(() => {
      return Promise.resolve();
    });

    await saveLLMSettings(settings);
    
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [LLM_SETTINGS_KEY]: settings
    });
  });

  test('updateProviderSettings应更新特定提供商的设置', async () => {
    const existingSettings: LLMSettings = {
      activeProvider: LLMProviderType.OPENAI,
      providers: {
        [LLMProviderType.OPENAI]: {
          apiKey: 'old-api-key',
          models: ['gpt-3.5-turbo'],
          selectedModel: 'gpt-3.5-turbo',
          systemPrompt: 'Old system prompt',
          userPrompt: 'Old user prompt'
        }
      }
    };
    
    const newProviderSettings: ProviderSettings = {
      apiKey: 'updated-api-key',
      models: ['gpt-3.5-turbo', 'gpt-4'],
      selectedModel: 'gpt-4',
      systemPrompt: 'Updated system prompt',
      userPrompt: 'Updated user prompt'
    };
    
    (chrome.storage.local.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({ [LLM_SETTINGS_KEY]: existingSettings });
    });
    
    (chrome.storage.local.set as jest.Mock).mockImplementation(() => {
      return Promise.resolve();
    });

    const result = await updateProviderSettings(LLMProviderType.OPENAI, newProviderSettings);
    
    const expectedSettings: LLMSettings = {
      activeProvider: LLMProviderType.OPENAI,
      providers: {
        [LLMProviderType.OPENAI]: newProviderSettings
      }
    };
    
    expect(chrome.storage.local.get).toHaveBeenCalledWith(LLM_SETTINGS_KEY);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [LLM_SETTINGS_KEY]: expectedSettings
    });
    expect(result).toEqual(expectedSettings);
  });

  test('updateProviderSettings在首次配置提供商时应将其设为活跃提供商', async () => {
    const existingSettings: LLMSettings = {
      activeProvider: LLMProviderType.OPENAI,
      providers: {}
    };
    
    const newProviderSettings: ProviderSettings = {
      apiKey: 'new-provider-key',
      models: ['model1'],
      selectedModel: 'model1',
      systemPrompt: 'New provider system prompt',
      userPrompt: 'New provider user prompt'
    };
    
    (chrome.storage.local.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({ [LLM_SETTINGS_KEY]: existingSettings });
    });
    
    (chrome.storage.local.set as jest.Mock).mockImplementation(() => {
      return Promise.resolve();
    });

    // 假设添加一个新的提供商类型
    const newProviderType = 'claude' as LLMProviderType;
    // 模拟没有活跃提供商的情况
    const { activeProvider, ...settingsWithoutActive } = existingSettings;
    const modifiedSettings = { ...settingsWithoutActive };
    
    // 使用修改后的设置对象
    (chrome.storage.local.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({ [LLM_SETTINGS_KEY]: modifiedSettings });
    });
    
    const result = await updateProviderSettings(newProviderType, newProviderSettings);
    
    const expectedSettings: LLMSettings = {
      activeProvider: newProviderType,
      providers: {
        [newProviderType]: newProviderSettings
      }
    };
    
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [LLM_SETTINGS_KEY]: expectedSettings
    });
    expect(result.activeProvider).toEqual(newProviderType);
  });

  test('setActiveProvider应设置活跃提供商', async () => {
    const existingSettings: LLMSettings = {
      activeProvider: LLMProviderType.OPENAI,
      providers: {
        [LLMProviderType.OPENAI]: {
          apiKey: 'openai-key',
          models: ['gpt-3.5-turbo'],
          selectedModel: 'gpt-3.5-turbo',
          systemPrompt: 'OpenAI system prompt',
          userPrompt: 'OpenAI user prompt'
        },
        [LLMProviderType.CLAUDE]: {
          apiKey: 'claude-key',
          models: ['claude-instant'],
          selectedModel: 'claude-instant',
          systemPrompt: 'Claude system prompt',
          userPrompt: 'Claude user prompt'
        }
      }
    };
    
    (chrome.storage.local.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({ [LLM_SETTINGS_KEY]: existingSettings });
    });
    
    (chrome.storage.local.set as jest.Mock).mockImplementation(() => {
      return Promise.resolve();
    });

    const newActiveProvider = 'claude' as LLMProviderType;
    const result = await setActiveProvider(newActiveProvider);
    
    const expectedSettings: LLMSettings = {
      ...existingSettings,
      activeProvider: newActiveProvider
    };
    
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [LLM_SETTINGS_KEY]: expectedSettings
    });
    expect(result.activeProvider).toEqual(newActiveProvider);
  });

  test('setActiveProvider在提供商未配置时应抛出错误', async () => {
    const existingSettings: LLMSettings = {
      activeProvider: LLMProviderType.OPENAI,
      providers: {
        [LLMProviderType.OPENAI]: {
          apiKey: 'openai-key',
          models: ['gpt-3.5-turbo'],
          selectedModel: 'gpt-3.5-turbo',
          systemPrompt: 'OpenAI system prompt',
          userPrompt: 'OpenAI user prompt'
        }
      }
    };
    
    (chrome.storage.local.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({ [LLM_SETTINGS_KEY]: existingSettings });
    });

    const unconfiguredProvider = 'claude' as LLMProviderType;
    await expect(setActiveProvider(unconfiguredProvider)).rejects.toThrow(`提供商 ${unconfiguredProvider} 尚未配置`);
  });

  test('resetLLMSettings应将设置重置为默认值', async () => {
    const defaultSettings = getDefaultLLMSettings();
    
    (chrome.storage.local.set as jest.Mock).mockImplementation(() => {
      return Promise.resolve();
    });

    const result = await resetLLMSettings();
    
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [LLM_SETTINGS_KEY]: defaultSettings
    });
    expect(result).toEqual(defaultSettings);
  });

  test('resetProviderPrompts应将提供商的提示词重置为默认值', async () => {
    const existingSettings: LLMSettings = {
      activeProvider: LLMProviderType.OPENAI,
      providers: {
        [LLMProviderType.OPENAI]: {
          apiKey: 'openai-key',
          models: ['gpt-3.5-turbo'],
          selectedModel: 'gpt-3.5-turbo',
          systemPrompt: 'Custom system prompt',
          userPrompt: 'Custom user prompt'
        }
      }
    };
    
    (chrome.storage.local.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({ [LLM_SETTINGS_KEY]: existingSettings });
    });
    
    (chrome.storage.local.set as jest.Mock).mockImplementation(() => {
      return Promise.resolve();
    });

    const result = await resetProviderPrompts(LLMProviderType.OPENAI);
    
    const expectedSettings: LLMSettings = {
      activeProvider: LLMProviderType.OPENAI,
      providers: {
        [LLMProviderType.OPENAI]: {
          ...existingSettings.providers[LLMProviderType.OPENAI]!,
          systemPrompt: DEFAULT_SYSTEM_PROMPT,
          userPrompt: DEFAULT_USER_PROMPT
        }
      }
    };
    
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [LLM_SETTINGS_KEY]: expectedSettings
    });
    expect(result.providers[LLMProviderType.OPENAI]!.systemPrompt).toEqual(DEFAULT_SYSTEM_PROMPT);
    expect(result.providers[LLMProviderType.OPENAI]!.userPrompt).toEqual(DEFAULT_USER_PROMPT);
  });

  test('resetProviderPrompts在提供商不存在时不应修改设置', async () => {
    const existingSettings: LLMSettings = {
      activeProvider: LLMProviderType.OPENAI,
      providers: {
        [LLMProviderType.OPENAI]: {
          apiKey: 'openai-key',
          models: ['gpt-3.5-turbo'],
          selectedModel: 'gpt-3.5-turbo',
          systemPrompt: 'Custom system prompt',
          userPrompt: 'Custom user prompt'
        }
      }
    };
    
    (chrome.storage.local.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({ [LLM_SETTINGS_KEY]: existingSettings });
    });

    const nonExistentProvider = 'claude' as LLMProviderType;
    const result = await resetProviderPrompts(nonExistentProvider);
    
    // 不应调用set
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
    expect(result).toEqual(existingSettings);
  });
});
