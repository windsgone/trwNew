# LLM 生成 title

- prd
    
    # **📘 Tab Rename Wiz 插件：AI 自动生成 Tab Title 功能 - 产品需求文档（PRD）**
    
    ## **一、功能背景**
    
    为提升插件的智能体验并降低用户输入成本，我们将引入大语言模型（LLM）能力，为用户**自动生成合适的 Tab Title**。该功能允许用户一键生成标题，支持 Prompt 自定义、错误处理与 Key 配置管理。
    
    ---
    
    ## **二、功能目标**
    
    - 基于网页信息（title、meta、URL）使用 LLM 自动生成推荐 tab title。
    - 用户可自定义 system prompt 和 user prompt。
    - 用户需提供自己的 API Key 调用第三方模型服务（如 OpenAI），并且可以自己选择具体模型，如 gpt4o 或者 gpt4o-mini。
    - 提供稳定、安全、可交互的使用体验。
    - 保持插件轻量、私有，不涉及任何服务器存储。
    
    ---
    
    ## **三、功能详解**
    
    ### **1. AI 一键生成标题**
    
    | **项目** | **说明** |
    | --- | --- |
    | 按钮入口 | 在 title 输入框右侧添加按钮「✨AI生成」 |
    | 展示行为 | 点击后展示加载动画，生成完成后填入输入框，可修改 |
    | 使用前提 | 需设置 API Key 且页面内容允许获取（排除特殊页） |
    | 数据源 | <title>、meta 描述、URL |
    
    ---
    
    ### **2. Prompt 系统设计**
    
    ### **类型说明**
    
    | **类型** | **描述** | **示例** |
    | --- | --- | --- |
    | System Prompt | 设定 LLM 角色/风格 | “You are a helpful assistant…” |
    | User Prompt | 明确生成任务与语气 | “Generate a short and clear tab title…” |
    
    ### **默认值（英文）**
    
    ```
    System Prompt:
    You are a helpful assistant that summarizes webpage content to generate clear and concise tab titles. The language of the generated title should be the same as the original title language.
    
    User Prompt:
    Generate a short and descriptive tab title based on the {{title}} {{url}} {{descriptions}}. Prioritize clarity and recognizability.
    ```
    
    ### **用户配置界面**
    
    - 在设置页面提供两个多行输入框，可编辑 system prompt 和 user prompt。
    - 提供“恢复默认”按钮，点击后恢复为官方预设内容。
    - prompt 有最大长度限制（建议：3000 字符），不允许为空。
    
    ---
    
    ### **3. API Key 管理**
    
    ### **功能说明**
    
    - 在 options 页面增加左侧边导航栏，第一个是已保存的规则页面，第二个是 LLM API 配置页面
    - 插件不自带 API 服务接入，用户需自行填写 OpenAI API Key。
    - 提供模型选择功能，比如 gpt4o、gpt4o-mini 等模型。
    - 支持通过设置页填写、保存和删除。
    - 所有 Key 信息仅保存在 chrome.storage.local，不上传远程。
    - 第一版本只支持 OpenAI 的接口
    
    ### **交互细节**
    
    | **字段** | **描述** |
    | --- | --- |
    | API Key 输入框 | 密码类型，支持粘贴、手动输入 |
    | 保存按钮 | 保存 Key，校验格式（以 sk- 开头） |
    | 测试按钮 | 可发送验证请求检查是否可用（如调用 v1/models） |
    | 删除按钮 | 清除本地保存的 Key |
    | 提示文字 | “Key 仅本地存储，用于 AI 生成功能调用。” |
    
    ---
    
    ### **4. 用户操作流程（交互）**
    
    ### **正常流程**
    
    1. 用户设置 API Key，保存成功。
    2. 在任意页面点击“✨AI生成”按钮。
    3. 插件读取当前网页的 title/meta/URL 等数据，调用 LLM。
    4. 成功后将生成内容填入输入框，显示提示“AI 已生成推荐标题”。
    5. 用户点击“保存”使修改正式生效。
    
    ### **异常流程**
    
    | **场景** | **行为** | **提示** |
    | --- | --- | --- |
    | 未填写 API Key | 禁止调用 | “请先设置 API Key” |
    | Key 错误 / 失效 | 捕获 401 | “API Key 无效，请检查设置” |
    | 页面无有效信息 | 不发起调用 | “当前页面信息不足，建议手动填写” |
    | 请求超时 / 网络异常 | 捕获错误 | “网络异常，生成失败，请稍后重试” |
    | 用户多次点击 | 请求抖动控制 | 禁用按钮 2s + loading 动画 |
    
    ---
    
    ### **5. 设置页面结构变更（新增）**
    
    ### **新增字段区域：AI 设置**
    
    | **名称** | **类型** | **功能** |
    | --- | --- | --- |
    | API Key 输入 | 密码框 | 保存并验证用户 Key |
    | 测试 Key 按钮 | 按钮 | 验证可用性 |
    | 清除 Key 按钮 | 按钮 | 删除 Key |
    | System Prompt | 多行文本框 | 自定义 LLM 行为 |
    | User Prompt | 多行文本框 | 自定义任务指令 |
    | 恢复默认 | 按钮 | 重置 prompt 为默认值 |
    | 错误提示 | 文本 | Prompt 为空或超长限制提示 |
    
    ---
    
    ## **四、多语言支持**
    
    - 所有新增 UI 字符串使用 _locales/*/messages.json 统一管理。
    - 支持语言：英文、简体中文、繁体中文、法语、德语、西语、葡语、日语、韩语。
    - Prompt 默认用英文，用户可自行填入其他语言。
    
    ---
    
    ## **五、技术建议**
    
    | **项目** | **建议实现方式** |
    | --- | --- |
    | 模型调用 | OpenAI GPT-3.5 / GPT-4 via fetch |
    | API 调用管理 | 支持中止上一个请求（AbortController） |
    | 本地存储 | chrome.storage.local |
    | 防重复提交 | 按钮状态管理 + 防抖控制 |
    | 安全性 | API Key 不展示明文 + 不远程上传 |
    
    ---
    
    ## **六、后续迭代计划（非 MVP 阶段）**
    
    - 支持多个推荐标题结果，用户选择最满意的一个。
    - 提供生成风格模板（如“简洁”、“创意”、“专业”等）。
    - 支持调用其他服务（如 Claude）。
- 实现
    
    ## **实现方案**
    
    **1. 架构设计**
    
    **1.1 模块划分**
    
    - **API 调用模块**：处理 OpenAI API 的调用和响应
    - **数据管理模块**：管理 API Key、模型选择和 Prompt 配置
    - **网页内容提取模块**：获取当前标签页的 title、meta 描述和 URL
    - **国际化模块**：处理多语言支持
    
    **1.2 数据流设计**
    
    - 用户点击"✨AI生成"按钮 → 提取网页信息 → 构建 Prompt → 调用 API → 处理响应 → 更新 UI
    
    **2. 存储设计**
    
    ```tsx
    interface LLMSettings {
      active_provider: string; // 当前选择的提供商
      providers: {
        [providerName: string]: {
          api_key: string;
          models: string[];
          selected_model: string;
          system_prompt: string;
          user_prompt: string;
        }
      };
    }
    
    // 存储在 chrome.storage.local 中
    {
      tab_rename_rules: [...], // 现有数据
      recent_emojis: [...],    // 现有数据
      llm_settings: LLMSettings
    }
    ```
    
    **3. 具体功能实现**
    
    **3.1 UI 改造**
    
    - 在 popup/index.html 中添加"✨AI生成"按钮
    - 在 options 页面添加左侧导航栏，增加 LLM API 配置页面
    - 添加 API Key 管理、模型选择和 Prompt 编辑区域
    
    **3.2 API 调用实现**
    
    - 创建 OpenAI API 调用工具函数
    - 实现请求中止和错误处理机制
    - 添加请求状态管理和防抖控制
    
    **3.3 网页内容提取**
    
    - 使用 chrome.tabs API 获取当前标签页信息
    - 通过 content script 提取 meta 描述信息
    
    **3.4 国际化支持**
    
    - 为所有新增 UI 元素添加多语言支持
    - 扩展现有的 i18n 工具函数
    
    ## **实现计划**
    
    **阶段一：基础架构搭建（5 天）**
    
    1. **创建 LLM 服务架构**（2 天）
        ◦ 实现接口定义和抽象类
        ◦ 创建 OpenAI 提供商实现
        ◦ 实现 LLM 管理器
    2. **存储模块扩展**（1 天）
        ◦ 添加 LLM 设置存储功能
        ◦ 实现配置读写函数
    3. **页面信息获取**（2 天）
        ◦ 实现内容脚本提取 meta 信息
        ◦ 创建页面信息整合工具
    
    **阶段二：UI 开发（6 天）**
    
    1. **Popup 页面改造**（2 天）
        ◦ 添加 AI 生成按钮
        ◦ 实现生成功能和状态管理
    2. **Options 页面 - 基础结构**（2 天）
        ◦ 添加导航栏和页面切换
        ◦ 创建 LLM 设置页面框架
    3. **Options 页面 - 功能实现**（2 天）
        ◦ 实现提供商选择和配置
        ◦ 添加 API Key 管理和测试功能
        ◦ 实现 Prompt 编辑和重置功能
    
    **阶段三：国际化和优化（3 天）**
    
    1. **国际化支持**（1 天）
        ◦ 为新增 UI 元素添加多语言支持
        ◦ 更新翻译文件
    2. **错误处理和用户体验**（1 天）
        ◦ 完善错误提示和状态管理
        ◦ 优化加载动画和交互体验
    3. **性能优化**（1 天）
        ◦ 添加请求缓存和防抖控制
        ◦ 优化 API 调用性能
    
    **阶段四：测试和发布（2 天）**
    
    1. **集成测试**（1 天）
        ◦ 测试各个提供商的功能
        ◦ 测试错误处理和边缘情况
    2. **文档和发布准备**（1 天）
        ◦ 更新用户指南
        ◦ 准备发布材料
    
    后期再考虑迭代多供应商支持。
    
    ## **技术细节**
    
    **1. 文件结构变更**
    
    ```markdown
    src/
    ├── popup/
    │   ├── index.html (添加 AI 生成按钮)
    │   └── index.ts (添加 AI 生成功能)
    ├── options/
    │   ├── index.html (添加导航栏和 LLM 配置页面)
    │   ├── index.ts (添加页面切换逻辑)
    │   └── llm-settings.ts (处理 LLM 配置)
    ├── content/
    │   └── content-script.ts (提取页面 meta 信息)
    ├── utils/
    │   ├── storage.ts (扩展存储功能)
    │   ├── i18nUtils.ts (国际化工具)
    │   ├── page-info.ts (整合页面信息)
    │   └── llm/
    │       ├── types.ts (定义通用接口和类型)
    │       ├── llm-service.ts (抽象服务接口)
    │       ├── llm-manager.ts (统一管理接口)
    │       └── providers/
    │           ├── openai-provider.ts
    │           ├── claude-provider.ts
    │           ├── gemini-provider.ts
    │           └── provider-factory.ts (工厂方法)
    └── _locales/
        ├── en/
        │   └── messages.json (添加新 UI 文本)
        └── zh_CN/
            └── messages.json (添加新 UI 文本)
    ```
    
    **2. API 调用安全性考虑**
    
    - API Key 使用简单加密存储在本地
    - 所有 API 调用使用 HTTPS
    - 实现请求超时和重试机制
    - 添加请求频率限制，防止过度调用
    
    **3. 用户体验优化**
    
    - 添加加载动画，提高用户感知体验
    - 实现按钮状态管理，防止重复点击
    - 添加清晰的错误提示信息
    - 提供默认 Prompt 和恢复默认功能
    
    ## **风险与应对措施**
    
    1. **API 调用失败**
        ◦ 风险：API Key 无效、网络问题、服务器错误
        ◦ 应对：完善的错误处理和用户提示，提供重试机制
    2. **页面信息不足**
        ◦ 风险：某些页面可能缺少有效信息
        ◦ 应对：检测信息完整性，提示用户手动填写
    3. **用户体验问题**
        ◦ 风险：生成速度慢、结果不符合预期
        ◦ 应对：添加加载动画，提供 Prompt 自定义功能
    4. **安全问题**
        ◦ 风险：API Key 泄露
        ◦ 应对：仅本地存储，不上传服务器，使用简单加密