/**
 * LLM 服务相关类型定义
 */

/**
 * LLM 提供商类型
 */
export enum LLMProviderType {
  OPENAI = 'openai',
  // CLAUDE = 'claude',
  // 未来可能支持的其他提供商
}

/**
 * LLM 模型信息
 */
export interface LLMModel {
  id: string;
  name: string;
  maxTokens?: number;
  description?: string;
}

/**
 * 页面信息，用于构建 prompt
 */
export interface PageInfo {
  url: string;
  title: string;
  description: string;
}

/**
 * LLM 请求参数
 */
export interface LLMRequestParams {
  systemPrompt: string;
  userPrompt: string;
  pageInfo: PageInfo;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

/**
 * LLM 响应结果
 */
export interface LLMResponse {
  content: string;
  provider: LLMProviderType;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

/**
 * LLM 错误类型
 */
export enum LLMErrorType {
  INVALID_API_KEY = 'invalid_api_key',
  RATE_LIMIT = 'rate_limit',
  CONTEXT_LENGTH = 'context_length',
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

/**
 * LLM 错误
 */
export class LLMError extends Error {
  type: LLMErrorType;
  statusCode?: number;
  
  constructor(message: string, type: LLMErrorType, statusCode?: number) {
    super(message);
    this.name = 'LLMError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

/**
 * LLM 设置
 */
export interface LLMSettings {
  activeProvider: LLMProviderType;
  providers: {
    [key in LLMProviderType]?: ProviderSettings;
  };
}

/**
 * 提供商设置
 */
export interface ProviderSettings {
  apiKey: string;
  models: string[];
  selectedModel: string;
  systemPrompt: string;
  userPrompt: string;
}

/**
 * 默认系统提示词
 */
export const DEFAULT_SYSTEM_PROMPT = 
  'You are a web page title optimization assistant. Your task is to rewrite original tab titles to make them more concise, informative, and easier to distinguish. Focus on extracting key information from the original title without fabricating content. Avoid generic or redundant terms and help users quickly identify each tab at a glance.The language of the generated title should be the same as the original title language.';

/**
 * 默认用户提示词
 */
export const DEFAULT_USER_PROMPT = 
  `Based on the original title: \`{{title}}\`, generate a new browser tab title that is:
  1. Concise (ideally under 60 characters);
  2. Clear and easy to distinguish;
  3. Stripped of generic modifiers (e.g., "Official Site", "Home", "Welcome");
  4. Focused on the topic if it's an article or news;
  5. Focused on core function if it's a tool or web app;
  6. Do not include summaries or unrelated information.`;
