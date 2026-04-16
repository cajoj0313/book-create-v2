# 章节大纲关联与空白状态优化 - 需求简报

> **文档编号**: FEAT-17
> **创建日期**: 2026-04-16
> **创建者**: PdM
> **状态**: 待开发

---

## 1. 需求概述

### 问题描述

用户反馈两个问题：

**问题1：章节大纲和AI生成故事内容没有关联关系**
- AI生成的章节内容偏离大纲设定（如大纲写"男女主初遇"，AI却写"职场会议"）
- 前端左侧大纲面板与AI生成过程没有互动，用户看不到大纲对AI的影响
- 后端技术上未将大纲上下文传入AI Prompt，导致AI"不知道"大纲内容

**问题2：章节编写页面空白状态提示过于明显**
- 章节尚未生成时显示 warning toast（黄色警告）
- 用户期望静默显示空白页 + 简洁提示
- 小说不存在/网络错误仍需显示错误提示

### 目标用户

- 主要用户：使用灵笔创作都市言情小说的作者
- 使用场景：从大纲跳转到章节写作，AI续写生成内容

### 期望效果

**需求1效果**:
- AI生成时参考大纲的 `key_events`、`emotion_stage` 等字段
- 用户可指定"重点写某事件"，灵活调整生成方向
- 不强求100%覆盖，用户可手动编辑调整
- 生成完成后用户感觉内容与大纲"有呼应"

**需求2效果**:
- 章节未生成：静默显示空白页 + 简洁提示（去掉 warning 样式）
- 小说不存在/网络错误：保留错误提示

---

## 2. 用户故事

**需求1**:
```
作为小说创作者，我希望AI生成章节内容时能参考大纲的事件和感情阶段设定，
以便生成的内容与我规划的故事走向一致，减少人工修改成本。
```

**需求2**:
```
作为小说创作者，我希望章节未生成时页面显示简洁的空白提示，
而不是醒目的警告，以便保持舒适的创作体验。
```

---

## 3. 验收标准 (Acceptance Criteria)

### 需求1：大纲关联

- [ ] AC1: 后端 `_build_chapter_prompt()` 方法注入大纲上下文（章节标题、key_events、emotion_stage、emotion_progress）
- [ ] AC2: 后端 API `GenerateChapterRequest` 模型支持 `outline_context` 参数
- [ ] AC3: 前端 `handleGenerate` 构建并传递 `outline_context`（从 `fullOutline` 获取）
- [ ] AC4: AI生成内容至少覆盖 60% 大纲事件（人工验证）
- [ ] AC5: 用户可手动编辑调整生成内容（无需强求100%匹配）

### 需求2：空白状态优化

- [ ] AC6: `ChapterWriter.tsx` 章节未生成时显示简洁提示（去掉 warning 样式）
- [ ] AC7: 小说不存在时保留错误提示（"小说不存在，请返回首页重新创建"）
- [ ] AC8: 网络错误时保留错误提示（显示具体 error.message）

---

## 4. MVP 范围

| 类型 | 功能项 | 说明 |
|------|--------|------|
| **Must have** | 后端大纲上下文注入 | 核心功能，解决关联问题 |
| **Must have** | 前端大纲上下文传递 | 配合后端，完整数据流 |
| **Must have** | 空白状态简洁提示 | 用户体验优化 |
| **Nice to have** | 大纲覆盖度检查 | 生成后对比分析 |
| **Nice to have** | 用户指定重点事件 | 灵活调整生成方向 |
| **Out of scope** | 自动校验大纲偏离 | 后续迭代（校验规则） |

---

## 5. 优先级评估

### RICE 评分

| 维度 | 评分 (1-5) | 说明 |
|------|-----------|------|
| **Reach** - 覆盖范围 | 4 | 所有使用章节写作的用户 |
| **Impact** - 影响力 | 4 | 直接影响内容质量和创作体验 |
| **Confidence** - 信心度 | 4 | 需求明确，技术可行性高 |
| **Effort** - 投入成本 | 0.5 人天 | 后端Prompt改造 + 前端参数传递 + 样式调整 |

**Priority Score**: (4 × 4 × 4) / 0.5 = **128** → 高优先级 P1

### 排期建议

与当前需求池对比：
- FEAT-16（移除预配置数据）：Priority 250（P0）
- FEAT-17（本需求）：Priority 128（P1）

建议排在 FEAT-16 之后执行。

---

## 6. 技术约束

| 约束类型 | 约束内容 |
|---------|---------|
| **时间约束** | 无紧急截止时间 |
| **技术约束** | 复用现有 SSE 流式生成架构，无需新增服务 |
| **资源约束** | 单 Agent 可完成 |
| **依赖关系** | 无外部依赖 |

---

## 7. 现有方案

### 当前问题分析

**问题1代码分析**:

前端 `ChapterWriter.tsx` 第 159-188 行：
```typescript
// 前端确实在构建 outlineContext
const chapterOutline = fullOutline?.chapters?.find(ch => ch.chapter_num === currentChapterNum)
const outlineContext = chapterOutline ? {
  title: chapterOutline.title,
  key_events: chapterOutline.key_events,
  emotion_stage: chapterOutline.emotion_stage,
  emotion_progress: chapterOutline.emotion_progress,
} : null

// 但 API 请求中传递了 outline_context
body: JSON.stringify({
  novel_id: novelId,
  chapter_num: currentChapterNum,
  user_special_request: null,
  outline_context: outlineContext,  // 已传递
})
```

后端 `api_generation.py` 第 295-299 行：
```python
class GenerateChapterRequest(BaseModel):
    """生成章节请求"""
    novel_id: str
    chapter_num: int
    user_special_request: Optional[str] = None
    # ⚠️ 缺少 outline_context 参数
```

**结论**: 前端传递了 `outline_context`，但后端 API 模型未定义此参数，导致数据被丢弃。

**问题2代码分析**:

前端 `ChapterWriter.tsx` 第 134 行：
```typescript
setToast({ type: 'warning', message: '章节尚未生成，点击 AI 续写开始创作' })
// ⚠️ 使用 warning 样式（黄色）
```

用户期望去掉 warning 样式，改为简洁提示。

---

## 8. 技术方案

### 需求1方案

**后端改造**:

| 文件 | 改造内容 |
|------|----------|
| `api_generation.py` | `GenerateChapterRequest` 新增 `outline_context: Optional[dict] = None` |
| `generation_service.py` | `stream_generate_chapter` 新增 `outline_context` 参数传递 |
| `generation_service.py` | `_build_chapter_prompt` 使用 `outline_context` 注入大纲信息 |

**Prompt注入示例**:
```python
if outline_context:
    prompt += f"""
## 当前章节大纲（强制参考）⭐

### 章节标题
{outline_context.get('title', '未设定')}

### 核心事件（必须覆盖60%以上）
{format_events(outline_context.get('key_events', []))}

### 感情阶段
{outline_context.get('emotion_stage', '未设定')}

### 感情进度描述
{outline_context.get('emotion_progress', '')}

【红线】生成内容必须体现上述事件和感情阶段设定。
"""
```

### 需求2方案

**前端改造**:

| 文件 | 改造内容 |
|------|----------|
| `ChapterWriter.tsx` | 章节未生成提示改为普通样式（去掉 warning） |

**改造代码**:
```typescript
// 原来
setToast({ type: 'warning', message: '章节尚未生成...' })

// 改为：不显示 toast，仅在编辑区显示简洁提示卡片
// 或使用 setToast({ type: 'info', message: '...' })（如果有 info 样式）
```

---

## 9. 风险识别

| 风险类型 | 风险描述 | 缓解措施 |
|---------|---------|---------|
| **AI偏离风险** | AI可能仍偏离大纲设定 | Prompt 强制参考 + 红线约束 + 用户可手动编辑 |
| **覆盖度风险** | 无法保证100%覆盖 | MVP目标60%覆盖，Nice to have覆盖度检查 |
| **样式风险** | 去掉warning后用户可能不知道要做什么 | 保留简洁文字提示 + 空章节卡片引导 |

---

## 10. 附录

### 相关文档

- 现有代码：`web-front/src/pages/ChapterWriter.tsx`
- 现有代码：`backend/src/interfaces/api_generation.py`
- 现有代码：`backend/src/application/generation_service.py`
- CLAUDE.md 章节 Prompt 设计模板

### 历史记录

| 日期 | 变更内容 | 变更人 |
|------|---------|--------|
| 2026-04-16 | 需求文档创建 | PdM |

---

## PM 读取指引 ⭐

**关键信息提取**:

1. **核心需求**: 大纲上下文注入 + 空白状态优化
2. **验收标准**: 8 条 AC（后端注入 + 前端传递 + 样式调整）
3. **MVP**: 后端注入 + 前端传递 + 空白提示（3个必须项）
4. **优先级**: Score 128，P1 高优先级
5. **技术约束**: 复用 SSE 架构，无新增服务
6. **风险**: AI偏离风险 → Prompt 强制参考缓解

**任务分解建议**:

| 任务 | 工时 | Agent |
|------|------|-------|
| T-1: 后端API模型新增参数 | 0.5h | backend-dev |
| T-2: 后端Prompt注入大纲 | 1h | backend-dev |
| T-3: 前端空白状态样式调整 | 0.5h | frontend-dev |
| T-4: pytest 测试验证 | 0.5h | backend-dev |
| T-5: npm type-check 验证 | 0.5h | frontend-dev |
| T-6: 人工效果验证 | 1h | 用户 |
| **总计** | **4h** | - |

---

*最后更新: 2026-04-16*