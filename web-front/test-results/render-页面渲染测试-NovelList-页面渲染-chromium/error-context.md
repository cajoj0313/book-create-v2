# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: render.spec.ts >> 页面渲染测试 >> NovelList 页面渲染
- Location: e2e/render.spec.ts:56:3

# Error details

```
"beforeAll" hook timeout of 30000ms exceeded.
```

# Test source

```ts
  1   | /**
  2   |  * 页面渲染测试
  3   |  * 测试 6 个主要页面的基本渲染功能：
  4   |  * - 页面能正确加载
  5   |  * - 关键元素存在（标题、按钮、输入框）
  6   |  * - 无崩溃（无 console error）
  7   |  */
  8   | 
  9   | import { test, expect } from '@playwright/test';
  10  | 
  11  | // 测试小说 ID（测试前通过 API 创建）
  12  | let testNovelId: string;
  13  | 
  14  | // 测试前创建一个小说
> 15  | test.beforeAll(async ({ request }) => {
      |      ^ "beforeAll" hook timeout of 30000ms exceeded.
  16  |   // 创建测试小说
  17  |   const response = await request.post('/api/novels', {
  18  |     data: {
  19  |       title: 'E2E测试小说',
  20  |       genre: '都市职场',
  21  |       target_chapters: 10,
  22  |     },
  23  |   });
  24  | 
  25  |   expect(response.ok()).toBeTruthy();
  26  |   const result = await response.json();
  27  |   // API 返回格式: {success: true, data: {novel_id: "..."}}
  28  |   testNovelId = result.data?.novel_id || result.novel_id;
  29  | });
  30  | 
  31  | // 测试后删除小说
  32  | test.afterAll(async ({ request }) => {
  33  |   if (testNovelId) {
  34  |     await request.delete(`/api/novels/${testNovelId}`);
  35  |   }
  36  | });
  37  | 
  38  | test.describe('页面渲染测试', () => {
  39  |   // 监听 console 错误
  40  |   let consoleErrors: string[] = [];
  41  | 
  42  |   test.beforeEach(async ({ page }) => {
  43  |     consoleErrors = [];
  44  |     page.on('console', (msg) => {
  45  |       if (msg.type() === 'error') {
  46  |         // 排除 API 404 等正常错误（测试小说可能没有完整数据）
  47  |         const text = msg.text();
  48  |         if (!text.includes('404') && !text.includes('API Error') && !text.includes('加载失败')) {
  49  |           consoleErrors.push(text);
  50  |         }
  51  |       }
  52  |     });
  53  |   });
  54  | 
  55  |   // 1. NovelList 页面渲染（首页）
  56  |   test('NovelList 页面渲染', async ({ page }) => {
  57  |     await page.goto('/');
  58  | 
  59  |     // 等待页面加载
  60  |     await page.waitForLoadState('networkidle');
  61  | 
  62  |     // 检查关键元素存在
  63  |     // 标题 "灵笔"
  64  |     await expect(page.locator('h1')).toContainText('灵笔');
  65  | 
  66  |     // 创建小说输入框
  67  |     const input = page.locator('input[type="text"]');
  68  |     await expect(input).toBeVisible();
  69  |     await expect(input).toHaveAttribute('placeholder', /输入小说标题/);
  70  | 
  71  |     // 创建按钮
  72  |     const createBtn = page.locator('button').filter({ hasText: '创建' });
  73  |     await expect(createBtn).toBeVisible();
  74  | 
  75  |     // 无 console error
  76  |     expect(consoleErrors).toHaveLength(0);
  77  |   });
  78  | 
  79  |   // 2. NovelDetail 页面渲染
  80  |   test('NovelDetail 页面渲染', async ({ page }) => {
  81  |     await page.goto(`/novels/${testNovelId}`);
  82  | 
  83  |     // 等待页面加载
  84  |     await page.waitForLoadState('networkidle');
  85  | 
  86  |     // 检查关键元素存在
  87  |     // 返回列表链接
  88  |     const backLink = page.locator('a, button').filter({ hasText: '返回列表' });
  89  |     await expect(backLink).toBeVisible();
  90  | 
  91  |     // Tab 导航按钮
  92  |     const overviewTab = page.locator('button').filter({ hasText: '概览' });
  93  |     await expect(overviewTab).toBeVisible();
  94  | 
  95  |     const charactersTab = page.locator('button').filter({ hasText: '人物关系' });
  96  |     await expect(charactersTab).toBeVisible();
  97  | 
  98  |     // 无 console error（页面崩溃级别的）
  99  |     expect(consoleErrors).toHaveLength(0);
  100 |   });
  101 | 
  102 |   // 3. WorldBuilder 页面渲染
  103 |   test('WorldBuilder 页面渲染', async ({ page }) => {
  104 |     await page.goto(`/novels/${testNovelId}/world-setting`);
  105 | 
  106 |     // 等待页面加载
  107 |     await page.waitForLoadState('networkidle');
  108 | 
  109 |     // 检查关键元素存在
  110 |     // 标题
  111 |     await expect(page.locator('h1')).toContainText('世界观构建');
  112 | 
  113 |     // 返回按钮
  114 |     const backBtn = page.locator('button').filter({ hasText: '返回' });
  115 |     await expect(backBtn).toBeVisible();
```