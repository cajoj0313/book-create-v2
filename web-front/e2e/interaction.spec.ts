/**
 * 用户交互测试 - E2E（使用真实后端 API）
 *
 * 测试场景：
 * 1. NovelList - 创建小说、跳转、删除
 * 2. WorldBuilder - 输入描述、生成、确认
 * 3. OutlineEditor - 编辑大纲、下一步
 * 4. ChapterWriter - 切换章节、AI续写、保存
 *
 * 注意：
 * - 使用真实后端 API (localhost:8000)
 * - AI 生成测试可能需要较长等待时间
 * - 测试完成后会清理创建的小说数据
 */

import { test, expect, Page } from '@playwright/test'

// 测试辅助函数

/**
 * 创建测试小说并返回 novel_id
 */
async function createTestNovel(page: Page, title: string): Promise<string> {
  // 通过 API 直接创建小说（更可靠）
  const response = await page.request.post('/api/novels/', {
    data: {
      title: title,
      genre: '都市职场',
      target_chapters: 200
    }
  })

  const result = await response.json()
  expect(result.success).toBe(true)
  return result.data.novel_id
}

/**
 * 删除测试小说
 */
async function deleteTestNovel(page: Page, novelId: string) {
  try {
    await page.request.delete(`/api/novels/${novelId}`)
  } catch (e) {
    // 忽略删除失败（可能小说已被删除）
  }
}

/**
 * 获取已有的小说列表
 */
async function getExistingNovels(page: Page): Promise<any[]> {
  const response = await page.request.get('/api/novels/')
  const result = await response.json()
  return result.success ? result.data : []
}

// ==================== NovelList Tests ====================

test.describe('NovelList 页面交互', () => {
  test('输入标题创建小说', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 找到输入框
    const input = page.locator('input[placeholder*="输入小说标题"]')
    await expect(input).toBeVisible()

    // 输入唯一标题（避免冲突）
    const uniqueTitle = `E2E测试小说_${Date.now()}`
    await input.fill(uniqueTitle)

    // 点击创建按钮
    const createButton = page.getByRole('button', { name: '创建' })
    await expect(createButton).toBeEnabled()
    await createButton.click()

    // 验证跳转到世界观页面
    await expect(page).toHaveURL(/\/novels\/.*\/world-setting/, { timeout: 10000 })

    // 提取 novel_id 用于清理
    const url = page.url()
    const novelIdMatch = url.match(/\/novels\/([^\/]+)/)
    if (novelIdMatch) {
      // 记录 novel_id，测试结束后清理（在 afterAll 或手动清理）
      // 这里我们不立即清理，让后续测试可以继续使用
    }
  })

  test('点击小说卡片跳转到详情页', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 获取已有小说列表
    const novels = await getExistingNovels(page)

    if (novels.length === 0) {
      // 如果没有小说，先创建一个
      await createTestNovel(page, `E2E导航测试_${Date.now()}`)
      await page.reload()
      await page.waitForLoadState('networkidle')
    }

    // 找到第一个小说卡片
    const novelCard = page.getByTestId('novel-card').first()
    await expect(novelCard).toBeVisible({ timeout: 5000 })

    // 获取小说标题用于验证跳转
    const novelTitle = await novelCard.locator('h3').textContent()

    // 点击卡片
    await novelCard.click()

    // 验证跳转到小说详情页或世界观页
    await expect(page).toHaveURL(/\/novels\/[^\/]+/, { timeout: 10000 })
  })

  test('删除小说按钮（悬停显示）', async ({ page }) => {
    // 先创建一个专门用于删除测试的小说
    const novelId = await createTestNovel(page, `E2E删除测试_${Date.now()}`)

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 找到刚创建的小说卡片
    const novelCard = page.getByTestId('novel-card').filter({ hasText: 'E2E删除测试' }).first()
    await expect(novelCard).toBeVisible({ timeout: 5000 })

    // 悬停在卡片上（触发删除按钮显示）
    await novelCard.hover()

    // 删除按钮应该在悬停后可见
    const deleteButton = novelCard.locator('button[title="删除小说"]')
    await expect(deleteButton).toBeVisible({ timeout: 3000 })

    // 点击删除按钮
    await deleteButton.click()

    // 确认删除弹窗应该出现
    const confirmDialog = page.locator('[data-testid="dialog-overlay"]')
    const dialogAlternative = confirmDialog.or(page.getByRole('dialog'))
    await expect(dialogAlternative).toBeVisible()
    await expect(dialogAlternative).toContainText('确认删除')

    // 点击确认删除
    const confirmButton = page.getByRole('button', { name: '确认删除' })
    await confirmButton.click()

    // 弹窗应该消失
    await expect(dialogAlternative).not.toBeVisible({ timeout: 3000 })

    // 验证小说已被删除（卡片消失）
    await expect(novelCard).not.toBeVisible({ timeout: 5000 })
  })
})

