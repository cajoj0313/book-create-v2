# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: interaction.spec.ts >> OutlineEditor 页面交互 >> 点击下一步按钮（生成大纲后）
- Location: e2e/interaction.spec.ts:359:3

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
  200 |     // 原因：依赖 AI 生成完成，耗时较长，且需要完整的 UI 状态验证
  201 |     // 需求：生成完成后点击确认使用按钮
  202 | 
  203 |     // 导航到世界观页面
  204 |     await page.goto(`/novels/${testNovelId}/world-setting`)
  205 |     await page.waitForLoadState('networkidle')
  206 | 
  207 |     // 输入描述
  208 |     const textarea = page.locator('textarea').first()
  209 |     await expect(textarea).toBeVisible({ timeout: 5000 })
  210 |     await textarea.fill('测试描述：都市职场故事')
  211 | 
  212 |     // 点击生成
  213 |     await page.getByRole('button', { name: '开始生成' }).click()
  214 | 
  215 |     // 等待生成完成
  216 |     await expect(page.locator('text=生成完成').or(page.locator('text=请确认'))).toBeVisible({ timeout: 90000 })
  217 | 
  218 |     // 确认对话框应该出现
  219 |     const confirmDialog = page.locator('[data-testid="dialog-overlay"]')
  220 |     const dialogAlternative = confirmDialog.or(page.getByRole('dialog'))
  221 |     await expect(dialogAlternative).toBeVisible({ timeout: 5000 })
  222 | 
  223 |     // 点击确认使用按钮
  224 |     const confirmButton = page.getByRole('button', { name: '确认使用' })
  225 |     await expect(confirmButton).toBeVisible()
  226 |     await confirmButton.click()
  227 | 
  228 |     // 等待对话框消失
  229 |     await expect(dialogAlternative).not.toBeVisible({ timeout: 3000 })
  230 |   })
  231 | 
  232 |   test.skip('继续下一步按钮跳转到大纲', async ({ page }) => {
  233 |     // 原因：依赖完整的世界观生成和确认流程
  234 |     // 需求：世界观确认后点击继续下一步跳转到大纲页
  235 | 
  236 |     // 先生成世界观
  237 |     await page.goto(`/novels/${testNovelId}/world-setting`)
  238 |     await page.waitForLoadState('networkidle')
  239 | 
  240 |     const textarea = page.locator('textarea').first()
  241 |     if (await textarea.isVisible()) {
  242 |       await textarea.fill('都市职场爱情故事')
  243 |       await page.getByRole('button', { name: '开始生成' }).click()
  244 |       await expect(page.locator('text=生成完成').or(page.locator('text=请确认'))).toBeVisible({ timeout: 90000 })
  245 | 
  246 |       // 确认使用
  247 |       const dialogAlternative = page.locator('[data-testid="dialog-overlay"]').or(page.getByRole('dialog'))
  248 |       if (await dialogAlternative.isVisible()) {
  249 |         await page.getByRole('button', { name: '确认使用' }).click()
  250 |         await expect(dialogAlternative).not.toBeVisible({ timeout: 3000 })
  251 |       }
  252 |     }
  253 | 
  254 |     // 如果有世界观，应该有继续下一步按钮
  255 |     const nextButton = page.getByRole('button', { name: '继续下一步' })
  256 |     await expect(nextButton).toBeVisible({ timeout: 5000 })
  257 |     await nextButton.click()
  258 | 
  259 |     // 确认对话框
  260 |     const confirmDialog = page.locator('[data-testid="dialog-overlay"]')
  261 |     const dialogAlternative = confirmDialog.or(page.getByRole('dialog'))
  262 |     await expect(dialogAlternative).toBeVisible()
  263 | 
  264 |     // 点击继续
  265 |     await page.getByRole('button', { name: '继续' }).click()
  266 | 
  267 |     // 应该跳转到大纲页面
  268 |     await expect(page).toHaveURL(/\/outline/, { timeout: 10000 })
  269 |   })
  270 | })
  271 | 
  272 | // ==================== OutlineEditor Tests ====================
  273 | 
  274 | test.describe('OutlineEditor 页面交互', () => {
  275 |   let testNovelId: string | null = null
  276 | 
  277 |   test.beforeEach(async ({ page }) => {
  278 |     // 创建测试小说并生成世界观（大纲依赖世界观）
  279 |     testNovelId = await createTestNovel(page, `E2E大纲测试_${Date.now()}`)
  280 | 
  281 |     // 先生成世界观（路由是 world-setting）
  282 |     await page.goto(`/novels/${testNovelId}/world-setting`)
  283 |     await page.waitForLoadState('networkidle')
  284 | 
  285 |     const textarea = page.locator('textarea').first()
  286 |     if (await textarea.isVisible()) {
  287 |       await textarea.fill('都市职场爱情故事')
  288 |       await page.getByRole('button', { name: '开始生成' }).click()
  289 |       await expect(page.locator('text=生成完成').or(page.locator('text=请确认'))).toBeVisible({ timeout: 90000 })
  290 | 
  291 |       // 确认使用
  292 |       const dialogAlternative = page.locator('[data-testid="dialog-overlay"]').or(page.getByRole('dialog'))
  293 |       if (await dialogAlternative.isVisible()) {
  294 |         await page.getByRole('button', { name: '确认使用' }).click()
  295 |         await expect(dialogAlternative).not.toBeVisible({ timeout: 3000 })
  296 |       }
  297 |     }
  298 |   })
  299 | 
> 300 |   test.afterEach(async ({ page }) => {
      |        ^ Test timeout of 30000ms exceeded while running "afterEach" hook.
  301 |     // 清理测试小说
  302 |     if (testNovelId) {
  303 |       await deleteTestNovel(page, testNovelId)
  304 |       testNovelId = null
  305 |     }
  306 |   })
  307 | 
  308 |   test.skip('编辑大纲内容（功能待完善）', async ({ page }) => {
  309 |     // 原因：大纲编辑功能需要完善，编辑按钮状态依赖大纲存在
  310 |     // 需要先通过 API 或界面生成大纲才能测试编辑功能
  311 | 
  312 |     // 导航到大纲页面
  313 |     await page.goto(`/novels/${testNovelId}/outline`)
  314 |     await page.waitForLoadState('networkidle')
  315 | 
  316 |     // 等待大纲加载
  317 |     await expect(page.locator('text=大纲生成')).toBeVisible({ timeout: 5000 })
  318 | 
  319 |     // 找到编辑按钮（如果大纲已存在）
  320 |     const editButton = page.getByRole('button', { name: '编辑' })
  321 |     if (await editButton.isVisible()) {
  322 |       // 点击编辑按钮进入编辑模式
  323 |       await editButton.click()
  324 | 
  325 |       // 验证编辑状态
  326 |       await expect(page.getByRole('button', { name: '取消编辑' })).toBeVisible()
  327 | 
  328 |       // 找到章节标题输入框并修改
  329 |       const titleInput = page.locator('input').first()
  330 |       if (await titleInput.isVisible()) {
  331 |         await titleInput.fill('修改后的标题')
  332 |       }
  333 |     }
  334 |   })
  335 | 
  336 |   test('生成大纲按钮（真实 AI 生成）', async ({ page }) => {
  337 |     // 导航到大纲页面（新小说没有大纲）
  338 |     await page.goto(`/novels/${testNovelId}/outline`)
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
```