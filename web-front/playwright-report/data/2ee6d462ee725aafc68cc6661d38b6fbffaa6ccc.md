# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: short-novel-mvp.spec.ts >> 短篇小说 MVP - 12 章大纲选项 >> 大纲页面章节数选项验证（10/12/15 章）
- Location: e2e/short-novel-mvp.spec.ts:210:3

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
      - textbox "输入小说标题，如：霸道总裁的职场恋情..." [disabled] [ref=e15]: 大纲选项测试_1776394371023
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
  133 | test.describe('短篇小说 MVP - 章节批量拆分功能', () => {
  134 |   test.setTimeout(60000);
  135 | 
  136 |   test('章节页面批量生成元素验证', async ({ page }) => {
  137 |     // 1. 访问首页
  138 |     await page.goto('/');
  139 |     await page.waitForLoadState('networkidle');
  140 | 
  141 |     // 2. 创建小说
  142 |     const titleInput = page.locator('input[type="text"]').first();
  143 |     const uniqueTitle = `批量生成测试_${Date.now()}`;
  144 |     await titleInput.fill(uniqueTitle);
  145 | 
  146 |     const createBtn = page.locator('button:has-text("创建")').first();
  147 |     await createBtn.click();
  148 | 
  149 |     await expect(page).toHaveURL(/\/novels\/.*\/world-setting/, { timeout: 15000 });
  150 | 
  151 |     // 3. 获取小说 ID 并访问章节页面
  152 |     const currentUrl = page.url();
  153 |     const novelId = currentUrl.split('/')[4];
  154 |     await page.goto(`/novels/${novelId}/chapters/1`);
  155 | 
  156 |     // 等待页面加载
  157 |     await page.waitForLoadState('networkidle');
  158 | 
  159 |     // 4. 验证章节页面元素
  160 |     // 验证章节写作区域存在（通过内容编辑器判断）
  161 |     const editorArea = page.locator('.cm-content, .CodeMirror, textarea[placeholder*="内容"], textarea[placeholder*="正文"], div[contenteditable]');
  162 |     await expect(editorArea.first()).toBeVisible();
  163 | 
  164 |     // 验证保存或生成按钮存在
  165 |     const saveBtn = page.locator('button:has-text("保存"), button:has-text("生成"), button:has-text("AI 生成")');
  166 |     await expect(saveBtn.first()).toBeVisible();
  167 |   });
  168 | 
  169 |   test('章节批量生成选项验证（3/5/10 章）', async ({ page }) => {
  170 |     // 1. 访问首页
  171 |     await page.goto('/');
  172 |     await page.waitForLoadState('networkidle');
  173 | 
  174 |     // 2. 创建小说
  175 |     const titleInput = page.locator('input[type="text"]').first();
  176 |     const uniqueTitle = `批量选项测试_${Date.now()}`;
  177 |     await titleInput.fill(uniqueTitle);
  178 | 
  179 |     const createBtn = page.locator('button:has-text("创建")').first();
  180 |     await createBtn.click();
  181 | 
  182 |     await expect(page).toHaveURL(/\/novels\/.*\/world-setting/, { timeout: 15000 });
  183 | 
  184 |     // 3. 获取小说 ID 并访问章节页面
  185 |     const currentUrl = page.url();
  186 |     const novelId = currentUrl.split('/')[4];
  187 |     await page.goto(`/novels/${novelId}/chapters/1`);
  188 |     await page.waitForLoadState('networkidle');
  189 | 
  190 |     // 4. 打开批量生成弹窗
  191 |     // 注：实际测试中需要点击批量生成按钮打开弹窗
  192 |     // 这里只验证如果弹窗存在，选项是否正确
  193 | 
  194 |     // 假设批量生成弹窗有 3/5/10 章选项
  195 |     // 验证选项存在（如果弹窗打开）
  196 |     const option3 = page.locator('button:has-text("3 章"), label:has-text("3"), option[value="3"]');
  197 |     const option5 = page.locator('button:has-text("5 章"), label:has-text("5"), option[value="5"]');
  198 |     const option10 = page.locator('button:has-text("10 章"), label:has-text("10"), option[value="10"]');
  199 | 
  200 |     // 这些选项可能在弹窗中，只在弹窗打开时验证
  201 |     // 注：由于是 UI 测试，实际验证需要配合用户交互
  202 |     // 这里只记录预期行为
  203 |     console.log('批量生成选项应包含：3 章、5 章、10 章');
  204 |   });
  205 | });
  206 | 
  207 | test.describe('短篇小说 MVP - 12 章大纲选项', () => {
  208 |   test.setTimeout(60000);
  209 | 
  210 |   test('大纲页面章节数选项验证（10/12/15 章）', async ({ page }) => {
  211 |     // 1. 访问首页
  212 |     await page.goto('/');
  213 |     await page.waitForLoadState('networkidle');
  214 | 
  215 |     // 2. 创建小说
  216 |     const titleInput = page.locator('input[type="text"]').first();
  217 |     const uniqueTitle = `大纲选项测试_${Date.now()}`;
  218 |     await titleInput.fill(uniqueTitle);
  219 | 
  220 |     const createBtn = page.locator('button:has-text("创建")').first();
  221 |     await createBtn.click();
  222 | 
> 223 |     await expect(page).toHaveURL(/\/novels\/.*\/world-setting/, { timeout: 15000 });
      |                        ^ Error: expect(page).toHaveURL(expected) failed
  224 | 
  225 |     // 3. 获取小说 ID 并访问大纲页面
  226 |     const currentUrl = page.url();
  227 |     const novelId = currentUrl.split('/')[4];
  228 |     await page.goto(`/novels/${novelId}/outline`);
  229 |     await page.waitForLoadState('networkidle');
  230 | 
  231 |     // 4. 验证章节数选择器存在
  232 |     const chapterSelect = page.locator('select:has-text("10"), select:has-text("12"), select:has-text("15")');
  233 |     await expect(chapterSelect.first()).toBeVisible();
  234 | 
  235 |     // 5. 验证选择器选项
  236 |     const options = await chapterSelect.locator('option').allTextContents();
  237 |     expect(options).toContainEqual(expect.stringContaining('10'));
  238 |     expect(options).toContainEqual(expect.stringContaining('12'));
  239 |     expect(options).toContainEqual(expect.stringContaining('15'));
  240 |   });
  241 | });
  242 | 
```