/**
 * 用户交互测试 - E2E
 * 测试场景：
 * 1. NovelList - 创建小说、跳转、删除
 * 2. WorldBuilder - 输入描述、生成、确认
 * 3. OutlineEditor - 编辑大纲、下一步
 * 4. ChapterWriter - 切换章节、AI续写、保存
 */

import { test, expect, Page } from '@playwright/test'

// Mock 数据
const MOCK_NOVEL = {
  novel_id: 'test-novel-001',
  title: '测试小说',
  genre: '都市职场',
  target_chapters: 200,
  status: 'planning',
  completed_chapters: 0,
  word_count: 0,
  created_at: '2024-04-15T10:00:00Z',
  updated_at: '2024-04-15T10:00:00Z',
}

const MOCK_NOVEL_LIST = [MOCK_NOVEL]

const MOCK_WORLD_SETTING = {
  novel_id: 'test-novel-001',
  background: {
    city: '上海',
    workplace: '金融公司',
    workplace_name: '盛世集团',
  },
  male_lead: {
    name: '李晨',
    identity: '总裁',
    age: 32,
    appearance: '英俊潇洒，气质冷峻',
    personality: ['冷静', '果断', '深情'],
    occupation: '盛世集团总裁',
  },
  female_lead: {
    name: '苏婉',
    identity: '职员',
    age: 26,
    appearance: '清丽脱俗，温柔婉约',
    personality: ['温柔', '聪慧', '坚强'],
    occupation: '财务部助理',
  },
  main_conflict: {
    type: '职场地位',
    description: '男主与女主的职场地位差距导致误解',
  },
}

const MOCK_OUTLINE = {
  novel_id: 'test-novel-001',
  chapters: [
    {
      chapter_num: 1,
      title: '初遇',
      key_events: ['男主在公司遇到女主', '女主因失误被男主批评'],
      emotion_stage: '陌生',
      emotion_progress: '女主对男主产生敬畏',
    },
    {
      chapter_num: 2,
      title: '误会',
      key_events: ['男主误会女主行为', '女主委屈离开'],
      emotion_stage: '误解',
      emotion_progress: '两人关系紧张',
    },
  ],
  emotion_arc: [
    { range: '1-10', stage: '初识', emotion: '陌生', description: '两人初次相遇' },
    { range: '11-30', stage: '相知', emotion: '好感', description: '开始互相了解' },
  ],
  sweet_points: [
    { chapter: 5, type: '暧昧', detail: '男主为女主挡酒', emotion_level: 6 },
  ],
}

const MOCK_CHAPTER = {
  novel_id: 'test-novel-001',
  chapter_num: 1,
  title: '初遇',
  version: 1,
  created_at: '2024-04-15T10:00:00Z',
  content: '清晨的阳光透过玻璃窗洒进盛世集团的大厅...',
  word_count: 100,
}

// ==================== Helper Functions ====================

/**
 * Mock API 响应
 */
async function mockApiRoutes(page: Page) {
  // Mock 小说列表
  await page.route('**/api/novels/', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_NOVEL_LIST }),
      })
    } else if (route.request().method() === 'POST') {
      // 创建小说
      const body = route.request().postDataJSON()
      const newNovel = {
        ...MOCK_NOVEL,
        novel_id: `test-novel-${Date.now()}`,
        title: body.title,
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: newNovel }),
      })
    }
  })

  // Mock 单个小说
  await page.route('**/api/novels/test-novel-001', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_NOVEL }),
    })
  })

  // Mock 删除小说
  await page.route('**/api/novels/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    }
  })

  // Mock 世界观
  await page.route('**/api/novels/*/world-setting', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_WORLD_SETTING }),
      })
    } else if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { ...MOCK_WORLD_SETTING, ...body } }),
      })
    }
  })

  // Mock 大纲
  await page.route('**/api/novels/*/outline', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_OUTLINE }),
      })
    } else if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { ...MOCK_OUTLINE, ...body } }),
      })
    }
  })

  // Mock 章节
  await page.route('**/api/novels/*/chapters/1', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_CHAPTER }),
      })
    } else if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { ...MOCK_CHAPTER, content: body.content } }),
      })
    }
  })

  // Mock 章节 2（空章节）
  await page.route('**/api/novels/*/chapters/2', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Chapter not found' }),
      })
    }
  })

  // Mock 章节列表
  await page.route('**/api/novels/*/chapters', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [MOCK_CHAPTER] }),
    })
  })

  // Mock 人物库
  await page.route('**/api/novels/*/characters', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          novel_id: 'test-novel-001',
          characters: [
            {
              character_id: 'char-001',
              name: '李晨',
              role: '男主',
              age: 32,
              gender: '男',
              personality: ['冷静', '果断'],
            },
            {
              character_id: 'char-002',
              name: '苏婉',
              role: '女主',
              age: 26,
              gender: '女',
              personality: ['温柔', '聪慧'],
            },
          ],
        },
      }),
    })
  })

  // Mock SSE 生成流（世界观）
  await page.route('**/api/generation/world-setting/stream', async (route) => {
    const mockContent = JSON.stringify(MOCK_WORLD_SETTING)
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: `event: start\ndata: \n\nevent: chunk\ndata: ${mockContent}\n\nevent: complete\ndata: \n\n`,
    })
  })

  // Mock SSE 生成流（大纲）
  await page.route('**/api/generation/outline/stream', async (route) => {
    const mockContent = JSON.stringify(MOCK_OUTLINE)
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: `event: start\ndata: \n\nevent: chunk\ndata: ${mockContent}\n\nevent: complete\ndata: \n\n`,
    })
  })

  // Mock SSE 生成流（章节）
  await page.route('**/api/generation/chapter/stream', async (route) => {
    const mockContent = '清晨的阳光透过玻璃窗洒进盛世集团的大厅，苏婉提着公文包匆匆走进公司大门...'
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: `event: start\ndata: \n\nevent: chunk\ndata: ${mockContent}\n\nevent: complete\ndata: \n\n`,
    })
  })
}

