# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: interaction.spec.ts >> ChapterWriter 页面交互 >> 点击AI续写按钮（真实 AI 生成）
- Location: e2e/interaction.spec.ts:469:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Test timeout of 30000ms exceeded while running "afterEach" hook.
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - banner [ref=e5]:
    - generic [ref=e7]:
      - button "← 返回" [ref=e8] [cursor=pointer]
      - generic [ref=e9]:
        - generic [ref=e10]: 世
        - heading "世界观构建" [level=1] [ref=e11]
  - main [ref=e12]:
    - generic [ref=e13]:
      - heading "输入小说背景描述" [level=2] [ref=e14]: 输入小说背景描述
      - generic [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]: 简短描述（必填）
          - textbox "例如：一个武侠世界的修仙故事，主角从世家子弟成长为宗师..." [ref=e19]: 都市职场爱情故事
        - generic [ref=e20]:
          - generic [ref=e21]: 故事走向偏好
          - combobox [ref=e22]:
            - option "经典成长线" [selected]
            - option "复仇逆袭"
            - option "轻松日常"
            - option "悬疑推理"
            - option "爱情甜蜜"
        - generic [ref=e23]:
          - button "连接中..." [disabled] [ref=e24]:
            - generic [ref=e25]: 连接中...
          - button "连接中..." [disabled] [ref=e27]:
            - generic [ref=e28]: 连接中...
    - generic [ref=e33]: 正在连接AI服务...
