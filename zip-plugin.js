// zip-plugin.js
import { zip } from 'zip-a-folder';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, './dist');
const outZip = path.resolve(__dirname, './release/plugin.zip');

async function buildZip() {
  if (!fs.existsSync(distDir)) {
    console.error('❌ dist 文件夹不存在，请先运行 npm run build');
    process.exit(1);
  }

  // 确保 release 目录存在
  const releaseDir = path.dirname(outZip);
  if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir, { recursive: true });
    console.log('✅ 创建了 release 目录');
  }

  // 删除旧的 zip 文件（如果有）
  if (fs.existsSync(outZip)) {
    fs.unlinkSync(outZip);
  }

  await zip(distDir, outZip);
  console.log('✅ 插件已成功打包为 plugin.zip');
}

buildZip();
