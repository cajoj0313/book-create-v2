/**
 * 灵笔前端页面功能测试
 * 测试目标：
 * 1. NovelList 页面 - 创建小说功能
 * 2. WorldBuilder 页面 - 确认按钮检查
 * 3. 页面元素探测
 */

import { test, expect } from '@playwright/test';

test.describe('页面元素探测', () => {
  test.setTimeout(30000);

  test('NovelList 页面加载和元素检查', async ({ page }) => {
    // 设置超时
    test.setTimeout(15000);

    console.log('='.repeat(50));
    console.log('灵笔前端页面测试');
    console.log('='.repeat(50));

    // 1. 测试首页（NovelList）
    console.log('\n[测试 1] NovelList 页面...');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 截图
    await page.screenshot({ path: 'test-results/novel_list.png', fullPage: true });
    console.log('✅ 页面加载成功，截图保存: test-results/novel_list.png');

    // 检查页面标题
    const title = await page.title();
    console.log(`页面标题: ${title}`);

    // 探测所有按钮
    const buttons = await page.locator('button').all();
    console.log(`发现按钮数量: ${buttons.length}`);

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      try {
        const text = await btn.innerText();
        const isDisabled = await btn.isDisabled();
        console.log(`  按钮 ${i + 1}: '${text}' (disabled: ${isDisabled})`);
      } catch {
        console.log(`  按钮 ${i + 1}: 无法获取文本`);
      }
    }

    // 检查是否有"创建小说"按钮
    const createBtn = page.locator('button:has-text("创建"), button:has-text("新建")');
    const createBtnCount = await createBtn.count();
    if (createBtnCount > 0) {
      console.log('✅ 发现创建按钮');
    } else {
      console.log('❌ 未发现创建按钮');
    }

    // 探测输入框
    const inputs = await page.locator('input').all();
    console.log(`发现输入框数量: ${inputs.length}`);

    // 探测链接
    const links = await page.locator('a').all();
    console.log(`发现链接数量: ${links.length}`);

    // 验证页面已加载
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('创建小说流程', async ({ page }) => {
    console.log('\n[测试 2] 创建小说流程...');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 查找创建小说的入口
    const createBtns = page.locator('button:has-text("创建")');
    const count = await createBtns.count();

    if (count > 0) {
      await createBtns.first().click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/create_novel.png', fullPage: true });
      console.log('✅ 点击创建按钮成功');

      // 检查是否有输入框
      const titleInput = page.locator('input[type="text"], input:not([type])');
      const inputCount = await titleInput.count();
      if (inputCount > 0) {
        console.log('✅ 发现标题输入框');
        // 尝试输入
        await titleInput.first().fill('测试小说');
        console.log('✅ 输入标题成功');
      } else {
        console.log('❌ 未发现标题输入框');
      }

      // 检查提交按钮
      const submitBtns = page.locator('button:has-text("确定"), button:has-text("提交"), button:has-text("创建")');
      const submitCount = await submitBtns.count();
      if (submitCount > 0) {
        console.log('✅ 发现提交按钮');
      } else {
        console.log('❌ 未发现提交/确认按钮 - 这是问题所在！');
      }
    } else {
      console.log('❌ 未发现创建按钮');
    }
  });

  test('DOM 结构分析', async ({ page }) => {
    console.log('\n[测试 3] DOM 结构分析...');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 获取页面内容
    const content = await page.content();

    // 检查是否有 React 根节点
    const root = page.locator('#root');
    const rootCount = await root.count();
    if (rootCount > 0) {
      const rootContent = await root.innerHTML();
      console.log(`Root 内容摘要: ${rootContent.substring(0, 200)}...`);
    }

    // 验证根节点存在
    expect(rootCount).toBeGreaterThan(0);
  });

  test('WorldBuilder 页面检查', async ({ page }) => {
    console.log('\n[测试 4] 测试 WorldBuilder 页面...');

    // 尝试访问 WorldBuilder 页面（需要先创建小说）
    await page.goto('/novels/test-novel/world-builder');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/world_builder.png', fullPage: true });
    console.log('✅ WorldBuilder 页面加载成功');

    // 检查关键按钮
    const allButtons = await page.locator('button').all();
    console.log(`WorldBuilder 按钮数量: ${allButtons.length}`);

    for (const btn of allButtons) {
      try {
        const text = await btn.innerText();
        console.log(`  按钮: '${text}'`);
      } catch {
        // 忽略无法获取文本的按钮
      }
    }

    // 检查确认相关按钮
    const confirmBtns = page.locator('button:has-text("确认"), button:has-text("确定"), button:has-text("使用")');
    const confirmCount = await confirmBtns.count();
    if (confirmCount > 0) {
      console.log('✅ 发现确认按钮');
    } else {
      console.log('❌ 未发现确认按钮 - 产品逻辑问题！');
    }

    // 检查继续按钮
    const nextBtns = page.locator('button:has-text("继续"), button:has-text("下一步")');
    const nextCount = await nextBtns.count();
    if (nextCount > 0) {
      console.log('⚠️ 发现继续/下一步按钮（但可能缺少确认步骤）');
    }

    console.log('\n' + '='.repeat(50));
    console.log('测试完成');
    console.log('='.repeat(50));
  });
});