```

# Test source

```ts
  339 |     await page.waitForLoadState('networkidle')
  340 | 
  341 |     // 应该显示生成配置面板
  342 |     await expect(page.locator('text=大纲生成配置')).toBeVisible({ timeout: 5000 })
  343 | 
  344 |     // 找到生成大纲按钮
  345 |     const generateButton = page.getByRole('button', { name: '生成大纲' })
  346 |     await expect(generateButton).toBeVisible()
  347 |     await expect(generateButton).toBeEnabled()
  348 | 
  349 |     // 点击生成
  350 |     await generateButton.click()
  351 | 
  352 |     // 等待生成状态（真实 AI 生成可能需要 30-60 秒）
  353 |     await expect(page.locator('text=生成中').or(page.locator('text=正在生成'))).toBeVisible({ timeout: 10000 })
  354 | 
  355 |     // 等待生成完成
  356 |     await expect(page.locator('text=生成完成')).toBeVisible({ timeout: 120000 })
  357 |   })
  358 | 
  359 |   test('点击下一步按钮（生成大纲后）', async ({ page }) => {
  360 |     // 导航到大纲页面
  361 |     await page.goto(`/novels/${testNovelId}/outline`)
  362 |     await page.waitForLoadState('networkidle')
  363 | 
  364 |     // 先生成大纲
  365 |     const generateButton = page.getByRole('button', { name: '生成大纲' })
  366 |     if (await generateButton.isVisible()) {
  367 |       await generateButton.click()
  368 |       await expect(page.locator('text=生成完成')).toBeVisible({ timeout: 120000 })
  369 | 
  370 |       // 确认使用大纲（如果有对话框）
  371 |       const dialogAlternative = page.locator('[data-testid="dialog-overlay"]').or(page.getByRole('dialog'))
  372 |       if (await dialogAlternative.isVisible({ timeout: 5000 })) {
  373 |         await page.getByRole('button', { name: '确认使用' }).click()
  374 |         await expect(dialogAlternative).not.toBeVisible({ timeout: 3000 })
  375 |       }
  376 |     }
  377 | 
  378 |     // 找到开始写作按钮
  379 |     const nextButton = page.getByRole('button', { name: '开始写作' })
  380 |     await expect(nextButton).toBeVisible({ timeout: 5000 })
  381 |     await nextButton.click()
  382 | 
  383 |     // 确认对话框应该出现
  384 |     const confirmDialog = page.locator('[data-testid="dialog-overlay"]')
  385 |     const dialogAlternative = confirmDialog.or(page.getByRole('dialog'))
  386 |     await expect(dialogAlternative).toBeVisible()
  387 | 
  388 |     // 点击开始写作
  389 |     await page.getByRole('button', { name: '开始写作', exact: false }).click()
  390 | 
  391 |     // 应该跳转到章节写作页面
  392 |     await expect(page).toHaveURL(/\/chapters\/1/, { timeout: 10000 })
  393 |   })
  394 | })
  395 | 
  396 | // ==================== ChapterWriter Tests ====================
  397 | 
  398 | test.describe('ChapterWriter 页面交互', () => {
  399 |   let testNovelId: string | null = null
  400 | 
  401 |   test.beforeEach(async ({ page }) => {
  402 |     // 创建完整的测试小说（世界观 + 大纲）
  403 |     testNovelId = await createTestNovel(page, `E2E章节测试_${Date.now()}`)
  404 | 
  405 |     // 生成世界观（路由是 world-setting）
  406 |     await page.goto(`/novels/${testNovelId}/world-setting`)
  407 |     await page.waitForLoadState('networkidle')
  408 | 
  409 |     const textarea = page.locator('textarea').first()
  410 |     if (await textarea.isVisible()) {
  411 |       await textarea.fill('都市职场爱情故事')
  412 |       await page.getByRole('button', { name: '开始生成' }).click()
  413 |       await expect(page.locator('text=生成完成').or(page.locator('text=请确认'))).toBeVisible({ timeout: 90000 })
  414 | 
  415 |       const dialogAlternative = page.locator('[data-testid="dialog-overlay"]').or(page.getByRole('dialog'))
  416 |       if (await dialogAlternative.isVisible()) {
  417 |         await page.getByRole('button', { name: '确认使用' }).click()
  418 |         await expect(dialogAlternative).not.toBeVisible({ timeout: 3000 })
  419 |       }
  420 |     }
  421 | 
  422 |     // 生成大纲
  423 |     await page.goto(`/novels/${testNovelId}/outline`)
  424 |     await page.waitForLoadState('networkidle')
  425 | 
  426 |     const generateOutlineBtn = page.getByRole('button', { name: '生成大纲' })
  427 |     if (await generateOutlineBtn.isVisible()) {
  428 |       await generateOutlineBtn.click()
  429 |       await expect(page.locator('text=生成完成').or(page.locator('text=请确认'))).toBeVisible({ timeout: 120000 })
  430 | 
  431 |       const dialogAlternative = page.locator('[data-testid="dialog-overlay"]').or(page.getByRole('dialog'))
  432 |       if (await dialogAlternative.isVisible({ timeout: 5000 })) {
  433 |         await page.getByRole('button', { name: '确认使用' }).click()
  434 |         await expect(dialogAlternative).not.toBeVisible({ timeout: 3000 })
  435 |       }
  436 |     }
  437 |   })
  438 | 
> 439 |   test.afterEach(async ({ page }) => {
      |        ^ Test timeout of 30000ms exceeded while running "afterEach" hook.
  440 |     // 清理测试小说
  441 |     if (testNovelId) {
  442 |       await deleteTestNovel(page, testNovelId)
  443 |       testNovelId = null
  444 |     }
  445 |   })
  446 | 
  447 |   test.skip('切换章节（依赖多章节生成）', async ({ page }) => {
  448 |     // 原因：需要先生成第一章，然后才能测试切换到第二章
  449 |     // 测试此功能需要完整的章节生成流程
  450 | 
  451 |     // 导航到章节写作页面
  452 |     await page.goto(`/novels/${testNovelId}/chapters/1`)
  453 |     await page.waitForLoadState('networkidle')
  454 | 
  455 |     // 等待页面加载
  456 |     await expect(page.locator('text=第 1 章')).toBeVisible({ timeout: 10000 })
  457 | 
  458 |     // 找到左侧大纲面板中的章节列表
  459 |     const chapterList = page.locator('[data-testid="chapter-list"]').or(page.getByRole('list', { name: '章节大纲' }))
  460 | 
  461 |     // 如果有第2章的卡片，点击切换
  462 |     const chapter2Card = chapterList.locator('button').filter({ hasText: '第 2 章' })
  463 |     if (await chapter2Card.isVisible()) {
  464 |       await chapter2Card.click()
  465 |       await expect(page).toHaveURL(/\/chapters\/2/, { timeout: 10000 })
  466 |     }
  467 |   })
  468 | 
  469 |   test('点击AI续写按钮（真实 AI 生成）', async ({ page }) => {
  470 |     // 导航到章节写作页面
  471 |     await page.goto(`/novels/${testNovelId}/chapters/1`)
  472 |     await page.waitForLoadState('networkidle')
  473 | 
  474 |     // 等待页面加载
  475 |     await expect(page.locator('text=第 1 章').or(page.locator('text=章节写作'))).toBeVisible({ timeout: 10000 })
  476 | 
  477 |     // 找到AI续写按钮
  478 |     const aiButton = page.getByRole('button', { name: 'AI 续写' })
  479 |     await expect(aiButton).toBeVisible({ timeout: 5000 })
  480 |     await expect(aiButton).toBeEnabled()
  481 | 
  482 |     // 点击AI续写
  483 |     await aiButton.click()
  484 | 
  485 |     // 等待生成状态（真实 AI 生成可能需要 30-120 秒）
  486 |     await expect(page.locator('text=连接中').or(page.locator('text=生成中')).or(page.locator('text=正在生成'))).toBeVisible({ timeout: 15000 })
  487 | 
  488 |     // 等待生成完成或出现审核弹窗
  489 |     await expect(page.locator('text=生成完成').or(page.getByRole('dialog'))).toBeVisible({ timeout: 180000 })
  490 |   })
  491 | 
  492 |   test('点击保存按钮', async ({ page }) => {
  493 |     // 导航到章节写作页面
  494 |     await page.goto(`/novels/${testNovelId}/chapters/1`)
  495 |     await page.waitForLoadState('networkidle')
  496 | 
  497 |     // 等待页面加载
  498 |     await expect(page.locator('text=第 1 章').or(page.locator('text=章节写作'))).toBeVisible({ timeout: 10000 })
  499 | 
  500 |     // 先生成一些内容（如果没有内容，保存可能失败）
  501 |     const aiButton = page.getByRole('button', { name: 'AI 续写' })
  502 |     if (await aiButton.isVisible() && await aiButton.isEnabled()) {
  503 |       await aiButton.click()
  504 |       await expect(page.locator('text=生成完成').or(page.getByRole('dialog'))).toBeVisible({ timeout: 180000 })
  505 | 
  506 |       // 如果有审核弹窗，确认使用
  507 |       const dialogAlternative = page.locator('[data-testid="dialog-overlay"]').or(page.getByRole('dialog'))
  508 |       if (await dialogAlternative.isVisible()) {
  509 |         const useButton = page.getByRole('button', { name: '使用此内容' })
  510 |         if (await useButton.isVisible()) {
  511 |           await useButton.click()
  512 |           await expect(dialogAlternative).not.toBeVisible({ timeout: 3000 })
  513 |         }
  514 |       }
  515 |     }
  516 | 
  517 |     // 找到内容编辑区并输入内容
  518 |     const textarea = page.locator('[data-testid="chapter-content-editor"]').or(page.getByRole('textbox', { name: '章节内容' }))
  519 |     if (await textarea.isVisible()) {
  520 |       await textarea.fill('测试内容，这是一段测试文字。')
  521 |     }
  522 | 
  523 |     // 找到保存按钮
  524 |     const saveButton = page.getByRole('button', { name: '保存' })
  525 |     await expect(saveButton).toBeVisible({ timeout: 5000 })
  526 | 
  527 |     // 点击保存
  528 |     await saveButton.click()
  529 | 
  530 |     // 等待保存完成
  531 |     await expect(page.locator('.toast-success').or(page.locator('text=已保存')).or(page.locator('text=保存成功'))).toBeVisible({ timeout: 10000 })
  532 |   })
  533 | 
  534 |   test.skip('上一章/下一章导航按钮（依赖多章节）', async ({ page }) => {
  535 |     // 原因：需要生成多个章节才能测试导航功能
  536 | 
  537 |     // 导航到第2章（需要先生成第1章和第2章）
  538 |     await page.goto(`/novels/${testNovelId}/chapters/2`)
  539 |     await page.waitForLoadState('networkidle')
```