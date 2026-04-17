# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: interaction.spec.ts >> WorldBuilder 页面交互 >> 输入描述并点击开始生成（真实 AI 生成）
- Location: e2e/interaction.spec.ts:175:3

# Error details

```
Test timeout of 30000ms exceeded.
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
          - textbox "例如：一个武侠世界的修仙故事，主角从世家子弟成长为宗师..." [ref=e19]: 一个都市职场爱情故事，霸道总裁与普通职员的爱情
        - generic [ref=e20]:
          - generic [ref=e21]: 故事走向偏好
          - combobox [ref=e22]:
            - option "经典成长线" [selected]
            - option "复仇逆袭"
            - option "轻松日常"
            - option "悬疑推理"
            - option "爱情甜蜜"
        - generic [ref=e23]:
          - button "开始生成" [ref=e24] [cursor=pointer]
          - button "AI 随机生成" [ref=e25] [cursor=pointer]
    - generic [ref=e27]:
      - generic [ref=e28]: ✓
      - generic [ref=e29]: 生成完成，请确认内容
  - generic [ref=e31]:
    - heading "确 确认使用此世界观？" [level=2] [ref=e32]:
      - generic [ref=e33]: 确
      - text: 确认使用此世界观？
    - generic [ref=e35]:
      - paragraph [ref=e36]:
        - strong [ref=e37]: "城市:"
        - text: 杭州
      - paragraph [ref=e38]:
        - strong [ref=e39]: "职场:"
        - text: 大型科技企业
      - paragraph [ref=e40]:
        - strong [ref=e41]: "男主:"
        - text: 沈砚 (集团联合创始人兼首席技术官)
      - paragraph [ref=e42]:
        - strong [ref=e43]: "女主:"
        - text: 许棠 (用户体验与无障碍设计组初级交互设计师)
      - paragraph [ref=e44]:
        - strong [ref=e45]: "核心冲突:"
        - text: 信任重构型冲突
    - generic [ref=e46]:
      - button "拒绝，重新生成" [ref=e47] [cursor=pointer]
      - button "确认使用" [ref=e48] [cursor=pointer]
```

# Test source

```ts
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
  126 |     const novelCard = page.getByTestId('novel-card').filter({ hasText: 'E2E删除测试' }).first()
  127 |     await expect(novelCard).toBeVisible({ timeout: 5000 })
  128 | 
  129 |     // 悬停在卡片上（触发删除按钮显示）
  130 |     await novelCard.hover()
  131 | 
  132 |     // 删除按钮应该在悬停后可见
  133 |     const deleteButton = novelCard.locator('button[title="删除小说"]')
  134 |     await expect(deleteButton).toBeVisible({ timeout: 3000 })
  135 | 
  136 |     // 点击删除按钮
  137 |     await deleteButton.click()
  138 | 
  139 |     // 确认删除弹窗应该出现
  140 |     const confirmDialog = page.locator('[data-testid="dialog-overlay"]')
  141 |     const dialogAlternative = confirmDialog.or(page.getByRole('dialog'))
  142 |     await expect(dialogAlternative).toBeVisible()
  143 |     await expect(dialogAlternative).toContainText('确认删除')
  144 | 
  145 |     // 点击确认删除
  146 |     const confirmButton = page.getByRole('button', { name: '确认删除' })
  147 |     await confirmButton.click()
  148 | 
  149 |     // 弹窗应该消失
  150 |     await expect(dialogAlternative).not.toBeVisible({ timeout: 3000 })
  151 | 
  152 |     // 验证小说已被删除（卡片消失）
  153 |     await expect(novelCard).not.toBeVisible({ timeout: 5000 })
  154 |   })
  155 | })
  156 | 
  157 | // ==================== WorldBuilder Tests ====================
  158 | 
  159 | test.describe('WorldBuilder 页面交互', () => {
  160 |   let testNovelId: string | null = null
  161 | 
  162 |   test.beforeEach(async ({ page }) => {
  163 |     // 创建测试小说
  164 |     testNovelId = await createTestNovel(page, `E2E世界观测试_${Date.now()}`)
  165 |   })
  166 | 
> 167 |   test.afterEach(async ({ page }) => {
      |        ^ Test timeout of 30000ms exceeded while running "afterEach" hook.
  168 |     // 清理测试小说
  169 |     if (testNovelId) {
  170 |       await deleteTestNovel(page, testNovelId)
  171 |       testNovelId = null
  172 |     }
  173 |   })
  174 | 
  175 |   test('输入描述并点击开始生成（真实 AI 生成）', async ({ page }) => {
  176 |     // 导航到世界观页面（注意路由是 world-setting）
  177 |     await page.goto(`/novels/${testNovelId}/world-setting`)
  178 |     await page.waitForLoadState('networkidle')
  179 | 
  180 |     // 新小说应该没有世界观，显示输入描述界面
  181 |     // 使用通用选择器：textarea 在页面中
  182 |     const textarea = page.locator('textarea').first()
  183 |     await expect(textarea).toBeVisible({ timeout: 5000 })
  184 | 
  185 |     // 输入描述
  186 |     await textarea.fill('一个都市职场爱情故事，霸道总裁与普通职员的爱情')
  187 | 
  188 |     // 找到开始生成按钮
  189 |     const generateButton = page.getByRole('button', { name: '开始生成' })
  190 |     await expect(generateButton).toBeEnabled()
  191 | 
  192 |     // 点击生成按钮
  193 |     await generateButton.click()
  194 | 
  195 |     // 等待生成完成状态出现（真实 AI 生成可能需要 30-60 秒）
  196 |     await expect(page.locator('text=生成完成').or(page.locator('text=请确认'))).toBeVisible({ timeout: 90000 })
  197 |   })
  198 | 
  199 |   test.skip('点击确认按钮（生成后出现）', async ({ page }) => {
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
```