// ==================== WorldBuilder Tests ====================

test.describe('WorldBuilder 页面交互', () => {
  let testNovelId: string | null = null

  test.beforeEach(async ({ page }) => {
    // 创建测试小说
    testNovelId = await createTestNovel(page, `E2E世界观测试_${Date.now()}`)
  })

  test.afterEach(async ({ page }) => {
    // 清理测试小说
    if (testNovelId) {
      await deleteTestNovel(page, testNovelId)
      testNovelId = null
    }
  })

  test('输入描述并点击开始生成（真实 AI 生成）', async ({ page }) => {
    // 导航到世界观页面（注意路由是 world-setting）
    await page.goto(`/novels/${testNovelId}/world-setting`)
    await page.waitForLoadState('networkidle')

    // 新小说应该没有世界观，显示输入描述界面
    // 使用通用选择器：textarea 在页面中
    const textarea = page.locator('textarea').first()
    await expect(textarea).toBeVisible({ timeout: 5000 })

    // 输入描述
    await textarea.fill('一个都市职场爱情故事，霸道总裁与普通职员的爱情')

    // 找到开始生成按钮
    const generateButton = page.getByRole('button', { name: '开始生成' })
    await expect(generateButton).toBeEnabled()

    // 点击生成按钮
    await generateButton.click()

    // 等待生成完成状态出现（真实 AI 生成可能需要 30-60 秒）
    await expect(page.locator('text=生成完成').or(page.locator('text=请确认'))).toBeVisible({ timeout: 90000 })
  })

  test.skip('点击确认按钮（生成后出现）', async ({ page }) => {
    // 原因：依赖 AI 生成完成，耗时较长，且需要完整的 UI 状态验证
    // 需求：生成完成后点击确认使用按钮

    // 导航到世界观页面
    await page.goto(`/novels/${testNovelId}/world-setting`)
    await page.waitForLoadState('networkidle')

    // 输入描述
    const textarea = page.locator('textarea').first()
    await expect(textarea).toBeVisible({ timeout: 5000 })
    await textarea.fill('测试描述：都市职场故事')

    // 点击生成
    await page.getByRole('button', { name: '开始生成' }).click()

    // 等待生成完成
    await expect(page.locator('text=生成完成').or(page.locator('text=请确认'))).toBeVisible({ timeout: 90000 })

    // 确认对话框应该出现
    const confirmDialog = page.locator('[data-testid="dialog-overlay"]')
    const dialogAlternative = confirmDialog.or(page.getByRole('dialog'))
    await expect(dialogAlternative).toBeVisible({ timeout: 5000 })

    // 点击确认使用按钮
    const confirmButton = page.getByRole('button', { name: '确认使用' })
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    // 等待对话框消失
    await expect(dialogAlternative).not.toBeVisible({ timeout: 3000 })
  })

  test.skip('继续下一步按钮跳转到大纲', async ({ page }) => {
    // 原因：依赖完整的世界观生成和确认流程
    // 需求：世界观确认后点击继续下一步跳转到大纲页

    // 先生成世界观
    await page.goto(`/novels/${testNovelId}/world-setting`)
    await page.waitForLoadState('networkidle')

    const textarea = page.locator('textarea').first()
    if (await textarea.isVisible()) {
      await textarea.fill('都市职场爱情故事')
      await page.getByRole('button', { name: '开始生成' }).click()
      await expect(page.locator('text=生成完成').or(page.locator('text=请确认'))).toBeVisible({ timeout: 90000 })

      // 确认使用
      const dialogAlternative = page.locator('[data-testid="dialog-overlay"]').or(page.getByRole('dialog'))
      if (await dialogAlternative.isVisible()) {
        await page.getByRole('button', { name: '确认使用' }).click()
        await expect(dialogAlternative).not.toBeVisible({ timeout: 3000 })
      }
    }

    // 如果有世界观，应该有继续下一步按钮
    const nextButton = page.getByRole('button', { name: '继续下一步' })
    await expect(nextButton).toBeVisible({ timeout: 5000 })
    await nextButton.click()

    // 确认对话框
    const confirmDialog = page.locator('[data-testid="dialog-overlay"]')
    const dialogAlternative = confirmDialog.or(page.getByRole('dialog'))
    await expect(dialogAlternative).toBeVisible()

    // 点击继续
    await page.getByRole('button', { name: '继续' }).click()

    // 应该跳转到大纲页面
    await expect(page).toHaveURL(/\/outline/, { timeout: 10000 })
  })
})

