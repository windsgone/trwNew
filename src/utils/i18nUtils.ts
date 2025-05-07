/**
 * 国际化工具函数
 * 提供用于处理Chrome扩展国际化的实用函数
 */

/**
 * 获取本地化字符串
 * 
 * @param messageKey messages.json中定义的消息键
 * @param substitutions 要替换到消息中的字符串或字符串数组
 * @returns 本地化的字符串。如果找不到messageKey，则返回空字符串
 */
export function getMessage(messageKey: string, substitutions?: string | string[]): string {
  const message = chrome.i18n.getMessage(messageKey, substitutions);
  if (!message) {
    console.warn(`i18n: 未找到消息键 "${messageKey}" 或消息为空。`);
    // 返回chrome的默认值（空字符串）
  }
  return message;
}

/**
 * 根据data-i18n属性将本地化应用于DOM
 * 在DOM完全加载后调用此函数
 * 
 * - 文本内容: 使用 `data-i18n="messageKey"`
 * - 属性: 使用 `data-i18n-attributeName="messageKey"` (例如 `data-i18n-placeholder="key"`)
 * 
 * @param baseElement 要扫描本地化属性的基础元素。默认为 `document`
 */
export function applyLocalization(baseElement: Document | HTMLElement = document): void {
  // 本地化文本内容
  baseElement.querySelectorAll<HTMLElement>('[data-i18n]').forEach(element => {
    const messageKey = element.dataset.i18n;
    if (messageKey) {
      const localizedText = getMessage(messageKey);
      // 只有在实际找到消息且不为空时才设置
      // 以保留HTML中所需的任何后备文本
      if (localizedText) {
        element.textContent = localizedText;
      }
    }
  });

  // 本地化属性
  const attributePrefix = 'i18n';
  baseElement.querySelectorAll<HTMLElement>('*').forEach(element => {
    for (const dataAttrKey in element.dataset) {
      // 检查数据属性是否以我们的前缀开头（例如data-i18n-placeholder）
      if (dataAttrKey.startsWith(attributePrefix) && dataAttrKey.length > attributePrefix.length) {
        const targetAttributeName = dataAttrKey.substring(attributePrefix.length).toLowerCase(); // placeholder, title
        const messageKey = element.dataset[dataAttrKey];

        if (messageKey && targetAttributeName) {
          const localizedValue = getMessage(messageKey);
          if (localizedValue) {
            element.setAttribute(targetAttributeName, localizedValue);
          }
        }
      }
    }
  });
}

/**
 * 动态创建本地化的HTML元素
 * 
 * @param tagName 要创建的HTML元素标签名
 * @param messageKey 要用于元素文本内容的消息键
 * @param attributes 要应用于元素的属性对象
 * @returns 创建的HTML元素
 */
export function createLocalizedElement(
  tagName: string, 
  messageKey: string, 
  attributes?: Record<string, string>
): HTMLElement {
  const element = document.createElement(tagName);
  const localizedText = getMessage(messageKey);
  
  if (localizedText) {
    element.textContent = localizedText;
  }
  
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  return element;
}
