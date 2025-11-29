/**
 * 主页的E2E测试
 */

import { test, expect } from '@playwright/test'

test.describe('主页功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('应该显示正确的页面标题', async ({ page }) => {
    await expect(page).toHaveTitle(/HOI4 Code Studio/)
  })

  test('应该显示主页内容', async ({ page }) => {
    // 检查是否显示了主页标题
    await expect(page.locator('h1, h2')).toContainText('HOI4')
    
    // 检查是否显示了创建项目按钮
    await expect(page.locator('button')).toContainText(/创建/)
  })

  test('应该能够点击创建项目按钮', async ({ page }) => {
    // 点击创建项目按钮
    await page.click('button:has-text("创建")')
    
    // 检查是否导航到了创建项目页面
    await expect(page).toHaveURL(/.*create/)
  })

  test('应该能够点击打开项目按钮', async ({ page }) => {
    // 点击打开项目按钮
    await page.click('button:has-text("打开")')
    
    // 可能会打开文件对话框（在实际测试中可能需要处理）
    // 或者导航到打开项目页面
  })

  test('应该显示最近项目列表', async ({ page }) => {
    // 检查是否有最近项目的容器
    await expect(page.locator('[data-testid="recent-projects"]')).toBeVisible()
    
    // 如果有最近项目，应该显示项目列表
    const projectItems = page.locator('[data-testid="recent-project-item"]')
    await expect(projectItems).toHaveCount(0) // 初始状态应该是空的
  })

  test('应该响应键盘快捷键', async ({ page }) => {
    // 测试 Ctrl+N 创建新项目
    await page.keyboard.press('Control+n')
    
    // 应该导航到创建项目页面
    await expect(page).toHaveURL(/.*create/)
  })

  test('应该在不同屏幕尺寸下正确显示', async ({ page }) => {
    // 测试移动端视图
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('h1, h2')).toBeVisible()
    
    // 测试平板视图
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('h1, h2')).toBeVisible()
    
    // 测试桌面视图
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page.locator('h1, h2')).toBeVisible()
  })

  test('应该正确处理主题切换', async ({ page }) => {
    // 检查主题切换按钮是否存在
    const themeToggle = page.locator('[data-testid="theme-toggle"]')
    
    if (await themeToggle.isVisible()) {
      // 点击主题切换按钮
      await themeToggle.click()
      
      // 检查页面是否应用了新的主题类
      const body = page.locator('body')
      await expect(body).toHaveClass(/theme-|dark|light/)
    }
  })

  test('应该显示正确的版本信息', async ({ page }) => {
    // 检查版本信息是否显示
    const versionInfo = page.locator('[data-testid="version-info"], .version')
    
    if (await versionInfo.isVisible()) {
      await expect(versionInfo).toContainText(/v\d+\.\d+\.\d+/)
    }
  })

  test('应该在错误时显示友好的错误页面', async ({ page }) => {
    // 模拟网络错误
    await page.route('**/api/**', route => {
      route.abort()
    })
    
    await page.reload()
    
    // 检查是否显示了错误信息
    const errorMessage = page.locator('text=/错误|Error|失败/')
    await expect(errorMessage).toBeVisible()
  })
})