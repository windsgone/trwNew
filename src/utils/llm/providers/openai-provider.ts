/**
 * OpenAI 提供商实现
 */

import { 
  LLMModel, 
  LLMProviderType, 
  LLMRequestParams, 
  LLMResponse, 
  LLMError, 
  LLMErrorType 
} from '../types';
import { BaseLLMService } from '../llm-service';

/**
 * OpenAI API 响应类型
 */
interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI 模型列表
 */
const OPENAI_MODELS: LLMModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    maxTokens: 128000,
    description: '最新的 GPT-4o 模型，功能强大且响应速度快'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    maxTokens: 128000,
    description: 'GPT-4o 的轻量版，更经济实惠'
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    maxTokens: 128000,
    description: '新一代 GPT-4.1 模型，性能卓越'
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    maxTokens: 64000,
    description: 'GPT-4.1 的轻量版，平衡性能与成本'
  },
  {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    maxTokens: 32000,
    description: 'GPT-4.1 的超轻量版，速度快且经济实惠'
  }
];

/**
 * OpenAI 服务实现
 */
export class OpenAIService extends BaseLLMService {
  private readonly apiEndpoint = 'https://api.openai.com/v1';
  
  constructor(apiKey: string, selectedModel: string = 'gpt-4o-mini') {
    super(apiKey, selectedModel);
  }
  
  /**
   * 获取提供商类型
   */
  getProviderType(): LLMProviderType {
    return LLMProviderType.OPENAI;
  }
  
  /**
   * 获取可用模型列表
   */
  async getAvailableModels(): Promise<LLMModel[]> {
    // 如果需要从 API 获取最新模型列表，可以实现这里
    // 目前直接返回预定义的模型列表
    return OPENAI_MODELS;
  }
  
  /**
   * 验证 API Key 是否有效
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // 创建 AbortController 以便设置超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 10秒超时
      
      const response = await fetch(`${this.apiEndpoint}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      // 清除超时计时器
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        await this.handleApiError(response);
      }
      
      return true;
    } catch (error: any) {
      if (error instanceof LLMError && error.type === LLMErrorType.INVALID_API_KEY) {
        return false;
      }
      
      // 处理超时错误
      if (error.name === 'AbortError') {
        console.error('API 请求超时');
        return false;
      }
      
      // 处理网络错误
      console.error('API 验证错误:', error);
      
      // 其他错误可能是网络问题，不一定是 API Key 无效
      // 为了避免误判，这里返回 false
      return false;
    }
  }
  
  /**
   * 生成文本
   * @param params 请求参数
   */
  async generateText(params: LLMRequestParams): Promise<LLMResponse> {
    const { systemPrompt, userPrompt, pageInfo, maxTokens, temperature, signal } = params;
    
    // 替换提示词中的变量
    const processedUserPrompt = this.replacePromptVariables(userPrompt, pageInfo);
    
    try {
      const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.selectedModel,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: processedUserPrompt
            }
          ],
          max_tokens: maxTokens,
          temperature: temperature || 0.7,
          n: 1
        }),
        signal
      });
      
      if (!response.ok) {
        await this.handleApiError(response);
      }
      
      const data = await response.json() as OpenAIResponse;
      
      return {
        content: data.choices[0].message.content.trim(),
        provider: LLMProviderType.OPENAI,
        model: data.model,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        }
      };
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      
      return this.handleNetworkError(error);
    }
  }
}
