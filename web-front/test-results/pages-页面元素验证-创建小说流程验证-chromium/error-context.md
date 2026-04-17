# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pages.spec.ts >> 页面元素验证 >> 创建小说流程验证
- Location: e2e/pages.spec.ts:50:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/novels\/.*\/world-setting/
Received string:  "http://localhost:3000/"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    14 × unexpected value "http://localhost:3000/"

```

# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e6]:
    - generic [ref=e7]: 笔
    - generic [ref=e8]:
      - heading "灵笔" [level=1] [ref=e9]
      - paragraph [ref=e10]: 都市言情小说生成器
  - generic [ref=e11]:
    - heading "创建新小说" [level=2] [ref=e12]: 创建新小说
    - generic [ref=e14]:
      - textbox "输入小说标题，如：霸道总裁的职场恋情..." [disabled] [ref=e15]: E2E测试小说_1776394321208
      - button "创建中" [disabled] [ref=e16]:
        - generic [ref=e17]: 创建中
    - paragraph [ref=e19]: 提示：创建后可使用 AI 随机生成世界观，或手动输入背景描述
  - generic [ref=e20]:
    - generic [ref=e22]: 空
    - paragraph [ref=e23]: 暂无小说作品
    - paragraph [ref=e24]: 创建新小说，开启您的都市言情创作之旅
```

# Test source

```ts
  1   | /**
  2   |  * 灵笔前端页面功能测试
  3   |  * 测试目标：
  4   |  * 1. NovelList 页面 - 创建小说功能
  5   |  * 2. WorldBuilder 页面 - 确认按钮检查
  6   |  * 3. 页面元素验证
  7   |  */
  8   | 
  9   | import { test, expect } from '@playwright/test';
  10  | 
  11  | test.describe('页面元素验证', () => {
  12  |   test.setTimeout(30000);
  13  | 
  14  |   test('NovelList 页面加载和元素验证', async ({ page }) => {
  15  |     test.setTimeout(15000);
  16  | 
  17  |     // 1. 测试首页（NovelList）
  18  |     await page.goto('/');
  19  |     await page.waitForLoadState('networkidle');
  20  | 
  21  |     // 截图用于调试
  22  |     await page.screenshot({ path: 'test-results/novel_list.png', fullPage: true });
  23  | 
  24  |     // 验证页面标题
  25  |     const title = await page.title();
  26  |     expect(title).toBeTruthy();
  27  |     expect(title.length).toBeGreaterThan(0);
  28  | 
  29  |     // 验证页面有按钮元素
  30  |     const buttons = page.locator('button');
  31  |     await expect(buttons.first()).toBeVisible();
  32  |     const buttonCount = await buttons.count();
  33  |     expect(buttonCount).toBeGreaterThan(0);
  34  | 
  35  |     // 验证有创建小说相关的按钮
  36  |     const createBtn = page.locator('button:has-text("创建"), button:has-text("新建")');
  37  |     const createBtnCount = await createBtn.count();
  38  |     expect(createBtnCount).toBeGreaterThan(0);
  39  | 
  40  |     // 验证有输入框
  41  |     const inputs = page.locator('input');
  42  |     const inputCount = await inputs.count();
  43  |     expect(inputCount).toBeGreaterThan(0);
  44  | 
  45  |     // 验证 React 根节点存在
  46  |     const root = page.locator('#root');
  47  |     await expect(root).toBeVisible();
  48  |   });
  49  | 
  50  |   test('创建小说流程验证', async ({ page }) => {
  51  |     await page.goto('/');
  52  |     await page.waitForLoadState('networkidle');
  53  | 
  54  |     // 查找标题输入框
  55  |     const titleInput = page.getByTestId('title-input');
  56  |     await expect(titleInput).toBeVisible();
  57  | 
  58  |     // 输入标题（必须先输入才能启用创建按钮）
  59  |     const uniqueTitle = `E2E测试小说_${Date.now()}`;
  60  |     await titleInput.fill(uniqueTitle);
  61  |     const inputValue = await titleInput.inputValue();
  62  |     expect(inputValue).toBe(uniqueTitle);
  63  | 
  64  |     // 查找创建按钮（现在应该已启用）
  65  |     const createBtn = page.getByTestId('create-button');
  66  |     await expect(createBtn).toBeEnabled();
  67  | 
  68  |     // 点击创建
  69  |     await createBtn.click();
  70  | 
  71  |     // 等待跳转到世界观页面
> 72  |     await expect(page).toHaveURL(/\/novels\/.*\/world-setting/, { timeout: 10000 });
      |                        ^ Error: expect(page).toHaveURL(expected) failed
  73  | 
  74  |     // 截图用于调试
  75  |     await page.screenshot({ path: 'test-results/create_novel.png', fullPage: true });
  76  |   });
  77  | 
  78  |   test('WorldBuilder 页面验证', async ({ page }) => {
  79  |     // 访问 WorldBuilder 页面（路由是 world-setting）
  80  |     await page.goto('/novels/test-novel/world-setting');
  81  |     await page.waitForLoadState('networkidle');
  82  |     await page.screenshot({ path: 'test-results/world_builder.png', fullPage: true });
  83  | 
  84  |     // 验证页面已加载
  85  |     const root = page.locator('#root');
  86  |     await expect(root).toBeVisible();
  87  | 
  88  |     // 验证有按钮元素
  89  |     const buttons = page.locator('button');
  90  |     const buttonCount = await buttons.count();
  91  |     expect(buttonCount).toBeGreaterThan(0);
  92  | 
  93  |     // 验证有确认相关按钮（确认/确定/使用）
  94  |     const confirmBtns = page.locator('button:has-text("确认"), button:has-text("确定"), button:has-text("使用")');
  95  |     // 注意：确认按钮可能需要生成完成后才可见，这里只验证按钮定位器存在
  96  |     expect(confirmBtns).toBeTruthy();
  97  | 
  98  |     // 验证有继续/下一步按钮
  99  |     const nextBtns = page.locator('button:has-text("继续"), button:has-text("下一步")');
  100 |     expect(nextBtns).toBeTruthy();
  101 |   });
  102 | });
```