// ==================== NovelList Tests ====================

test.describe('NovelList 页面交互', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page)
    await page.goto('/')
  })

  test('输入标题创建小说', async ({ page }) => {
    // 找到输入框
    const input = page.locator('input[placeholder*="输入小说标题"]')
    await expect(input).toBeVisible()

    // 输入标题
    await input.fill('我的测试小说')

    // 点击创建按钮
    const createButton = page.getByRole('button', { name: '创建' })
    await expect(createButton).toBeEnabled()
    await createButton.click()

    // 验证跳转到世界观页面
    await expect(page).toHaveURL(/\/novels\/.*\/world-setting/)
  })

  test('点击小说卡片跳转到详情页', async ({ page }) => {
    // 等待小说列表加载
    await page.waitForTimeout(500)

    // 找到小说卡片
    const novelCard = page.locator('.paper-hover').filter({ hasText: '测试小说' })
    await expect(novelCard).toBeVisible()

    // 点击卡片
    await novelCard.click()

    // 验证跳转到小说详情页
    await expect(page).toHaveURL(/\/novels\/test-novel-001/)
  })

  test('删除小说按钮（悬停显示）', async ({ page }) => {
    // 等待小说列表加载
    await page.waitForTimeout(500)

    // 找到小说卡片
    const novelCard = page.locator('.paper-hover').filter({ hasText: '测试小说' })
    await expect(novelCard).toBeVisible()

    // 悬停在卡片上（触发删除按钮显示）
    await novelCard.hover()

    // 删除按钮应该在悬停后可见
    const deleteButton = novelCard.locator('button[title="删除小说"]')
    await expect(deleteButton).toBeVisible()

    // 点击删除按钮
    await deleteButton.click()

    // 确认删除弹窗应该出现
    const confirmDialog = page.locator('.dialog-overlay')
    await expect(confirmDialog).toBeVisible()
    await expect(confirmDialog).toContainText('确认删除')

    // 点击确认删除
    const confirmButton = page.getByRole('button', { name: '确认删除' })
    await confirmButton.click()

    // 弹窗应该消失
    await expect(confirmDialog).not.toBeVisible()
  })
})

// ==================== WorldBuilder Tests ====================

