# Tab Rename Wiz - 实现方案

---

# 1. 项目概述

## 目标
- 开发一款浏览器插件 Tab Rename Wiz
- 支持用户修改任意网页的 tab title 和 favicon
- 可持久保存规则，自动应用
- 上架 Chrome Web Store 和 Microsoft Edge Store

## 支持功能
- 修改 tab title
- 修改 tab favicon（使用 emoji 图标）
- 设定 URL 匹配规则（exact / startsWith / endsWith / contains）
- 保存多条规则并管理
- 国际化支持（多语言）
- 本地数据持久化（不考虑跨端同步）

---

# 2. 技术实现方案

## 技术选型
- 语言：TypeScript
- 界面开发：Vanilla JS + 简单 CSS
- 构建工具：Vite + vite-plugin-web-extension
- 插件框架：Chrome Extension Manifest v3
- 存储：chrome.storage.local
- 国际化：_locales + chrome.i18n
- favicon处理：emoji → canvas 转成 dataURL
- 兼容性：Chrome、Edge

## 项目结构

```plaintext
tab-rename-wiz/
├── public/
│   ├── _locales/
│   ├── icons/
│   └── manifest.json
├── src/
│   ├── background/
│   ├── content/
│   ├── popup/
│   ├── options/
│   ├── utils/
│   ├── types/
│   └── emoji/
└── vite.config.ts
```

## Manifest 配置
- permissions: tabs, scripting, storage, activeTab, webNavigation
- host_permissions: `<all_urls>`
- background: service_worker
- popup、options 单独页面

---

# 3. 主要模块设计

## 3.1 Background Script
- 监听 tabs 变化或页面加载完成
- 查找最佳匹配规则
- 发送消息给 content script 更新 title 和 favicon

## 3.2 Content Script
- 接收修改指令
- 修改 `<title>`
- 以 canvas 生成 favicon
- SPA 页面动态 DOM 监听 (MutationObserver)

## 3.3 Popup (添加新规则)
- 输入新的 tab title（必填）
- 选择 emoji （作为 favicon）
- 选择匹配模式（exact、startsWith、endsWith、contains）
- 输入/修改 URL pattern
- 保存为规则
- 支持 emoji 搜索，最近使用（LRU管理）
- 保存检查：防空值、防止在 chrome:// 等系统页面操作


### Popup 提交数据结构

```typescrip
interface CreateTabRuleInput {
  urlPattern: string;
  matchMode: 'exact' | 'startsWith' | 'endsWith' | 'contains';
  title: string;
  faviconEmoji: string;
}
```

## 3.4 Options 页面 (规则管理)
- 显示已存规则
- 显示：original title/favicon，自定义 title/favicon，匹配模式，URL pattern
- 只支持浏览和删除（删除确认）

---

# 4. 规则数据结构

```typescript
interface TabRule {
  id: string;
  urlPattern: string;
  matchMode: 'exact' | 'startsWith' | 'endsWith' | 'contains';
  title: string;
  faviconEmoji: string;
  originalTitle: string;
  originalFavicon: string;
  updatedAt: number;
}
```

- originalTitle/originalFavicon 仅初始抽取，后续不变

---

# 5. 匹配规则优先级逻辑

1. 匹配模式：exact > startsWith/endsWith > contains
2. URL pattern 长度：越长优先
3. 更新时间：运行时最新的优先

---

# 6. Emoji 转 Favicon 实现方案

```typescript
function emojiToFaviconDataUrl(emoji: string, size = 64): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${size * 0.8}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2);
  return canvas.toDataURL('image/png');
}
```

---