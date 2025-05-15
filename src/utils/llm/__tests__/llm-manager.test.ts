import { LLMManager } from '../llm-manager';
import { createLLMService } from '../providers/provider-factory';
import { LLMProviderType, LLMSettings, DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_PROMPT } from '../types';

// 模拟 chrome.storage.local API
const mockChromeStorage = {
  get: jest.fn(),
  set: jest.fn()
};

// 模拟 chrome API
global.chrome = {
  storage: {
    local: mockChromeStorage
  },
  runtime: {
    lastError: undefined as chrome.runtime.LastError | undefined
  }
} as any;

// 模拟 createLLMService
jest.mock('../providers/provider-factory');
const mockGenerateText = jest.fn();
const mockValidateApiKey = jest.fn();
(createLLMService as jest.Mock).mockImplementation(() => ({
  generateText: mockGenerateText,
  validateApiKey: mockValidateApiKey,
  getProviderType: () => LLMProviderType.OPENAI
}));

describe('LLMManager', () => {
  let manager: LLMManager;
  
  beforeEach(() => {
    manager = new LLMManager();
    jest.clearAllMocks();
    
    // 重置 chrome.runtime.lastError
    global.chrome.runtime.lastError = undefined;
  });
  
  describe('initialize', () => {
    it('应该使用提供的设置初始化', async () => {
      const settings: LLMSettings = {
        activeProvider: LLMProviderType.OPENAI,
        providers: {
          [LLMProviderType.OPENAI]: {
            apiKey: 'sk-test123',
            models: ['gpt-4o'],
            selectedModel: 'gpt-4o',
            systemPrompt: '自定义系统提示词',
            userPrompt: '自定义用户提示词'
          }
        }
      };
      
      await manager.initialize(settings);
      
      expect(createLLMService).toHaveBeenCalledWith(
        LLMProviderType.OPENAI,
        'sk-test123',
        'gpt-4o'
      );
      
      // 验证设置已保存
      expect(manager.getSettings()).toEqual(settings);
    });
    
    it('应该从存储中加载设置', async () => {
      const storedSettings: LLMSettings = {
        activeProvider: LLMProviderType.OPENAI,
        providers: {
          [LLMProviderType.OPENAI]: {
            apiKey: 'sk-stored123',
            models: ['gpt-4o'],
            selectedModel: 'gpt-4o',
            systemPrompt: '存储的系统提示词',
            userPrompt: '存储的用户提示词'
          }
        }
      };
      
      mockChromeStorage.get.mockImplementationOnce((_, callback) => {
        callback({ llm_settings: storedSettings });
      });
      
      await manager.initialize();
      
      expect(mockChromeStorage.get).toHaveBeenCalledWith(['llm_settings'], expect.any(Function));
      expect(createLLMService).toHaveBeenCalledWith(
        LLMProviderType.OPENAI,
        'sk-stored123',
        'gpt-4o'
      );
      
      // 验证设置已加载
      expect(manager.getSettings()).toEqual(storedSettings);
    });
    
    it('应该在没有存储设置时创建默认设置', async () => {
      mockChromeStorage.get.mockImplementationOnce((_, callback) => {
        callback({});
      });
      
      await manager.initialize();
      
      expect(mockChromeStorage.get).toHaveBeenCalledWith(['llm_settings'], expect.any(Function));
      
      // 验证创建了默认设置
      const settings = manager.getSettings();
      expect(settings).toEqual({
        activeProvider: LLMProviderType.OPENAI,
        providers: {
          [LLMProviderType.OPENAI]: {
            apiKey: '',
            models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
            selectedModel: 'gpt-3.5-turbo',
            systemPrompt: DEFAULT_SYSTEM_PROMPT,
            userPrompt: DEFAULT_USER_PROMPT
          }
        }
      });
      
      // 没有 API Key，不应该创建服务
      expect(createLLMService).not.toHaveBeenCalled();
    });
  });
  
  describe('generateText', () => {
    const mockPageInfo = {
      url: 'https://example.com',
      title: '示例页面',
      description: '这是一个示例页面的描述'
    };
    
    const mockSettings: LLMSettings = {
      activeProvider: LLMProviderType.OPENAI,
      providers: {
        [LLMProviderType.OPENAI]: {
          apiKey: 'sk-test123',
          models: ['gpt-4o'],
          selectedModel: 'gpt-4o',
          systemPrompt: '自定义系统提示词',
          userPrompt: '自定义用户提示词'
        }
      }
    };
    
    beforeEach(async () => {
      await manager.initialize(mockSettings);
    });
    
    it('应该正确调用 LLM 服务生成文本', async () => {
      const mockResponse = {
        content: '生成的标题',
        provider: LLMProviderType.OPENAI,
        model: 'gpt-4o',
        usage: {
          promptTokens: 30,
          completionTokens: 10,
          totalTokens: 40
        }
      };
      
      mockGenerateText.mockResolvedValueOnce(mockResponse);
      
      const result = await manager.generateText(mockPageInfo, { 
        maxTokens: 50, 
        temperature: 0.7 
      });
      
      expect(result).toEqual(mockResponse);
      expect(mockGenerateText).toHaveBeenCalledWith({
        systemPrompt: '自定义系统提示词',
        userPrompt: '自定义用户提示词',
        pageInfo: mockPageInfo,
        maxTokens: 50,
        temperature: 0.7,
        signal: expect.any(AbortSignal)
      });
    });
    
    it('应该在超时时取消请求', async () => {
      // 模拟 AbortController.abort 方法
      const mockAbort = jest.fn();
      global.AbortController = jest.fn().mockImplementation(() => ({
        signal: {},
        abort: mockAbort
      }));
      
      // 模拟一个永远不会解决的 Promise
      mockGenerateText.mockImplementationOnce(() => new Promise(() => {}));
      
      // 使用较短的超时时间
      manager.generateText(mockPageInfo, { timeoutMs: 10 });
      
      // 等待超时触发，但不需要等待整个 Promise 解决
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 验证 abort 被调用
      expect(mockAbort).toHaveBeenCalled();
      expect(mockGenerateText).toHaveBeenCalled();
      
      // 清理
      manager.cancelRequest();
      
      // 我们不等待 Promise 解决，因为它永远不会解决
      // 只需验证 abort 被调用即可
    });
  });
  
  describe('validateApiKey', () => {
    it('应该调用 LLM 服务验证 API Key', async () => {
      mockValidateApiKey.mockResolvedValueOnce(true);
      
      const result = await manager.validateApiKey(LLMProviderType.OPENAI, 'sk-test123');
      
      expect(result).toBe(true);
      expect(createLLMService).toHaveBeenCalledWith(LLMProviderType.OPENAI, 'sk-test123');
      expect(mockValidateApiKey).toHaveBeenCalled();
    });
  });
  
  describe('updateSettings', () => {
    it('应该更新设置并保存到存储', async () => {
      const newSettings: LLMSettings = {
        activeProvider: LLMProviderType.OPENAI,
        providers: {
          [LLMProviderType.OPENAI]: {
            apiKey: 'sk-new123',
            models: ['gpt-4o'],
            selectedModel: 'gpt-4o',
            systemPrompt: '新的系统提示词',
            userPrompt: '新的用户提示词'
          }
        }
      };
      
      mockChromeStorage.set.mockImplementationOnce((_, callback) => {
        callback();
      });
      
      await manager.updateSettings(newSettings);
      
      expect(mockChromeStorage.set).toHaveBeenCalledWith(
        { llm_settings: newSettings },
        expect.any(Function)
      );
      
      // 验证设置已更新
      expect(manager.getSettings()).toEqual(newSettings);
      
      // 验证创建了新的服务
      expect(createLLMService).toHaveBeenCalledWith(
        LLMProviderType.OPENAI,
        'sk-new123',
        'gpt-4o'
      );
    });
  });
});
