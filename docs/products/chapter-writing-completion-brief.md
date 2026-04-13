# PRD: 章节写作功能补全

> **创建日期**: 2026-04-13
> **产品经理**: Claude
> **优先级**: P0（核心功能）

---

## 1. 问题背景

用户反馈"开始写作的整体内容还是有很多bug，功能也不完善"。经全面梳理，发现以下问题：

### 1.1 已修复问题 ✅

| 问题 | 修复 | 提交 |
|------|------|------|
| OutlineEditor 数组访问崩溃 | 安全访问 `?? []` | 4efcb77 |
| ChapterWriter SSE API 404 | 修正API路径 | 43247d5 |
| 左侧大纲列表不显示 | 添加章节列表展示 | 8b9f014 |

### 1.2 待修复问题

| 问题 | 严重度 | 影响页面 |
|------|--------|----------|
| 章节生成后未自动保存 | P0 | ChapterWriter |
| 大纲页面无法手动编辑章节 | P1 | OutlineEditor |
| 章节写作页面缺少大纲上下文注入 | P1 | ChapterWriter |
| 左侧面板缺少感情线进度展示 | P1 | ChapterWriter |
| 审核通过后状态未更新到后端 | P1 | ChapterWriter |
| 章节导航缺少进度指示 | P2 | ChapterWriter |
| 缺少章节标题编辑功能 | P2 | ChapterWriter |

---

## 2. 功能需求

### FEAT-13: 章节写作功能补全 ⭐⭐⭐

**用户故事**: 作为作者，我希望"开始写作"流程完整可用，无bug，功能完善。

---

### 2.1 P0: 章节生成后自动保存

**用户故事**: 作为作者，我希望AI生成章节后自动保存，无需手动点击保存按钮。

**验收标准**:
- [ ] SSE 流式生成完成后自动调用 `updateChapter` API
- [ ] 保存成功后显示提示"章节已自动保存"
- [ ] 保存失败时显示错误提示并保留生成内容

**技术方案**:
```typescript
// ChapterWriter.tsx - handleApproveAndNext 函数中
const handleApproveAndNext = async () => {
  // 先保存当前章节
  const saved = await updateChapter(novelId, currentChapterNum, generatedContent)
  if (!saved.success) {
    setToast({ type: 'error', message: '保存失败' })
    return
  }
  // 再跳转下一章
  navigate(`/novels/${novelId}/chapters/${currentChapterNum + 1}`)
}
```

---

### 2.2 P1: 大纲页面手动编辑章节

**用户故事**: 作为作者，我希望能手动编辑大纲中的章节标题和事件，以便调整剧情。

**验收标准**:
- [ ] 点击章节卡片可展开编辑模式
- [ ] 可编辑章节标题
- [ ] 可编辑 key_events（增删改）
- [ ] 编辑后点击"保存"按钮生效

**技术方案**: 已有 `editable` 模式，需确认功能完整可用。

---

### 2.3 P1: 章节写作注入大纲上下文

**用户故事**: 作为作者，我希望AI生成章节时能看到本章大纲上下文，以便生成内容符合规划。

**验收标准**:
- [ ] 章节生成请求包含本章大纲上下文
- [ ] 后端 API 接收 `outline_context` 参数
- [ ] AI Prompt 包含本章 key_events

**技术方案**:
```typescript
// ChapterWriter.tsx - handleGenerate
body: JSON.stringify({
  novel_id: novelId,
  chapter_num: currentChapterNum,
  user_special_request: null,
  outline_context: currentChapterOutline ? {
    title: currentChapterOutline.title,
    key_events: currentChapterOutline.key_events,
    emotion_stage: currentChapterOutline.emotion_stage,
  } : null,
})
```

---

### 2.4 P1: 左侧感情线进度展示

**用户故事**: 作为作者，我希望左侧面板显示感情线进度，以便把握感情节奏。

**验收标准**:
- [ ] 左侧面板显示感情线阶段列表（emotion_arc）
- [ ] 当前所在阶段高亮标记
- [ ] 显示阶段名称和章节范围

**技术方案**:
```typescript
// ChapterWriter.tsx - 左侧面板添加感情线部分
{fullOutline?.emotion_arc && (
  <div className="mt-4 pt-4 border-t">
    <h3>感情节奏</h3>
    {fullOutline.emotion_arc.map(arc => (
      <div className={arc.range.includes(`${currentChapterNum}`) ? 'highlight' : ''}>
        {arc.stage}
      </div>
    ))}
  </div>
)}
```

---

### 2.5 P1: 审核状态持久化

**用户故事**: 作为作者，我希望审核通过后状态持久化到后端，以便下次进入能看到审核结果。

**验收标准**:
- [ ] 审核通过后更新章节 validation_status
- [ ] 后端 API 支持更新审核状态

---

### 2.6 P2: 章节导航进度指示

**用户故事**: 作为作者，我希望章节导航显示进度，以便知道当前位置。

**验收标准**:
- [ ] 顶部显示"第 X / Y 章"
- [ ] 进度条显示完成比例
- [ ] 已完成章节标记绿色

---

### 2.7 P2: 章节标题编辑

**用户故事**: 作为作者，我希望能编辑章节标题，以便调整章节命名。

**验收标准**:
- [ ] 章节标题可点击编辑
- [ ] 编辑后保存到后端

---

## 3. 实施计划

| 任务 | 工时 | 优先级 | 依赖 |
|------|------|--------|------|
| 章节生成后自动保存 | 0.5h | P0 | 无 |
| 章节写作注入大纲上下文 | 1h | P1 | 无 |
| 左侧感情线进度展示 | 1h | P1 | 无 |
| 大纲页面编辑验证 | 0.5h | P1 | 无 |
| 审核状态持久化 | 1h | P1 | 后端API |
| 章节导航进度指示 | 0.5h | P2 | 无 |
| 章节标题编辑 | 1h | P2 | 后端API |
| **总计** | **5.5h** | - | - |

---

## 4. 优先级评分

| 维度 | 评分 (1-5) | 说明 |
|------|-----------|------|
| 业务价值 | 5 | "开始写作"是核心流程 |
| 用户痛点 | 5 | 用户反馈功能不完善 |
| 技术可行性 | 4 | 前端为主，改动量适中 |
| 依赖风险 | 2 | 部分需后端配合 |

---

## 5. MVP范围

- Must have: P0 + P1 功能（4h）
- Nice to have: P2 功能（1.5h）
- Out of scope: 版本历史（已有FEAT-05）

---

*最后更新: 2026-04-13*