test.describe('WorldBuilder 页面交互', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page)
  })

  test('输入描述并点击开始生成', async ({ page }) => {
    // 导航到世界观页面（使用已存在的小说）
    await page.goto('/novels/test-novel-001/world-builder')
    await page.waitForTimeout(500)

    // 如果已有世界观，页面可能不同。我们先测试无世界观的场景
    // 清除已有数据，模拟无世界观状态
    await page.route('**/api/novels/*/world-setting', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Not found' }),
        })
      }
    })

    // 重新加载页面
    await page.reload()
    await page.waitForTimeout(500)

    // 找到描述输入框
    const textarea = page.locator('textarea[placeholder*="武侠世界的修仙故事"]')
    await expect(textarea).toBeVisible()

    // 输入描述
    await textarea.fill('一个都市职场爱情故事，霸道总裁与普通职员的爱情')

    // 找到开始生成按钮
    const generateButton = page.getByRole('button', { name: '开始生成' })
    await expect(generateButton).toBeEnabled()

    // 点击生成按钮
    await generateButton.click()

    // 等待生成状态变化
    await page.waitForTimeout(1000)

    // 验证生成状态显示
    await expect(page.locator('text=生成完成')).toBeVisible()
  })

  test('点击确认按钮（生成后出现）', async ({ page }) => {
    // 导航到世界观页面
    await page.goto('/novels/test-novel-001/world-builder')
    await page.waitForTimeout(500)

    // 模拟生成完成状态（直接显示确认对话框）
    // 通过点击生成按钮触发
    await page.route('**/api/novels/*/world-setting', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Not found' }),
        })
      }
    })

    await page.reload()
    await page.waitForTimeout(500)

    // 输入描述并生成
    const textarea = page.locator('textarea[placeholder*="武侠世界的修仙故事"]')
    await textarea.fill('测试描述')
    await page.getByRole('button', { name: '开始生成' }).click()
    await page.waitForTimeout(1000)

    // 确认对话框应该出现
    const confirmDialog = page.locator('.dialog-overlay')
    await expect(confirmDialog).toBeVisible()

    // 点击确认使用按钮
    const confirmButton = page.getByRole('button', { name: '确认使用' })
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    // 弹窗应该消失或变成成功提示
    await page.waitForTimeout(500)
  })

  test('继续下一步按钮跳转到大纲', async ({ page }) => {
    // 导航到已有世界观页面
    await page.goto('/novels/test-novel-001/world-builder')
    await page.waitForTimeout(500)

    // 如果有世界观，应该有继续下一步按钮
    const nextButton = page.getByRole('button', { name: '继续下一步' })
    if (await nextButton.isVisible()) {
      await nextButton.click()

      // 确认对话框
      const confirmDialog = page.locator('.dialog-overlay')
      await expect(confirmDialog).toBeVisible()

      // 点击继续
      await page.getByRole('button', { name: '继续' }).click()

      // 应该跳转到大纲页面
      await expect(page).toHaveURL(/\/outline/)
    }
  })
})

// ==================== OutlineEditor Tests ====================

test.describe('OutlineEditor 页面交互', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page)
  })

  test('编辑大纲内容', async ({ page }) => {
    // 导航到大纲页面
    await page.goto('/novels/test-novel-001/outline')
    await page.waitForTimeout(500)

    // 等待大纲加载
    await expect(page.locator('text=大纲生成')).toBeVisible()

    // 找到编辑按钮（如果大纲已存在）
    const editButton = page.getByRole('button', { name: '编辑' })
    if (await editButton.isVisible()) {
      // 点击编辑按钮进入编辑模式
      await editButton.click()

      // 验证编辑状态
      await expect(page.getByRole('button', { name: '取消编辑' })).toBeVisible()

      // 找到章节标题输入框
      const titleInput = page.locator('input').filter({ hasText: '初遇' }).first()
      if (await titleInput.isVisible()) {
        // 修改标题
        await titleInput.fill('修改后的标题')
      }
    }
  })

  test('点击下一步按钮', async ({ page }) => {
    // 导航到大纲页面
    await page.goto('/novels/test-novel-001/outline')
    await page.waitForTimeout(500)

    // 等待大纲加载
    await expect(page.locator('text=大纲生成')).toBeVisible()

    // 找到开始写作按钮
    const nextButton = page.getByRole('button', { name: '开始写作' })
    if (await nextButton.isVisible()) {
      await nextButton.click()

      // 确认对话框应该出现
      const confirmDialog = page.locator('.dialog-overlay')
      await expect(confirmDialog).toBeVisible()

      // 点击开始写作
      await page.getByRole('button', { name: '开始写作', exact: false }).click()

      // 应该跳转到章节写作页面
      await expect(page).toHaveURL(/\/chapters\/1/)
    }
  })

  test('生成大纲按钮', async ({ page }) => {
    // Mock 无大纲状态
    await page.route('**/api/novels/*/outline', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Not found' }),
        })
      }
    })

    // 导航到大纲页面
    await page.goto('/novels/test-novel-001/outline')
    await page.waitForTimeout(500)

    // 应该显示生成配置面板
    await expect(page.locator('text=大纲生成配置')).toBeVisible()

    // 找到生成大纲按钮
    const generateButton = page.getByRole('button', { name: '生成大纲' })
    await expect(generateButton).toBeVisible()
    await expect(generateButton).toBeEnabled()

    // 点击生成
    await generateButton.click()

    // 等待生成状态
    await page.waitForTimeout(1000)
  })
})

// ==================== ChapterWriter Tests ====================

