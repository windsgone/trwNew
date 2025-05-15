/**
 * 页面信息工具函数
 * 用于提取页面基本信息
 */

export interface PageInfo {
  title: string;
  url: string;
  domain: string;
  path: string;
  description: string;
}

/**
 * 提取页面的基本信息
 * @returns 页面基本信息对象
 */
export function getPageInfo(): PageInfo {
  // 获取当前URL对象
  const currentUrl = new URL(window.location.href);
  
  // 初始化页面信息对象
  const pageInfo: PageInfo = {
    title: document.title || '',
    url: window.location.href,
    domain: currentUrl.hostname,
    path: currentUrl.pathname,
    description: ''
  };

  // 提取描述信息
  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta) {
    pageInfo.description = descriptionMeta.getAttribute('content') || '';
  }

  return pageInfo;
}

/**
 * 获取页面完整信息并添加时间戳
 * @returns 带时间戳的页面信息对象
 */
export function getPageInfoWithTimestamp() {
  return {
    ...getPageInfo(),
    timestamp: Date.now()
  };
}
