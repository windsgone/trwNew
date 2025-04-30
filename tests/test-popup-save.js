import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 配置 ---
const EXTENSION_PATH = path.resolve(__dirname, '../dist'); // 确保指向打包后的插件目录
const TARGET_URL = 'https://fanfou.com/';
const TEST_URL_PATTERN = 'fanfou.com'; // 用于规则匹配
const TEST_EMOJI = '🧪'; // 
const TEST_TITLE = `${TEST_EMOJI} 饭否测试`; // 
// 预期生成的 Favicon Data URL (简化版 SVG)
const EXPECTED_FAVICON_URL = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${TEST_EMOJI}</text></svg>`;

// --- 辅助函数 ---
/**
 * 获取扩展的 Popup URL
 * @param {puppeteer.Browser} browser - Puppeteer 浏览器实例
 * @returns {Promise<string>} Popup 页面的 URL
 */
async function getPopupUrl(browser) {
  // 增加延时，等待 Service Worker 注册
  await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒

  const targets = await browser.targets();
  // 对于 MV3，查找 Service Worker target 来获取 extension ID
  const extensionTarget = targets.find(target => target.type() === 'service_worker');
  if (!extensionTarget) {
    throw new Error('Extension service worker not found.');
  }
  const partialExtensionUrl = extensionTarget.url() || '';
  const [, , extensionId] = partialExtensionUrl.split('/');
  if (!extensionId) {
      throw new Error('Could not extract extension ID.');
  }
  console.log(`[*] 插件 ID: ${extensionId}`);
  // 确保路径与 manifest.json 中的 action.default_popup 匹配
  return `chrome-extension://${extensionId}/src/popup/index.html`;
}

/**
 * 获取页面 Favicon 的 Href
 * @param {puppeteer.Page} page - Puppeteer 页面实例
 * @returns {Promise<string | null>} Favicon 的 href 属性值，如果找不到则返回 null
 */
async function getFaviconHref(page) {
    try {
        const faviconLink = await page.$('link[rel="icon"], link[rel="shortcut icon"]');
        if (!faviconLink) {
            console.warn('[-] Favicon link element not found.');
            return null;
        }
        const href = await faviconLink.evaluate(link => link.href);
        return href;
    } catch (error) {
        console.error('Error getting favicon href:', error);
        return null;
    }
}


