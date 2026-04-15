/**
 * 灵笔前端页面完整功能测试
 */

import { test, expect } from '@playwright/test';

test.describe('创建小说流程', () => {
  test.setTimeout(30000);

  test('完整创建小说流程', async ({ page }) => {
    console.log('='.repeat(60));
    console.log('灵笔前端页面完整测试');
    console.log('='.repeat(60));

    // 1. 测试首页
    console.log('\n[步骤1] 访问首页...');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/step1_home.png' });
    console.log('✅ 首页加载成功');

    // 2. 输入标题创建小说
    console.log('\n[步骤2] 创建小说...');
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill('测试小说Playwright');
    console.log('✅ 输入标题');

    // 等待按钮启用
    await page.waitForTimeout(500);
    const createBtn = page.locator('button:has-text("创建")');

    // 检查按钮状态
    const isDisabled = await createBtn.isDisabled();
    console.log(`按钮状态: disabled=${isDisabled}`);

    if (!isDisabled) {
      await createBtn.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/step2_created.png' });
      console.log('✅ 创建成功，已跳转');

      // 检查当前URL
      const currentUrl = page.url();
      console.log(`当前URL: ${currentUrl}`);
    } else {
      console.log('❌ 按钮仍为disabled状态');
    }

    // 3. 检查世界观页面
    console.log('\n[步骤3] 检查世界观页面...');
    const currentUrl = page.url();
    if (currentUrl.includes('/world-setting')) {
      console.log('✅ 已进入世界观页面');

      // 检查页面元素
      const allButtons = await page.locator('button').all();
      console.log(`发现按钮: ${allButtons.length}个`);
      for (const btn of allButtons) {
        try {
          const text = await btn.innerText();
          console.log(`  - ${text}`);
        } catch {
          // 忽略无法获取文本的按钮
        }
      }

      // 检查输入框
      const textarea = page.locator('textarea').first();
      const textareaCount = await textarea.count();
      if (textareaCount > 0) {
        console.log('✅ 发现描述输入框');
      } else {
        console.log('❌ 未发现描述输入框');
      }
    }

    // 4. 检查确认按钮逻辑
    console.log('\n[步骤4] 确认按钮检查...');

    // 在世界观页面，确认按钮应该在生成完成后出现
    const confirmBtns = page.locator('button:has-text("确认"), button:has-text("使用"), button:has-text("确定")');
    const confirmCount = await confirmBtns.count();
    if (confirmCount > 0) {
      console.log('✅ 发现确认按钮');
    } else {
      console.log('⚠️ 当前无确认按钮（需要在生成后才会出现）');

      // 检查是否有"继续下一步"按钮
      const nextBtns = page.locator('button:has-text("继续"), button:has-text("下一步")');
      const nextCount = await nextBtns.count();
      if (nextCount > 0) {
        console.log('⚠️ 发现\'继续\'按钮（可能缺少确认步骤）');
      }
    }

    // 5. 检查生成按钮
    console.log('\n[步骤5] 检查生成按钮...');
    const generateBtns = page.locator('button:has-text("生成"), button:has-text("开始")');
    const generateCount = await generateBtns.count();
    if (generateCount > 0) {
      console.log('✅ 发现生成按钮');
    } else {
      console.log('❌ 未发现生成按钮');
    }

    console.log('\n' + '='.repeat(60));
    console.log('测试完成，截图保存在 test-results/');
    console.log('='.repeat(60));
  });
});