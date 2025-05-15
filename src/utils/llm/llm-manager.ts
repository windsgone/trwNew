/**
 * LLM 管理器
 * 统一管理 LLM 服务的调用和配置
 */

import { 
  LLMProviderType, 
  LLMSettings, 
  LLMRequestParams, 
  LLMResponse, 
  LLMError, 
  LLMErrorType,
  PageInfo,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_USER_PROMPT
} from './types';
import { ILLMService } from './llm-service';
import { createLLMService } from './providers/provider-factory';

/**
 * LLM 管理器类
 * 负责管理 LLM 服务的创建、配置和调用
 */
export class LLMManager {
  private settings: LLMSettings | null = null;
  private activeService: ILLMService | null = null;
  private abortController: AbortController | null = null;
  
  /**
   * 初始化 LLM 管理器
   * @param settings LLM 设置
   */
  async initialize(settings?: LLMSettings): Promise<void> {
    if (settings) {
      this.settings = settings;
    } else {
      // 如果没有提供设置，尝试从存储中加载
      try {
        this.settings = await this.loadSettings();
      } catch (error) {
        console.error('加载 LLM 设置失败:', error);
        // 创建默认设置
        this.settings = this.createDefaultSettings();
      }
    }
    
    // 创建活跃的 LLM 服务
    await this.createActiveService();
  }
  
  /**
   * 生成文本
   * @param pageInfo 页面信息
   * @param options 可选参数
   */
  async generateText(
    pageInfo: PageInfo, 
    options?: { 
      maxTokens?: number; 
      temperature?: number; 
      timeoutMs?: number;
    }
  ): Promise<LLMResponse> {
    if (!this.settings || !this.activeService) {
      throw new LLMError('LLM 管理器未初始化', LLMErrorType.UNKNOWN);
    }
    
    const providerSettings = this.settings.providers[this.settings.activeProvider];
    if (!providerSettings) {
      throw new LLMError(`未找到提供商设置: ${this.settings.activeProvider}`, LLMErrorType.UNKNOWN);
    }
    
    // 取消之前的请求（如果有）
    this.cancelRequest();
    
    // 创建新的 AbortController
    this.abortController = new AbortController();
    
    // 设置超时
    const timeoutMs = options?.timeoutMs || 30000; // 默认 30 秒
    const timeoutId = setTimeout(() => {
      this.cancelRequest();
    }, timeoutMs);
    
    try {
      const params: LLMRequestParams = {
        systemPrompt: providerSettings.systemPrompt,
        userPrompt: providerSettings.userPrompt,
        pageInfo,
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
        signal: this.abortController.signal
      };
      
      const response = await this.activeService.generateText(params);
      return response;
    } finally {
      clearTimeout(timeoutId);
      this.abortController = null;
    }
  }
  
  /**
   * 取消当前请求
   */
  cancelRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
  
  /**
   * 验证 API Key
   * @param provider 提供商类型
   * @param apiKey API 密钥
   */
  async validateApiKey(provider: LLMProviderType, apiKey: string): Promise<boolean> {
    const service = createLLMService(provider, apiKey);
    return await service.validateApiKey();
  }
  
  /**
   * 更新设置
   * @param settings 新的设置
   */
  async updateSettings(settings: LLMSettings): Promise<void> {
    this.settings = settings;
    await this.saveSettings(settings);
    await this.createActiveService();
  }
  
  /**
   * 获取当前设置
   */
  getSettings(): LLMSettings | null {
    return this.settings;
  }
  
  /**
   * 从存储中加载设置
   */
  private async loadSettings(): Promise<LLMSettings> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['llm_settings'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        const settings = result.llm_settings as LLMSettings;
        if (!settings) {
          resolve(this.createDefaultSettings());
          return;
        }
        
        resolve(settings);
      });
    });
  }
  
  /**
   * 保存设置到存储
   * @param settings 要保存的设置
   */
  private async saveSettings(settings: LLMSettings): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ llm_settings: settings }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        resolve();
      });
    });
  }
  
  /**
   * 创建默认设置
   */
  private createDefaultSettings(): LLMSettings {
    return {
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
    };
  }
  
  /**
   * 创建活跃的 LLM 服务
   */
  private async createActiveService(): Promise<void> {
    if (!this.settings) {
      return;
    }
    
    const providerType = this.settings.activeProvider;
    const providerSettings = this.settings.providers[providerType];
    
    if (!providerSettings || !providerSettings.apiKey) {
      this.activeService = null;
      return;
    }
    
    this.activeService = createLLMService(
      providerType,
      providerSettings.apiKey,
      providerSettings.selectedModel
    );
  }
}

// 创建单例实例
export const llmManager = new LLMManager();