// --- 测试主逻辑 ---
(async () => {
  let browser = null;
  console.log('');

  try {
    console.log(`[*] ${EXTENSION_PATH}`);
    browser = await puppeteer.launch({
      headless: false, // 
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`, // 
        `--load-extension=${EXTENSION_PATH}`, // 
        // '--enable-automation', // 
        // '--no-sandbox', // 
      ],
      defaultViewport: null, // 
      devtools: false, // 
    });
    console.log('');

    // 1. 
    const popupUrl = await getPopupUrl(browser);
    console.log(`[*] ${popupUrl}`);
    const popupPage = await browser.newPage();
    await popupPage.goto(popupUrl, { waitUntil: 'networkidle0' });
    console.log('');

    // 
    await popupPage.waitForSelector('#rule-form');
    await popupPage.waitForSelector('#urlPattern'); // 等待 URL 输入框
    await popupPage.waitForSelector('#title');
    await popupPage.waitForSelector('#save-btn');
    await popupPage.waitForSelector('#mode-contains'); // 等待 URL 模式按钮
    console.log('[*] Popup 表单元素已加载');

    // 展开 URL 设置区域
    await popupPage.waitForSelector('#toggle-url-btn', { visible: true });
    await popupPage.click('#toggle-url-btn');
    console.log('[*] 点击了 URL 切换按钮');
    await new Promise(resolve => setTimeout(resolve, 500)); // 增加延时

    // 2. 自动填写新的 URL 规则、title 和 emoji icon
    //  a. 选择 URL 匹配模式 "contains"
    // 等待按钮容器可见
    await popupPage.waitForSelector('#match-mode-buttons', { visible: true }); 
    console.log('[*] 匹配模式按钮容器已可见');
    // 直接尝试点击，Puppeteer click 会等待元素可点击
    // 修改为点击 label
    await popupPage.click('label:has(#mode-contains)'); 
    console.log('[*] 已选择 URL 匹配模式: contains');
    //  b. 填写 URL 规则
    await popupPage.waitForSelector('#urlPattern', { visible: true });
    await popupPage.click('#urlPattern', { clickCount: 3 }); // Triple-click to select all
    await popupPage.type('#urlPattern', TEST_URL_PATTERN);
    console.log(`[*] 已填写 URL 规则: ${TEST_URL_PATTERN}`);

    // --- Select Emoji --- 
    console.log('[*] 打开 Emoji 选择器...');
    await popupPage.waitForSelector('#favicon-preview', { visible: true });
    await popupPage.click('#favicon-preview');

    console.log('[*] 等待 Emoji 选择器加载...');
    await popupPage.waitForSelector('.emoji-picker', { visible: true });
    console.log('[*] Emoji 选择器已加载');

    console.log(`[*] 选择 Emoji: ${TEST_EMOJI}...`);
    const emojiXPath = `//div[contains(@class, 'emoji-picker')]//div[contains(@class, 'emoji-item') and normalize-space()='${TEST_EMOJI}']`;
    const emojiSelector = `xpath/${emojiXPath}`;

    // 直接使用 page.click，它会等待元素出现并可点击
    await popupPage.click(emojiSelector);
    console.log(`[*] 已点击 Emoji: ${TEST_EMOJI}`);

    console.log('[*] 等待 Emoji 选择器关闭...');
    await popupPage.waitForSelector('.emoji-picker', { hidden: true });
    console.log('[*] Emoji 选择器已关闭');
    // --- End Select Emoji --- 

    //  c. 填写标题 (包含 Emoji)
    await popupPage.waitForSelector('#title', { visible: true });
    await popupPage.click('#title', { clickCount: 3 }); // Triple-click to select all
    await popupPage.type('#title', TEST_TITLE);
    console.log(`[*] 已填写标题: ${TEST_TITLE}`);

    // 3. 点击保存
    await popupPage.waitForSelector('#save-btn', { visible: true });
    await popupPage.click('#save-btn');
    console.log('[*] 点击保存按钮');

    // 等待片刻让保存操作完成
    await new Promise(resolve => setTimeout(resolve, 500));

    // 检查存储内容
    const storageData = await popupPage.evaluate(async () => {
      try {
        const data = await chrome.storage.local.get(null); // 获取所有本地存储数据
        return { success: true, data: data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    console.log('[*] Chrome Storage 状态:', storageData.success ? '成功获取' : '获取失败');
    if (storageData.success) {
        console.log('[*] Chrome Storage 内容:', JSON.stringify(storageData.data, null, 2));
    } else {
        console.error('[!] 获取 Chrome Storage 时出错:', storageData.error);
    }

    await popupPage.close(); // 
    console.log('');

    // 4. 
    console.log(`[*] ${TARGET_URL}`);
    const targetPage = await browser.newPage();
    await targetPage.goto(TARGET_URL, { waitUntil: 'networkidle0' });
    console.log('');

    // 
    const actualTitle = await targetPage.title();
    console.log(`[*] ${actualTitle}`);
    assert.strictEqual(actualTitle, TEST_TITLE, ` ${TEST_TITLE}, ${actualTitle}`);
    console.log('');

    // 
    // 1 
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 
    const actualFaviconHref = await getFaviconHref(targetPage);
    console.log(`[*] ${actualFaviconHref}`);
    assert.strictEqual(actualFaviconHref, EXPECTED_FAVICON_URL, ` \n   ${EXPECTED_FAVICON_URL}\n   ${actualFaviconHref}`);
    console.log('');

    console.log('');

  } catch (error) {
    console.error(` ${error}`);
    // 
    // if (browser) {
    //   const pages = await browser.pages();
    //   if (pages.length > 0) {
    //     await pages[pages.length - 1].screenshot({ path: 'error_screenshot.png' });
    //     console.log('');
    //   }
    // }
  } finally {
    if (browser) {
      console.log('');
      await browser.close();
    }
  }
})();