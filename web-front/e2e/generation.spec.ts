/**
 * 灵笔前端完整生成流程测试 - 使用真实后端 API
 *
 * 注意：此测试需要后端服务运行在 localhost:8000
 * 注意：测试 AI 生成流程需要真实 DashScope API，可能耗时较长
 */

import { test, expect } from '@playwright/test';

test.describe('生成流程测试（真实 API）', () => {
  // 设置较长的超时时间，因为涉及真实的 AI 生成
  test.setTimeout(120000);

  test.skip('完整生成流程', async ({ page }) => {
    // 跳过原因：此测试需要真实 DashScope API，耗时较长且消耗 API 配额
    // 如需运行，请移除 test.skip 并确保：
    // 1. 后端服务运行在 localhost:8000
    // 2. DashScope API Key 已配置
    // 3. 有足够的 API 配额

    // 1. 创建小说
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const titleInput = page.locator('input[type="text"]').first();
    await expect(titleInput).toBeVisible();

    // 使用带时间戳的标题避免重复
    const uniqueTitle = `测试小说_${Date.now()}`;
    await titleInput.fill(uniqueTitle);

    const createBtn = page.locator('button:has-text("创建")').first();
    await expect(createBtn).toBeEnabled();
    await createBtn.click();

    // 验证跳转到世界观页面
    await expect(page).toHaveURL(/\/novels\/.*\/world-setting/, { timeout: 15000 });

    // 2. 进入世界观页面并检查元素
    const textarea = page.locator('textarea').first();
    const genBtn = page.locator('button:has-text("生成"), button:has-text("开始")').first();

    await page.screenshot({ path: 'test-results/world_setting_initial.png' });

    // 验证关键元素存在
    await expect(textarea).toBeVisible();
    await expect(genBtn).toBeVisible();

    // 3. 输入描述
    await textarea.fill('一个武侠世界的修仙故事，主角从世家子弟成长为宗师');
    const textareaValue = await textarea.inputValue();
    expect(textareaValue).toContain('修仙故事');

    // 检查按钮状态
    const isDisabled = await genBtn.isDisabled();
    expect(isDisabled).toBe(false);

    // 4. 点击生成按钮
    await genBtn.click();

    // 5. 等待生成完成（AI 生成可能需要较长时间）
    // 等待确认按钮出现或生成结果出现
    const confirmBtns = page.locator('button:has-text("确认"), button:has-text("使用"), button:has-text("确定")');
    await expect(confirmBtns.first()).toBeVisible({ timeout: 60000 });

    await page.screenshot({ path: 'test-results/world_setting_generated.png' });

    // 6. 确认世界观
    await confirmBtns.first().click();

    // 验证跳转到大纲页面或其他下一步
    await page.screenshot({ path: 'test-results/after_confirm.png' });
  });

  test('创建小说并验证世界观页面元素', async ({ page }) => {
    // 此测试只验证页面元素，不涉及 AI 生成

    // 1. 访问首页
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 验证页面有创建小说的输入框
    const titleInput = page.locator('input[type="text"]').first();
    await expect(titleInput).toBeVisible();

    // 使用带时间戳的标题
    const uniqueTitle = `元素测试小说_${Date.now()}`;
    await titleInput.fill(uniqueTitle);

    // 点击创建
    const createBtn = page.locator('button:has-text("创建")').first();
    await expect(createBtn).toBeEnabled();
    await createBtn.click();

    // 验证跳转到世界观页面
    await expect(page).toHaveURL(/\/novels\/.*\/world-setting/, { timeout: 15000 });

    // 验证世界观页面关键元素
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();

    const genBtn = page.locator('button:has-text("生成"), button:has-text("开始")').first();
    await expect(genBtn).toBeVisible();

    // 截图保存当前状态
    await page.screenshot({ path: 'test-results/world_setting_elements.png' });
  });
});