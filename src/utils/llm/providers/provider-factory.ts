/**
 * LLM 提供商工厂
 * 用于创建不同的 LLM 服务实例
 */

import { LLMProviderType } from '../types';
import { ILLMService } from '../llm-service';
import { OpenAIService } from './openai-provider';

/**
 * 创建 LLM 服务实例
 * @param provider 提供商类型
 * @param apiKey API 密钥
 * @param selectedModel 选择的模型
 * @returns LLM 服务实例
 */
export function createLLMService(
  provider: LLMProviderType,
  apiKey: string,
  selectedModel?: string
): ILLMService {
  switch (provider) {
    case LLMProviderType.OPENAI:
      return new OpenAIService(apiKey, selectedModel);
    // 未来可以添加其他提供商的支持
    // case LLMProviderType.CLAUDE:
    //   return new ClaudeService(apiKey, selectedModel);
    default:
      throw new Error(`不支持的 LLM 提供商: ${provider}`);
  }
}
