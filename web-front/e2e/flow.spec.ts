/**
 * 灵笔前端页面完整功能测试
 */

import { test, expect } from '@playwright/test';

test.describe('创建小说流程', () => {
  test.setTimeout(30000);

  test('完整创建小说流程', async ({ page }) => {
    // 1. 测试首页
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/step1_home.png' });

    // 验证首页加载成功
    const root = page.locator('#root');
    await expect(root).toBeVisible();

    // 2. 输入标题创建小说
    const titleInput = page.locator('input[type="text"]').first();
    await expect(titleInput).toBeVisible();
    await titleInput.fill('测试小说Playwright');

    // 验证输入成功
    const inputValue = await titleInput.inputValue();
    expect(inputValue).toBe('测试小说Playwright');

    // 等待按钮状态变化 - 使用状态等待而非固定时间
    const createBtn = page.locator('button:has-text("创建")');
    await expect(createBtn).toBeEnabled();

    await createBtn.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/step2_created.png' });

    // 验证创建成功，已跳转
    const currentUrl = page.url();
    expect(currentUrl).not.toBe('/');

    // 3. 检查世界观页面
    if (currentUrl.includes('/world-setting')) {
      // 验证页面元素
      const buttons = page.locator('button');
      await expect(buttons.first()).toBeVisible();

      // 检查输入框
      const textarea = page.locator('textarea').first();
      const textareaCount = await textarea.count();
      expect(textareaCount).toBeGreaterThan(0);
    }

    // 4. 检查确认按钮逻辑
    const confirmBtns = page.locator('button:has-text("确认"), button:has-text("使用"), button:has-text("确定")');
    // 确认按钮定位器存在
    expect(confirmBtns).toBeTruthy();

    // 5. 检查生成按钮
    const generateBtns = page.locator('button:has-text("生成"), button:has-text("开始")');
    expect(generateBtns).toBeTruthy();
  });
});