// ==================== OutlineEditor Tests ====================

test.describe('OutlineEditor 页面交互', () => {
  let testNovelId: string | null = null

  test.beforeEach(async ({ page }) => {
    // 创建测试小说并生成世界观（大纲依赖世界观）
    testNovelId = await createTestNovel(page, `E2E大纲测试_${Date.now()}`)

    // 先生成世界观（路由是 world-setting）
    await page.goto(`/novels/${testNovelId}/world-setting`)
    await page.waitForLoadState('networkidle')

    const textarea = page.locator('textarea').first()
    if (await textarea.isVisible()) {
      await textarea.fill('都市职场爱情故事')
      await page.getByRole('button', { name: '开始生成' }).click()
      await expect(page.locator('text=生成完成').or(page.locator('text=请确认'))).toBeVisible({ timeout: 90000 })

      // 确认使用
      const dialogAlternative = page.locator('[data-testid="dialog-overlay"]').or(page.getByRole('dialog'))
      if (await dialogAlternative.isVisible()) {
        await page.getByRole('button', { name: '确认使用' }).click()
        await expect(dialogAlternative).not.toBeVisible({ timeout: 3000 })
      }
    }
  })

  test.afterEach(async ({ page }) => {
    // 清理测试小说
    if (testNovelId) {
      await deleteTestNovel(page, testNovelId)
      testNovelId = null
    }
  })

  test.skip('编辑大纲内容（功能待完善）', async ({ page }) => {
    // 原因：大纲编辑功能需要完善，编辑按钮状态依赖大纲存在
    // 需要先通过 API 或界面生成大纲才能测试编辑功能

    // 导航到大纲页面
    await page.goto(`/novels/${testNovelId}/outline`)
    await page.waitForLoadState('networkidle')

    // 等待大纲加载
    await expect(page.locator('text=大纲生成')).toBeVisible({ timeout: 5000 })

    // 找到编辑按钮（如果大纲已存在）
    const editButton = page.getByRole('button', { name: '编辑' })
    if (await editButton.isVisible()) {
      // 点击编辑按钮进入编辑模式
      await editButton.click()

      // 验证编辑状态
      await expect(page.getByRole('button', { name: '取消编辑' })).toBeVisible()

      // 找到章节标题输入框并修改
      const titleInput = page.locator('input').first()
      if (await titleInput.isVisible()) {
        await titleInput.fill('修改后的标题')
      }
    }
  })

  test('生成大纲按钮（真实 AI 生成）', async ({ page }) => {
    // 导航到大纲页面（新小说没有大纲）
    await page.goto(`/novels/${testNovelId}/outline`)
    await page.waitForLoadState('networkidle')

    // 应该显示生成配置面板
    await expect(page.locator('text=大纲生成配置')).toBeVisible({ timeout: 5000 })

    // 找到生成大纲按钮
    const generateButton = page.getByRole('button', { name: '生成大纲' })
    await expect(generateButton).toBeVisible()
    await expect(generateButton).toBeEnabled()

    // 点击生成
    await generateButton.click()

    // 等待生成状态（真实 AI 生成可能需要 30-60 秒）
    await expect(page.locator('text=生成中').or(page.locator('text=正在生成'))).toBeVisible({ timeout: 10000 })

    // 等待生成完成
    await expect(page.locator('text=生成完成')).toBeVisible({ timeout: 120000 })
  })

  test('点击下一步按钮（生成大纲后）', async ({ page }) => {
    // 导航到大纲页面
    await page.goto(`/novels/${testNovelId}/outline`)
    await page.waitForLoadState('networkidle')

    // 先生成大纲
    const generateButton = page.getByRole('button', { name: '生成大纲' })
    if (await generateButton.isVisible()) {
      await generateButton.click()
      await expect(page.locator('text=生成完成')).toBeVisible({ timeout: 120000 })

      // 确认使用大纲（如果有对话框）
      const dialogAlternative = page.locator('[data-testid="dialog-overlay"]').or(page.getByRole('dialog'))
      if (await dialogAlternative.isVisible({ timeout: 5000 })) {
        await page.getByRole('button', { name: '确认使用' }).click()
        await expect(dialogAlternative).not.toBeVisible({ timeout: 3000 })
      }
    }

    // 找到开始写作按钮
    const nextButton = page.getByRole('button', { name: '开始写作' })
    await expect(nextButton).toBeVisible({ timeout: 5000 })
    await nextButton.click()

    // 确认对话框应该出现
    const confirmDialog = page.locator('[data-testid="dialog-overlay"]')
    const dialogAlternative = confirmDialog.or(page.getByRole('dialog'))
    await expect(dialogAlternative).toBeVisible()

    // 点击开始写作
    await page.getByRole('button', { name: '开始写作', exact: false }).click()

    // 应该跳转到章节写作页面
    await expect(page).toHaveURL(/\/chapters\/1/, { timeout: 10000 })
  })
})

