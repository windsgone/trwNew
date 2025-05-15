import { OpenAIService } from '../providers/openai-provider';
import { LLMErrorType, PageInfo } from '../types';

// 模拟 fetch API
global.fetch = jest.fn();

describe('OpenAIService', () => {
  let service: OpenAIService;
  const mockApiKey = 'sk-test123456789';
  const mockModel = 'gpt-4o';
  
  beforeEach(() => {
    service = new OpenAIService(mockApiKey, mockModel);
    jest.clearAllMocks();
  });
  
  describe('validateApiKey', () => {
    it('应该在 API Key 有效时返回 true', async () => {
      // 模拟成功响应
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] })
      });
      
      const result = await service.validateApiKey();
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json'
          }
        })
      );
    });
    
    it('应该在 API Key 无效时返回 false', async () => {
      // 模拟 401 错误响应
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ 
          error: { message: 'Invalid API key' } 
        })
      });
      
      const result = await service.validateApiKey();
      
      expect(result).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    
    it('应该在网络错误时返回 false', async () => {
      // 模拟网络错误
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      const result = await service.validateApiKey();
      
      expect(result).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('generateText', () => {
    const mockPageInfo: PageInfo = {
      url: 'https://example.com',
      title: '示例页面',
      description: '这是一个示例页面的描述'
    };
    
    const mockRequestParams = {
      systemPrompt: '你是一个助手',
      userPrompt: '根据 {{title}} {{url}} {{descriptions}} 生成一个标题',
      pageInfo: mockPageInfo,
      maxTokens: 50,
      temperature: 0.7
    };
    
    const mockOpenAIResponse = {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: 1677858242,
      model: mockModel,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: '示例页面 - 简洁描述'
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 30,
        completion_tokens: 10,
        total_tokens: 40
      }
    };
    
    it('应该成功生成文本并返回正确的响应格式', async () => {
      // 模拟成功响应
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOpenAIResponse
      });
      
      const result = await service.generateText(mockRequestParams);
      
      expect(result).toEqual({
        content: '示例页面 - 简洁描述',
        provider: 'openai',
        model: mockModel,
        usage: {
          promptTokens: 30,
          completionTokens: 10,
          totalTokens: 40
        }
      });
      
      // 验证请求参数
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json'
          },
          body: expect.any(String)
        })
      );
      
      // 验证请求体
      const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(requestBody).toEqual({
        model: mockModel,
        messages: [
          {
            role: 'system',
            content: '你是一个助手'
          },
          {
            role: 'user',
            content: '根据 示例页面 https://example.com 这是一个示例页面的描述 生成一个标题'
          }
        ],
        max_tokens: 50,
        temperature: 0.7,
        n: 1
      });
    });
    
    it('应该在 API 错误时抛出 LLMError', async () => {
      // 模拟 API 错误响应
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ 
          error: { message: 'Invalid API key' } 
        })
      });
      
      await expect(service.generateText(mockRequestParams))
        .rejects
        .toMatchObject({
          name: 'LLMError',
          type: LLMErrorType.INVALID_API_KEY,
          message: 'API Key 无效或已过期'
        });
    });
    
    it('应该在请求被中止时抛出超时错误', async () => {
      // 模拟 AbortError
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);
      
      await expect(service.generateText(mockRequestParams))
        .rejects
        .toMatchObject({
          name: 'LLMError',
          type: LLMErrorType.TIMEOUT,
          message: '请求已被取消'
        });
    });
  });
});
