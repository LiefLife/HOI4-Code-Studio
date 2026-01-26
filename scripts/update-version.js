#!/usr/bin/env node

/**
 * 统一版本号更新脚本
 * 从 Version 文件读取版本号并更新到所有相关文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目根目录
const ROOT_DIR = path.join(__dirname, '..');

// 版本文件路径
const VERSION_FILE = path.join(ROOT_DIR, 'Version');

// 需要更新的文件路径
const FILES_TO_UPDATE = {
  packageJson: path.join(ROOT_DIR, 'package.json'),
  packageLockJson: path.join(ROOT_DIR, 'package-lock.json'),
  cargoToml: path.join(ROOT_DIR, 'src-tauri', 'Cargo.toml'),
  cargoLock: path.join(ROOT_DIR, 'src-tauri', 'Cargo.lock'),
  homeVue: path.join(ROOT_DIR, 'src', 'views', 'Home.vue'),
  settingsVue: path.join(ROOT_DIR, 'src', 'views', 'Settings.vue'),
};

/**
 * 读取版本号
 */
function readVersion() {
  try {
    const version = fs.readFileSync(VERSION_FILE, 'utf8').trim();
    console.log(`📖 读取版本号: ${version}`);
    return version;
  } catch (error) {
    console.error('❌ 读取 Version 文件失败:', error.message);
    process.exit(1);
  }
}

/**
 * 更新 package.json
 */
function updatePackageJson(version) {
  try {
    const filePath = FILES_TO_UPDATE.packageJson;
    const content = fs.readFileSync(filePath, 'utf8');
    const pkg = JSON.parse(content);
    
    pkg.version = version;
    
    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`✅ 更新 package.json: ${version}`);
  } catch (error) {
    console.error('❌ 更新 package.json 失败:', error.message);
  }
}

/**
 * 更新 package-lock.json
 */
function updatePackageLockJson(version) {
  try {
    const filePath = FILES_TO_UPDATE.packageLockJson;
    if (!fs.existsSync(filePath)) {
      console.log('⚠️  package-lock.json 不存在，跳过');
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const pkg = JSON.parse(content);
    
    pkg.version = version;
    if (pkg.packages && pkg.packages['']) {
      pkg.packages[''].version = version;
    }
    
    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`✅ 更新 package-lock.json: ${version}`);
  } catch (error) {
    console.error('❌ 更新 package-lock.json 失败:', error.message);
  }
}

/**
 * 更新 Cargo.toml
 */
function updateCargoToml(version) {
  try {
    const filePath = FILES_TO_UPDATE.cargoToml;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 使用正则表达式替换 version 字段
    content = content.replace(
      /^version\s*=\s*"[^"]*"/m,
      `version = "${version}"`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 更新 Cargo.toml: ${version}`);
  } catch (error) {
    console.error('❌ 更新 Cargo.toml 失败:', error.message);
  }
}

/**
 * 更新 Cargo.lock
 */
function updateCargoLock(version) {
  try {
    const filePath = FILES_TO_UPDATE.cargoLock;
    if (!fs.existsSync(filePath)) {
      console.log('⚠️  Cargo.lock 不存在，跳过（将在下次构建时自动生成）');
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 更新 hoi4-code-studio 包的版本
    content = content.replace(
      /(\[\[package\]\]\s*name\s*=\s*"hoi4-code-studio"\s*version\s*=\s*")[^"]*(")/,
      `$1${version}$2`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 更新 Cargo.lock: ${version}`);
  } catch (error) {
    console.error('❌ 更新 Cargo.lock 失败:', error.message);
  }
}

/**
 * 更新 Vue 文件中的版本号
 */
function updateVueFile(filePath, version) {
  try {
    const fileName = path.basename(filePath);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 添加 v 前缀
    const versionWithV = `${version}`;
    
    // 替换 CURRENT_VERSION 常量
    content = content.replace(
      /const CURRENT_VERSION = ['"]v?[^'"]*['"]/,
      `const CURRENT_VERSION = '${versionWithV}'`
    );
    
    // 替换模板中的版本显示（Home.vue 中的版本号）
    if (fileName === 'Home.vue') {
      // 更精确的正则表达式，匹配版本号行
      content = content.replace(
        /(<div class="mt-\[1vh\] text-onedark-comment"[^>]*>)\s*v?[\d.-]+[a-z0-9-]*\s*(<\/div>)/,
        `$1\n        ${versionWithV}\n      $2`
      );
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 更新 ${fileName}: ${versionWithV}`);
  } catch (error) {
    console.error(`❌ 更新 ${path.basename(filePath)} 失败:`, error.message);
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始更新版本号...\n');
  
  // 读取版本号
  const version = readVersion();
  
  // 更新所有文件
  updatePackageJson(version);
  updatePackageLockJson(version);
  updateCargoToml(version);
  updateCargoLock(version);
  updateVueFile(FILES_TO_UPDATE.homeVue, version);
  updateVueFile(FILES_TO_UPDATE.settingsVue, version);
  
  console.log('\n✨ 版本号更新完成！');
  console.log(`📌 当前版本: ${version}`);
  console.log('\n💡 提示: 如果修改了 Cargo.toml，请运行 "npm run tauri build" 或 "cargo build" 来更新 Cargo.lock');
}

// 执行主函数
main();