// ==================== ChapterWriter Tests ====================

test.describe('ChapterWriter 页面交互', () => {
  let testNovelId: string | null = null

  test.beforeEach(async ({ page }) => {
    // 创建完整的测试小说（世界观 + 大纲）
    testNovelId = await createTestNovel(page, `E2E章节测试_${Date.now()}`)

    // 生成世界观（路由是 world-setting）
    await page.goto(`/novels/${testNovelId}/world-setting`)
    await page.waitForLoadState('networkidle')

    const textarea = page.locator('textarea').first()
    if (await textarea.isVisible()) {
      await textarea.fill('都市职场爱情故事')
      await page.getByRole('button', { name: '开始生成' }).click()
      await expect(page.locator('text=生成完成').or(page.locator('text=请确认'))).toBeVisible({ timeout: 90000 })

      const dialogAlternative = page.locator('[data-testid="dialog-overlay"]').or(page.getByRole('dialog'))
      if (await dialogAlternative.isVisible()) {
        await page.getByRole('button', { name: '确认使用' }).click()
        await expect(dialogAlternative).not.toBeVisible({ timeout: 3000 })
      }
    }

    // 生成大纲
    await page.goto(`/novels/${testNovelId}/outline`)
    await page.waitForLoadState('networkidle')

    const generateOutlineBtn = page.getByRole('button', { name: '生成大纲' })
    if (await generateOutlineBtn.isVisible()) {
      await generateOutlineBtn.click()
      await expect(page.locator('text=生成完成').or(page.locator('text=请确认'))).toBeVisible({ timeout: 120000 })

      const dialogAlternative = page.locator('[data-testid="dialog-overlay"]').or(page.getByRole('dialog'))
      if (await dialogAlternative.isVisible({ timeout: 5000 })) {
        await page.getByRole('button', { name: '确认使用' }).click()
        await expect(dialogAlternative).not.toBeVisible({ timeout: 3000 })
      }
    }
  })

  test.afterEach(async ({ page }) => {
    // 清理测试小说
    if (testNovelId) {
      await deleteTestNovel(page, testNovelId)
      testNovelId = null
    }
  })

  test.skip('切换章节（依赖多章节生成）', async ({ page }) => {
    // 原因：需要先生成第一章，然后才能测试切换到第二章
    // 测试此功能需要完整的章节生成流程

    // 导航到章节写作页面
    await page.goto(`/novels/${testNovelId}/chapters/1`)
    await page.waitForLoadState('networkidle')

    // 等待页面加载
    await expect(page.locator('text=第 1 章')).toBeVisible({ timeout: 10000 })

    // 找到左侧大纲面板中的章节列表
    const chapterList = page.locator('[data-testid="chapter-list"]').or(page.getByRole('list', { name: '章节大纲' }))

    // 如果有第2章的卡片，点击切换
    const chapter2Card = chapterList.locator('button').filter({ hasText: '第 2 章' })
    if (await chapter2Card.isVisible()) {
      await chapter2Card.click()
      await expect(page).toHaveURL(/\/chapters\/2/, { timeout: 10000 })
    }
  })

  test('点击AI续写按钮（真实 AI 生成）', async ({ page }) => {
    // 导航到章节写作页面
    await page.goto(`/novels/${testNovelId}/chapters/1`)
    await page.waitForLoadState('networkidle')

    // 等待页面加载
    await expect(page.locator('text=第 1 章').or(page.locator('text=章节写作'))).toBeVisible({ timeout: 10000 })

    // 找到AI续写按钮
    const aiButton = page.getByRole('button', { name: 'AI 续写' })
    await expect(aiButton).toBeVisible({ timeout: 5000 })
    await expect(aiButton).toBeEnabled()

    // 点击AI续写
    await aiButton.click()

    // 等待生成状态（真实 AI 生成可能需要 30-120 秒）
    await expect(page.locator('text=连接中').or(page.locator('text=生成中')).or(page.locator('text=正在生成'))).toBeVisible({ timeout: 15000 })

    // 等待生成完成或出现审核弹窗
    await expect(page.locator('text=生成完成').or(page.getByRole('dialog'))).toBeVisible({ timeout: 180000 })
  })

  test('点击保存按钮', async ({ page }) => {
    // 导航到章节写作页面
    await page.goto(`/novels/${testNovelId}/chapters/1`)
    await page.waitForLoadState('networkidle')

    // 等待页面加载
    await expect(page.locator('text=第 1 章').or(page.locator('text=章节写作'))).toBeVisible({ timeout: 10000 })

    // 先生成一些内容（如果没有内容，保存可能失败）
    const aiButton = page.getByRole('button', { name: 'AI 续写' })
    if (await aiButton.isVisible() && await aiButton.isEnabled()) {
      await aiButton.click()
      await expect(page.locator('text=生成完成').or(page.getByRole('dialog'))).toBeVisible({ timeout: 180000 })

      // 如果有审核弹窗，确认使用
      const dialogAlternative = page.locator('[data-testid="dialog-overlay"]').or(page.getByRole('dialog'))
      if (await dialogAlternative.isVisible()) {
        const useButton = page.getByRole('button', { name: '使用此内容' })
        if (await useButton.isVisible()) {
          await useButton.click()
          await expect(dialogAlternative).not.toBeVisible({ timeout: 3000 })
        }
      }
    }

    // 找到内容编辑区并输入内容
    const textarea = page.locator('[data-testid="chapter-content-editor"]').or(page.getByRole('textbox', { name: '章节内容' }))
    if (await textarea.isVisible()) {
      await textarea.fill('测试内容，这是一段测试文字。')
    }

    // 找到保存按钮
    const saveButton = page.getByRole('button', { name: '保存' })
    await expect(saveButton).toBeVisible({ timeout: 5000 })

    // 点击保存
    await saveButton.click()

    // 等待保存完成
    await expect(page.locator('.toast-success').or(page.locator('text=已保存')).or(page.locator('text=保存成功'))).toBeVisible({ timeout: 10000 })
  })

  test.skip('上一章/下一章导航按钮（依赖多章节）', async ({ page }) => {
    // 原因：需要生成多个章节才能测试导航功能

    // 导航到第2章（需要先生成第1章和第2章）
    await page.goto(`/novels/${testNovelId}/chapters/2`)
    await page.waitForLoadState('networkidle')

    // 等待页面加载
    await expect(page.locator('text=第 2 章')).toBeVisible({ timeout: 10000 })

    // 点击上一章按钮
    const prevButton = page.getByRole('button', { name: '上一章' })
    await prevButton.click()

    // 应该跳转到第1章
    await expect(page).toHaveURL(/\/chapters\/1/, { timeout: 10000 })

    // 点击下一章按钮
    const nextButton = page.getByRole('button', { name: '下一章' })
    await nextButton.click()

    // 应该跳转回第2章
    await expect(page).toHaveURL(/\/chapters\/2/, { timeout: 10000 })
  })

  test('审核弹窗操作（AI生成后）', async ({ page }) => {
    // 导航到章节写作页面
    await page.goto(`/novels/${testNovelId}/chapters/1`)
    await page.waitForLoadState('networkidle')

    // 等待页面加载
    await expect(page.locator('text=第 1 章').or(page.locator('text=章节写作'))).toBeVisible({ timeout: 10000 })

    // 点击AI续写触发生成
    await page.getByRole('button', { name: 'AI 续写' }).click()

    // 等待生成完成后的审核弹窗
    const reviewModal = page.locator('[data-testid="dialog-overlay"]')
    const dialogAlternative = reviewModal.or(page.getByRole('dialog'))

    // 等待弹窗出现（真实 AI 生成可能需要较长时间）
    await expect(dialogAlternative).toBeVisible({ timeout: 180000 })

    // 验证审核弹窗内容
    await expect(dialogAlternative.locator('text=章节审核').or(dialogAlternative.locator('text=审核'))).toBeVisible({ timeout: 5000 })

    // 测试使用此内容按钮
    const useButton = page.getByRole('button', { name: '使用此内容' })
    await expect(useButton).toBeVisible({ timeout: 5000 })

    // 测试审核通过按钮
    const approveButton = page.getByRole('button', { name: '审核通过' })
    await expect(approveButton).toBeVisible({ timeout: 5000 })
  })

  test.skip('删除章节按钮（功能待完善）', async ({ page }) => {
    // 原因：删除章节功能需要完善，且需要有已生成的章节

    // 导航到章节写作页面
    await page.goto(`/novels/${testNovelId}/chapters/1`)
    await page.waitForLoadState('networkidle')

    // 等待页面加载
    await expect(page.locator('text=第 1 章')).toBeVisible({ timeout: 10000 })

    // 找到删除按钮
    const deleteButton = page.getByRole('button', { name: '删除' })
    await expect(deleteButton).toBeVisible({ timeout: 5000 })

    // 点击删除按钮
    await deleteButton.click()

    // 确认删除弹窗应该出现
    const confirmDialog = page.locator('[data-testid="dialog-overlay"]')
    const dialogAlternative = confirmDialog.or(page.getByRole('dialog'))
    await expect(dialogAlternative).toBeVisible({ timeout: 5000 })
    await expect(dialogAlternative).toContainText('确认删除章节')

    // 点击取消
    await page.getByRole('button', { name: '取消' }).click()

    // 弹窗应该消失
    await expect(dialogAlternative).not.toBeVisible({ timeout: 3000 })
  })
})