test.describe('ChapterWriter 页面交互', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page)
  })

  test('切换章节', async ({ page }) => {
    // 导航到章节写作页面
    await page.goto('/novels/test-novel-001/chapters/1')
    await page.waitForTimeout(500)

    // 等待页面加载
    await expect(page.locator('text=第 1 章')).toBeVisible()

    // 找到左侧大纲面板中的章节列表
    const chapterList = page.locator('.paper').filter({ has: page.locator('text=章节大纲') })

    // 如果有第2章的卡片，点击切换
    const chapter2Card = chapterList.locator('.paper-flat').filter({ hasText: '误会' })
    if (await chapter2Card.isVisible()) {
      await chapter2Card.click()

      // 验证URL变化
      await expect(page).toHaveURL(/\/chapters\/2/)
    }
  })

  test('点击AI续写按钮', async ({ page }) => {
    // 导航到章节写作页面
    await page.goto('/novels/test-novel-001/chapters/1')
    await page.waitForTimeout(500)

    // 等待页面加载
    await expect(page.locator('text=第 1 章')).toBeVisible()

    // 找到AI续写按钮
    const aiButton = page.getByRole('button', { name: 'AI 续写' })
    await expect(aiButton).toBeVisible()
    await expect(aiButton).toBeEnabled()

    // 点击AI续写
    await aiButton.click()

    // 等待生成状态
    await page.waitForTimeout(500)

    // 应该显示连接中或生成中状态
    await expect(page.locator('text=连接中').or(page.locator('text=生成中'))).toBeVisible()
  })

  test('点击保存按钮', async ({ page }) => {
    // 导航到章节写作页面
    await page.goto('/novels/test-novel-001/chapters/1')
    await page.waitForTimeout(500)

    // 等待页面加载
    await expect(page.locator('text=第 1 章')).toBeVisible()

    // 找到内容编辑区并输入内容
    const textarea = page.locator('textarea.textarea-writing')
    if (await textarea.isVisible()) {
      await textarea.fill('测试内容，这是一段测试文字。')
    }

    // 找到保存按钮
    const saveButton = page.getByRole('button', { name: '保存' })
    await expect(saveButton).toBeVisible()

    // 点击保存
    await saveButton.click()

    // 等待保存完成
    await page.waitForTimeout(500)

    // 应该显示保存成功的提示
    await expect(page.locator('.toast-success').or(page.locator('text=已保存'))).toBeVisible()
  })

  test('上一章/下一章导航按钮', async ({ page }) => {
    // 导航到第2章
    await page.goto('/novels/test-novel-001/chapters/2')
    await page.waitForTimeout(500)

    // 等待页面加载
    await expect(page.locator('text=第 2 章')).toBeVisible()

    // 点击上一章按钮
    const prevButton = page.getByRole('button', { name: '上一章' })
    await prevButton.click()

    // 应该跳转到第1章
    await expect(page).toHaveURL(/\/chapters\/1/)

    // 点击下一章按钮
    const nextButton = page.getByRole('button', { name: '下一章' })
    await nextButton.click()

    // 应该跳转回第2章
    await expect(page).toHaveURL(/\/chapters\/2/)
  })

  test('审核弹窗操作', async ({ page }) => {
    // 导航到章节写作页面
    await page.goto('/novels/test-novel-001/chapters/1')
    await page.waitForTimeout(500)

    // 等待页面加载
    await expect(page.locator('text=第 1 章')).toBeVisible()

    // 点击AI续写触发生成
    await page.getByRole('button', { name: 'AI 续写' }).click()
    await page.waitForTimeout(1500)

    // 生成完成后审核弹窗应该出现
    const reviewModal = page.locator('.dialog-overlay')
    if (await reviewModal.isVisible()) {
      // 验证审核弹窗内容
      await expect(reviewModal.locator('text=章节审核')).toBeVisible()

      // 测试使用此内容按钮
      const useButton = page.getByRole('button', { name: '使用此内容' })
      await expect(useButton).toBeVisible()

      // 测试审核通过按钮
      const approveButton = page.getByRole('button', { name: '审核通过' })
      await expect(approveButton).toBeVisible()
    }
  })

  test('删除章节按钮', async ({ page }) => {
    // 导航到章节写作页面
    await page.goto('/novels/test-novel-001/chapters/1')
    await page.waitForTimeout(500)

    // 等待页面加载
    await expect(page.locator('text=第 1 章')).toBeVisible()

    // 找到删除按钮
    const deleteButton = page.getByRole('button', { name: '删除' })
    await expect(deleteButton).toBeVisible()

    // 点击删除按钮
    await deleteButton.click()

    // 确认删除弹窗应该出现
    const confirmDialog = page.locator('.dialog-overlay')
    await expect(confirmDialog).toBeVisible()
    await expect(confirmDialog).toContainText('确认删除章节')

    // 点击取消
    await page.getByRole('button', { name: '取消' }).click()

    // 弹窗应该消失
    await expect(confirmDialog).not.toBeVisible()
  })
})