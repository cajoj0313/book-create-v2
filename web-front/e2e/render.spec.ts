/**
 * 页面渲染测试
 * 测试 6 个主要页面的基本渲染功能：
 * - 页面能正确加载
 * - 关键元素存在（标题、按钮、输入框）
 * - 无崩溃（无 console error）
 */

import { test, expect } from '@playwright/test';

// 测试小说 ID（测试前通过 API 创建）
let testNovelId: string;

// 测试前创建一个小说
test.beforeAll(async ({ request }) => {
  // 创建测试小说
  const response = await request.post('/api/novels', {
    data: {
      title: 'E2E测试小说',
      genre: '都市职场',
      target_chapters: 10,
    },
  });

  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  // API 返回格式: {success: true, data: {novel_id: "..."}}
  testNovelId = result.data?.novel_id || result.novel_id;
});

// 测试后删除小说
test.afterAll(async ({ request }) => {
  if (testNovelId) {
    await request.delete(`/api/novels/${testNovelId}`);
  }
});

test.describe('页面渲染测试', () => {
  // 监听 console 错误
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        // 排除 API 404 等正常错误（测试小说可能没有完整数据）
        const text = msg.text();
        if (!text.includes('404') && !text.includes('API Error') && !text.includes('加载失败')) {
          consoleErrors.push(text);
        }
      }
    });
  });

  // 1. NovelList 页面渲染（首页）
  test('NovelList 页面渲染', async ({ page }) => {
    await page.goto('/');

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 检查关键元素存在
    // 标题 "灵笔"
    await expect(page.locator('h1')).toContainText('灵笔');

    // 创建小说输入框
    const input = page.locator('input[type="text"]');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', /输入小说标题/);

    // 创建按钮
    const createBtn = page.locator('button').filter({ hasText: '创建' });
    await expect(createBtn).toBeVisible();

    // 无 console error
    expect(consoleErrors).toHaveLength(0);
  });

  // 2. NovelDetail 页面渲染
  test('NovelDetail 页面渲染', async ({ page }) => {
    await page.goto(`/novels/${testNovelId}`);

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 检查关键元素存在
    // 返回列表链接
    const backLink = page.locator('a, button').filter({ hasText: '返回列表' });
    await expect(backLink).toBeVisible();

    // Tab 导航按钮
    const overviewTab = page.locator('button').filter({ hasText: '概览' });
    await expect(overviewTab).toBeVisible();

    const charactersTab = page.locator('button').filter({ hasText: '人物关系' });
    await expect(charactersTab).toBeVisible();

    // 无 console error（页面崩溃级别的）
    expect(consoleErrors).toHaveLength(0);
  });

  // 3. WorldBuilder 页面渲染
  test('WorldBuilder 页面渲染', async ({ page }) => {
    await page.goto(`/novels/${testNovelId}/world-setting`);

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 检查关键元素存在
    // 标题
    await expect(page.locator('h1')).toContainText('世界观构建');

    // 返回按钮
    const backBtn = page.locator('button').filter({ hasText: '返回' });
    await expect(backBtn).toBeVisible();

    // 描述输入框（textarea）
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();

    // 生成按钮
    const generateBtn = page.locator('button').filter({ hasText: '开始生成' });
    await expect(generateBtn).toBeVisible();

    // AI随机生成按钮
    const randomBtn = page.locator('button').filter({ hasText: 'AI 随机生成' });
    await expect(randomBtn).toBeVisible();

    // 无 console error
    expect(consoleErrors).toHaveLength(0);
  });

  // 4. OutlineEditor 页面渲染
  test('OutlineEditor 页面渲染', async ({ page }) => {
    await page.goto(`/novels/${testNovelId}/outline`);

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 检查关键元素存在
    // 标题
    await expect(page.locator('h1')).toContainText('大纲');

    // 返回按钮
    const backBtn = page.locator('button').filter({ hasText: '返回' });
    await expect(backBtn).toBeVisible();

    // 生成按钮（如果没有大纲则显示生成按钮）
    const generateBtn = page.locator('button').filter({ hasText: '生成大纲' });
    await expect(generateBtn).toBeVisible();

    // 无 console error（页面崩溃级别的）
    expect(consoleErrors).toHaveLength(0);
  });

  // 5. ChapterWriter 页面渲染
  test('ChapterWriter 页面渲染', async ({ page }) => {
    await page.goto(`/novels/${testNovelId}/chapters`);

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 检查关键元素存在
    // 返回按钮
    const backBtn = page.locator('button').filter({ hasText: '返回' });
    await expect(backBtn).toBeVisible();

    // 章节相关元素（标题或章节选择器）
    const chapterTitle = page.locator('h1, h2').filter({ hasText: /章节|写作/ });
    await expect(chapterTitle).toBeVisible();

    // 无 console error
    expect(consoleErrors).toHaveLength(0);
  });

  // 6. ValidationReport 页面渲染
  test('ValidationReport 页面渲染', async ({ page }) => {
    await page.goto(`/novels/${testNovelId}/validation`);

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 检查关键元素存在
    // 返回按钮
    const backBtn = page.locator('button').filter({ hasText: '返回' });
    await expect(backBtn).toBeVisible();

    // 校验相关标题
    const validationTitle = page.locator('h1').filter({ hasText: /校验/ });
    await expect(validationTitle).toBeVisible();

    // 无 console error
    expect(consoleErrors).toHaveLength(0);
  });
});