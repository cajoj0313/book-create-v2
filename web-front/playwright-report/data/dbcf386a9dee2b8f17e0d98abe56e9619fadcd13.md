# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: short-novel-mvp.spec.ts >> 短篇小说 MVP - 故事梗概功能 >> 故事梗概页面元素验证
- Location: e2e/short-novel-mvp.spec.ts:17:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/novels\/.*\/world-setting/
Received string:  "http://localhost:3000/"
Timeout: 15000ms

Call log:
  - Expect "toHaveURL" with timeout 15000ms
    19 × unexpected value "http://localhost:3000/"

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
      - textbox "输入小说标题，如：霸道总裁的职场恋情..." [disabled] [ref=e15]: MVP 测试小说_1776394343619
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
  2   |  * 短篇小说 MVP 功能测试
  3   |  *
  4   |  * 测试新增的功能：
  5   |  * 1. 故事梗概生成页面
  6   |  * 2. 章节批量拆分
  7   |  * 3. 4 阶段进度条组件
  8   |  *
  9   |  * 注意：此测试使用 Mock 数据，不涉及真实 AI 生成
  10  |  */
  11  | 
  12  | import { test, expect } from '@playwright/test';
  13  | 
  14  | test.describe('短篇小说 MVP - 故事梗概功能', () => {
  15  |   test.setTimeout(60000);
  16  | 
  17  |   test('故事梗概页面元素验证', async ({ page }) => {
  18  |     // 1. 访问首页并创建小说
  19  |     await page.goto('/');
  20  |     await page.waitForLoadState('networkidle');
  21  | 
  22  |     const titleInput = page.locator('input[type="text"]').first();
  23  |     await expect(titleInput).toBeVisible();
  24  | 
  25  |     const uniqueTitle = `MVP 测试小说_${Date.now()}`;
  26  |     await titleInput.fill(uniqueTitle);
  27  | 
  28  |     const createBtn = page.locator('button:has-text("创建")').first();
  29  |     await createBtn.click();
  30  | 
  31  |     // 验证跳转到世界观页面
> 32  |     await expect(page).toHaveURL(/\/novels\/.*\/world-setting/, { timeout: 15000 });
      |                        ^ Error: expect(page).toHaveURL(expected) failed
  33  | 
  34  |     // 2. 跳过世界观生成（ Mock 已有世界观）
  35  |     // 注：实际测试中需要先完成世界观和大纲才能进入故事梗概页面
  36  |     // 这里只验证页面元素存在
  37  | 
  38  |     // 3. 验证故事梗概页面元素（假设有测试数据）
  39  |     // 访问故事梗概页面
  40  |     const currentUrl = page.url();
  41  |     const novelId = currentUrl.split('/')[4];
  42  |     await page.goto(`/novels/${novelId}/synopsis`);
  43  | 
  44  |     // 等待页面加载
  45  |     await page.waitForLoadState('networkidle');
  46  | 
  47  |     // 验证页面标题
  48  |     const title = page.locator('h1:has-text("故事梗概")');
  49  |     await expect(title).toBeVisible();
  50  | 
  51  |     // 验证生成按钮存在
  52  |     const generateBtn = page.locator('button:has-text("开始生成故事梗概")');
  53  |     await expect(generateBtn).toBeVisible();
  54  | 
  55  |     // 验证提示信息存在
  56  |     const infoText = page.locator('text=故事梗概是完整的 3000-5000 字故事概要');
  57  |     await expect(infoText).toBeVisible();
  58  |   });
  59  | 
  60  |   test('4 阶段进度条组件验证', async ({ page }) => {
  61  |     // 1. 访问首页
  62  |     await page.goto('/');
  63  |     await page.waitForLoadState('networkidle');
  64  | 
  65  |     // 2. 创建小说
  66  |     const titleInput = page.locator('input[type="text"]').first();
  67  |     const uniqueTitle = `进度条测试_${Date.now()}`;
  68  |     await titleInput.fill(uniqueTitle);
  69  | 
  70  |     const createBtn = page.locator('button:has-text("创建")').first();
  71  |     await createBtn.click();
  72  | 
  73  |     // 验证跳转
  74  |     await expect(page).toHaveURL(/\/novels\/.*\/world-setting/, { timeout: 15000 });
  75  | 
  76  |     // 3. 获取小说 ID 并访问详情页
  77  |     const currentUrl = page.url();
  78  |     const novelId = currentUrl.split('/')[4];
  79  |     await page.goto(`/novels/${novelId}`);
  80  | 
  81  |     // 4. 验证进度条组件存在
  82  |     // 进度条应该包含 4 个阶段：世界观、大纲、故事梗概、章节
  83  |     // 使用更精确的选择器，匹配进度条中的阶段按钮
  84  | 
  85  |     // 验证各阶段标签存在（在进度条组件中）
  86  |     // 使用 getByRole 匹配按钮
  87  |     await expect(page.getByRole('button', { name: /世界观/ }).first()).toBeVisible();
  88  |     await expect(page.getByRole('button', { name: /大纲/ }).first()).toBeVisible();
  89  |     await expect(page.getByRole('button', { name: /故事梗概/ }).first()).toBeVisible();
  90  |     await expect(page.getByRole('button', { name: /章节/ }).first()).toBeVisible();
  91  |   });
  92  | 
  93  |   test('世界观→大纲→故事梗概流程导航', async ({ page }) => {
  94  |     // 1. 创建小说
  95  |     await page.goto('/');
  96  |     await page.waitForLoadState('networkidle');
  97  | 
  98  |     const titleInput = page.locator('input[type="text"]').first();
  99  |     const uniqueTitle = `流程测试_${Date.now()}`;
  100 |     await titleInput.fill(uniqueTitle);
  101 | 
  102 |     const createBtn = page.locator('button:has-text("创建")').first();
  103 |     await createBtn.click();
  104 | 
  105 |     await expect(page).toHaveURL(/\/novels\/.*\/world-setting/, { timeout: 15000 });
  106 | 
  107 |     // 2. 获取小说 ID
  108 |     const currentUrl = page.url();
  109 |     const novelId = currentUrl.split('/')[4];
  110 | 
  111 |     // 3. 访问详情页查看进度
  112 |     await page.goto(`/novels/${novelId}`);
  113 |     await page.waitForLoadState('networkidle');
  114 | 
  115 |     // 4. 验证世界观阶段为"进行中"或"已完成"
  116 |     // 注：实际测试需要 Mock 后端数据
  117 |     // 这里只验证页面导航存在
  118 | 
  119 |     // 验证可以导航到世界观页面（使用更精确的选择器）
  120 |     const worldSettingLink = page.getByRole('button', { name: /世界观/ }).first();
  121 |     await expect(worldSettingLink).toBeVisible();
  122 | 
  123 |     // 验证可以导航到大纲页面
  124 |     const outlineLink = page.getByRole('button', { name: /大纲/ }).first();
  125 |     await expect(outlineLink).toBeVisible();
  126 | 
  127 |     // 验证可以导航到故事梗概页面
  128 |     const synopsisLink = page.getByRole('button', { name: /故事梗概/ }).first();
  129 |     await expect(synopsisLink).toBeVisible();
  130 |   });
  131 | });
  132 | 
```