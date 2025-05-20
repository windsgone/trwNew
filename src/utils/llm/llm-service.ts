/**
 * LLM 服务抽象接口
 */

import { 
  LLMModel, 
  LLMProviderType, 
  LLMRequestParams, 
  LLMResponse, 
  LLMError, 
  LLMErrorType 
} from './types';
import { getMessage } from '../i18nUtils';

/**
 * LLM 服务接口
 * 定义所有 LLM 提供商必须实现的方法
 */
export interface ILLMService {
  /**
   * 获取提供商类型
   */
  getProviderType(): LLMProviderType;
  
  /**
   * 获取可用模型列表
   */
  getAvailableModels(): Promise<LLMModel[]>;
  
  /**
   * 验证 API Key 是否有效
   */
  validateApiKey(): Promise<boolean>;
  
  /**
   * 生成文本
   * @param params 请求参数
   */
  generateText(params: LLMRequestParams): Promise<LLMResponse>;
}

/**
 * LLM 服务抽象基类
 * 提供一些通用实现和工具方法
 */
export abstract class BaseLLMService implements ILLMService {
  protected apiKey: string;
  protected selectedModel: string;
  
  constructor(apiKey: string, selectedModel: string) {
    this.apiKey = apiKey;
    this.selectedModel = selectedModel;
  }
  
  /**
   * 获取提供商类型
   */
  abstract getProviderType(): LLMProviderType;
  
  /**
   * 获取可用模型列表
   */
  abstract getAvailableModels(): Promise<LLMModel[]>;
  
  /**
   * 验证 API Key 是否有效
   */
  abstract validateApiKey(): Promise<boolean>;
  
  /**
   * 生成文本
   * @param params 请求参数
   */
  abstract generateText(params: LLMRequestParams): Promise<LLMResponse>;
  
  /**
   * 替换提示词中的变量
   * @param prompt 提示词模板
   * @param pageInfo 页面信息
   */
  protected replacePromptVariables(prompt: string, pageInfo: LLMRequestParams['pageInfo']): string {
    return prompt
      .replace(/{{title}}/g, pageInfo.title || '')
      .replace(/{{url}}/g, pageInfo.url || '')
      .replace(/{{description}}/g, pageInfo.description || '');
  }
  
  /**
   * 处理网络错误
   * @param error 原始错误
   */
  protected handleNetworkError(error: any): never {
    // 处理请求被中止的情况
    if (error.name === 'AbortError') {
      throw new LLMError(getMessage('requestCancelled'), LLMErrorType.TIMEOUT);
    }
    
    // 处理网络错误
    if (error.message && error.message.includes('network')) {
      throw new LLMError(getMessage('networkConnectionError'), LLMErrorType.NETWORK_ERROR);
    }
    
    // 处理超时错误
    if (error.message && error.message.includes('timeout')) {
      throw new LLMError(getMessage('requestTimeout'), LLMErrorType.TIMEOUT);
    }
    
    // 处理其他未知错误
    throw new LLMError(
      getMessage('unknownErrorWithMessage', error.message || getMessage('noErrorMessage')), 
      LLMErrorType.UNKNOWN
    );
  }
  
  /**
   * 处理 API 响应错误
   * @param response 响应对象
   */
  protected async handleApiError(response: Response): Promise<never> {
    const statusCode = response.status;
    let errorMessage = getMessage('apiRequestFailed', statusCode.toString());
    let errorType = LLMErrorType.UNKNOWN;
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
      
      // 根据状态码和错误信息判断错误类型
      if (statusCode === 401) {
        errorType = LLMErrorType.INVALID_API_KEY;
        errorMessage = getMessage('invalidApiKeyOrExpired');
      } else if (statusCode === 429) {
        errorType = LLMErrorType.RATE_LIMIT;
        errorMessage = getMessage('rateLimitExceeded');
      } else if (statusCode === 400 && errorMessage.includes('context length')) {
        errorType = LLMErrorType.CONTEXT_LENGTH;
        errorMessage = getMessage('contextLengthExceeded');
      }
    } catch (e) {
      // 无法解析错误响应
    }
    
    throw new LLMError(errorMessage, errorType, statusCode);
  }
}
