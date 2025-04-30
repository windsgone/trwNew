import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Tab Rename Wiz',
  version: '3.0.0',
  description: '修改浏览器标签页的标题和图标',
  default_locale: 'en',
  permissions: ['tabs', 'scripting', 'storage', 'activeTab', 'webNavigation'],
  host_permissions: ['<all_urls>'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
  },
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
  options_ui: {
    page: 'src/options/index.html',
    open_in_tab: true,
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [
    {
      // Allow web pages to load icons and JS assets (needed for CRXJS content script loading)
      resources: ['icons/*', 'assets/*.js'],
      matches: ['<all_urls>'],
    },
  ],
});
