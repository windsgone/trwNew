// 页面信息获取功能测试脚本
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// 扩展路径
const extensionPath = path.join(__dirname, '../dist');

// 测试网页URL
const TEST_URL = 'https://example.com';

async function runTest() {
  console.log('启动浏览器...');
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
    defaultViewport: null,
  });

  try {
    // 获取扩展背景页
    const targets = await browser.targets();
    const backgroundPageTarget = targets.find(
      (target) => target.type() === 'service_worker' && target.url().includes('chrome-extension://')
    );
    
    if (!backgroundPageTarget) {
      throw new Error('无法找到扩展的背景页');
    }
    
    // 创建一个新页面
    const page = await browser.newPage();
    
    // 导航到测试页面
    console.log(`导航到 ${TEST_URL}...`);
    await page.goto(TEST_URL, { waitUntil: 'networkidle2' });
    
    // 等待一段时间，确保内容脚本已加载并执行
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 获取扩展ID
    const extensionId = backgroundPageTarget.url().split('/')[2];
    console.log(`扩展ID: ${extensionId}`);
    
    // 打开扩展的弹出窗口
    const popupPage = await browser.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
    
    // 等待弹出窗口加载完成
    await popupPage.waitForSelector('body');
    
    // 检查存储中的页面信息
    const pageInfo = await popupPage.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.storage.local.get('page_info', (result) => {
          resolve(result.page_info || {});
        });
      });
    });
    
    // 输出页面信息
    console.log('存储的页面信息:');
    console.log(JSON.stringify(pageInfo, null, 2));
    
    // 检查是否包含example.com的信息
    const hasExampleInfo = Object.values(pageInfo).some(
      (info) => info.domain === 'example.com'
    );
    
    if (hasExampleInfo) {
      console.log('✅ 测试通过: 成功获取并存储了页面信息');
    } else {
      console.log('❌ 测试失败: 未找到example.com的页面信息');
    }
    
    // 关闭弹出窗口
    await popupPage.close();
    
  } catch (error) {
    console.error('测试过程中出现错误:', error);
  } finally {
    // 关闭浏览器
    await browser.close();
    console.log('测试完成');
  }
}

runTest();
