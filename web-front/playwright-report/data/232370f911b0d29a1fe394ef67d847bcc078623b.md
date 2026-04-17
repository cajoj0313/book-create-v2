# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: interaction.spec.ts >> ChapterWriter 页面交互 >> 审核弹窗操作（AI生成后）
- Location: e2e/interaction.spec.ts:559:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: apiRequestContext.post: Target page, context or browser has been closed
Call log:
  - → POST http://localhost:3000/api/novels/
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.15 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br
    - content-type: application/json
    - content-length: 86

```

# Test source

```ts
  1   | /**
  2   |  * 用户交互测试 - E2E（使用真实后端 API）
  3   |  *
  4   |  * 测试场景：
  5   |  * 1. NovelList - 创建小说、跳转、删除
  6   |  * 2. WorldBuilder - 输入描述、生成、确认
  7   |  * 3. OutlineEditor - 编辑大纲、下一步
  8   |  * 4. ChapterWriter - 切换章节、AI续写、保存
  9   |  *
  10  |  * 注意：
  11  |  * - 使用真实后端 API (localhost:8000)
  12  |  * - AI 生成测试可能需要较长等待时间
  13  |  * - 测试完成后会清理创建的小说数据
  14  |  */
  15  | 
  16  | import { test, expect, Page } from '@playwright/test'
  17  | 
  18  | // 测试辅助函数
  19  | 
  20  | /**
  21  |  * 创建测试小说并返回 novel_id
  22  |  */
  23  | async function createTestNovel(page: Page, title: string): Promise<string> {
  24  |   // 通过 API 直接创建小说（更可靠）
> 25  |   const response = await page.request.post('/api/novels/', {
      |                                       ^ Error: apiRequestContext.post: Target page, context or browser has been closed
  26  |     data: {
  27  |       title: title,
  28  |       genre: '都市职场',
  29  |       target_chapters: 200
  30  |     }
  31  |   })
  32  | 
  33  |   const result = await response.json()
  34  |   expect(result.success).toBe(true)
  35  |   return result.data.novel_id
  36  | }
  37  | 
  38  | /**
  39  |  * 删除测试小说
  40  |  */
  41  | async function deleteTestNovel(page: Page, novelId: string) {
  42  |   try {
  43  |     await page.request.delete(`/api/novels/${novelId}`)
  44  |   } catch (e) {
  45  |     // 忽略删除失败（可能小说已被删除）
  46  |   }
  47  | }
  48  | 
  49  | /**
  50  |  * 获取已有的小说列表
  51  |  */
  52  | async function getExistingNovels(page: Page): Promise<any[]> {
  53  |   const response = await page.request.get('/api/novels/')
  54  |   const result = await response.json()
  55  |   return result.success ? result.data : []
  56  | }
  57  | 
  58  | // ==================== NovelList Tests ====================
  59  | 
  60  | test.describe('NovelList 页面交互', () => {
  61  |   test('输入标题创建小说', async ({ page }) => {
  62  |     await page.goto('/')
  63  |     await page.waitForLoadState('networkidle')
  64  | 
  65  |     // 找到输入框
  66  |     const input = page.locator('input[placeholder*="输入小说标题"]')
  67  |     await expect(input).toBeVisible()
  68  | 
  69  |     // 输入唯一标题（避免冲突）
  70  |     const uniqueTitle = `E2E测试小说_${Date.now()}`
  71  |     await input.fill(uniqueTitle)
  72  | 
  73  |     // 点击创建按钮
  74  |     const createButton = page.getByRole('button', { name: '创建' })
  75  |     await expect(createButton).toBeEnabled()
  76  |     await createButton.click()
  77  | 
  78  |     // 验证跳转到世界观页面
  79  |     await expect(page).toHaveURL(/\/novels\/.*\/world-setting/, { timeout: 10000 })
  80  | 
  81  |     // 提取 novel_id 用于清理
  82  |     const url = page.url()
  83  |     const novelIdMatch = url.match(/\/novels\/([^\/]+)/)
  84  |     if (novelIdMatch) {
  85  |       // 记录 novel_id，测试结束后清理（在 afterAll 或手动清理）
  86  |       // 这里我们不立即清理，让后续测试可以继续使用
  87  |     }
  88  |   })
  89  | 
  90  |   test('点击小说卡片跳转到详情页', async ({ page }) => {
  91  |     await page.goto('/')
  92  |     await page.waitForLoadState('networkidle')
  93  | 
  94  |     // 获取已有小说列表
  95  |     const novels = await getExistingNovels(page)
  96  | 
  97  |     if (novels.length === 0) {
  98  |       // 如果没有小说，先创建一个
  99  |       await createTestNovel(page, `E2E导航测试_${Date.now()}`)
  100 |       await page.reload()
  101 |       await page.waitForLoadState('networkidle')
  102 |     }
  103 | 
  104 |     // 找到第一个小说卡片
  105 |     const novelCard = page.getByTestId('novel-card').first()
  106 |     await expect(novelCard).toBeVisible({ timeout: 5000 })
  107 | 
  108 |     // 获取小说标题用于验证跳转
  109 |     const novelTitle = await novelCard.locator('h3').textContent()
  110 | 
  111 |     // 点击卡片
  112 |     await novelCard.click()
  113 | 
  114 |     // 验证跳转到小说详情页或世界观页
  115 |     await expect(page).toHaveURL(/\/novels\/[^\/]+/, { timeout: 10000 })
  116 |   })
  117 | 
  118 |   test('删除小说按钮（悬停显示）', async ({ page }) => {
  119 |     // 先创建一个专门用于删除测试的小说
  120 |     const novelId = await createTestNovel(page, `E2E删除测试_${Date.now()}`)
  121 | 
  122 |     await page.goto('/')
  123 |     await page.waitForLoadState('networkidle')
  124 | 
  125 |     // 找到刚创建的小说卡片
```