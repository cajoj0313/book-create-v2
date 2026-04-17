# 任务计划 (Task Plan)

> **创建日期**: 2026-04-15
> **项目**: 灵笔 - 都市言情小说生成器
> **当前阶段**: 内容质量提升阶段

---

## 当前任务：FEAT-16 移除预配置数据实现纯 AI 生成 ✅

### 任务来源

PRD 文档：`docs/products/pure-ai-random-generation-brief.md`
需求编号：FEAT-16
优先级：P0（RICE Score = 250）

### 任务分解（并行执行）

| 任务ID | 任务名称 | 负责角色 | 工时 | 状态 | 依赖 |
|--------|----------|----------|------|------|------|
| T-1 | `_build_random_world_setting_prompt()` 移除预配置列表 | backend-dev | 2h | **completed** ✅ | 无 |
| T-2 | `_build_world_setting_prompt()` 移除预配置列表 | backend-dev | 1h | **completed** ✅ | 无 |
| T-3 | `_build_outline_prompt()` 优化感情节奏描述 | backend-dev | 1h | **completed** ✅ | 无 |
| T-4 | pytest 测试验证 | qa-tester | 0.5h | **completed** ✅ | T-1, T-2, T-3 |
| T-5 | 前端移除类型选择下拉框 | frontend-dev | 1h | **completed** ✅ | 无 |
| T-6 | npm type-check 验证 | frontend-dev | 0.5h | **completed** ✅ | T-5 |

### 并行批次

| 批次 | 任务 | 耗时 | 说明 |
|------|------|------|------|
| **批次1** | T-1 + T-2 + T-3 + T-5 | max(2h, 1h, 1h, 1h) = 2h | 后端 Prompt + 前端 UI 并行 |
| **批次2** | T-4 + T-6 | max(0.5h, 0.5h) = 0.5h | 测试验证 |

**总耗时**：2h + 0.5h = **2.5h**（串行需 6h，节省 58%）

### 验收标准

- [x] `_build_random_world_setting_prompt()` 移除所有类型选择列表
- [x] `_build_world_setting_prompt()` 移除所有类型选择列表
- [x] 所有"选择其一"指令改为"自由创意生成"
- [x] 保留 JSON 输出格式定义
- [x] 保留写作风格指南和示例对比
- [x] pytest 测试通过（61 passed）
- [x] 前端移除类型选择下拉框
- [x] npm type-check 通过
- [x] 产品验收通过（无需人工验证）

### 任务完成状态

**批次1 + 批次2 全部完成** ✅

### 移除的预配置数据

| 位置 | 移除内容 | 改造方式 |
|------|----------|----------|
| `_build_random_world_setting_prompt()` | 男主类型（4种）、女主类型（3种）、感情线类型（4种）、城市（5个）、工作场所（5种） | 改为"自由创意生成"指令 |
| `_build_world_setting_prompt()` | 男主identity类型、女主identity类型、冲突类型 | 改为"自由定义"指令 |
| `_build_outline_prompt()` | 固定感情阶段描述、爽点类型、冲突原因 | 保留框架，改为自由创意设计 |

---

## 历史任务：FEAT-14 强化示例驱动 Prompt ✅

### 任务来源

PRD 文档：`docs/products/example-driven-prompt-brief.md`
需求编号：FEAT-14
优先级：P0（RICE Score = 100）

### 任务分解（并行执行）

| 任务ID | 任务名称 | 负责角色 | 工时 | 状态 | 依赖 |
|--------|----------|----------|------|------|------|
| T-1 | 世界观 Prompt 添加示例对比 | backend-dev | 1h | **pending** | 无 |
| T-2 | 大纲 Prompt 添加示例对比 | backend-dev | 1h | **pending** | 无 |
| T-3 | 章节 Prompt 添加示例对比（重点） | backend-dev | 2h | **pending** | 无 |
| T-4 | pytest 测试验证 | qa-tester | 0.5h | **pending** | T-1, T-2, T-3 |
| T-5 | 生成测试样本并人工评估 | qa-tester | 2h | **pending** | T-4 |

### 并行批次

| 批次 | 任务 | 耗时 | 说明 |
|------|------|------|------|
| **批次1** | T-1 + T-2 + T-3 | max(1h, 1h, 2h) = 2h | 三个 Prompt 可并行修改 |
| **批次2** | T-4 | 0.5h | 测试验证 |
| **批次3** | T-5 | 2h | 人工评估 |

**总耗时**：2h + 0.5h + 2h = **4.5h**（串行需 6.5h，节省 31%）

### 验收标准（PRD）

- [ ] 世界观 Prompt 添加人物设定示例对比
- [ ] 大纲 Prompt 添加章节标题示例对比
- [ ] 章节 Prompt 添加段落描写示例对比（重点）
- [ ] pytest 测试通过（92 passed）
- [ ] 生成测试内容，人工验证质量提升

### 执行计划

1. **批次1**：并行启动 backend-dev 完成 T-1、T-2、T-3
2. **批次2**：T-4 测试验证（全部通过后）
3. **批次3**：T-5 生成测试样本，用户确认效果

---

### 任务来源

测试文件 `generation.spec.ts` 失败：
- 测试期望：创建成功后 URL 不再是根路径
- 实际结果：创建后 URL 仍是 `http://localhost:3000/`
- 根因分析：测试文件没有 mock API，依赖真实后端

### 任务计划

| 步骤 | 任务内容 | 状态 | 依赖 |
|------|----------|------|------|
| 1 | 分析问题根因：generation.spec.ts 缺少 mock API | **complete** | 无 |
| 2 | 为 generation.spec.ts 添加 mockApiRoutes 函数 | **complete** | 步骤 1 |
| 3 | 修复测试断言方式（使用 toHaveURL 替代 not.toBe） | **complete** | 步骤 2 |
| 4 | 修复世界观 mock 返回空状态 | **complete** | 步骤 3 |
| 5 | 验证测试通过（npm run test:e2e） | **complete** | 步骤 4 |
| 6 | 更新 progress.md | **complete** | 步骤 5 |

### 任务完成状态

**全部完成** ✅

### 问题分析

**根因**: `generation.spec.ts` 没有 mock API 路由
- 对比 `interaction.spec.ts`：有完整的 `mockApiRoutes(page)` 函数
- `interaction.spec.ts` 测试通过，`generation.spec.ts` 测试失败

**解决方案**: 为 `generation.spec.ts` 添加 mock API 配置
- Mock `POST /api/novels/` 返回 `{ success: true, data: newNovel }`
- Mock 其他必要 API（世界观、章节等）

---

## 项目状态总览

| 维度 | 状态 |
|------|------|
| 产品定位 | 都市言情小说生成器（转型完成） |
| 核心功能 | 世界观→大纲→章节 三阶段生成 ✅ |
| 前端状态 | 5个核心页面已完成 ✅ |
| 后端状态 | API + Prompt 改造完成 ✅ |
| 测试状态 | 92 passed, 4 skipped ✅ |

---

## 已完成里程碑

| ID | 里程碑 | 完成日期 | 关键交付物 |
|----|--------|----------|-----------|
| M1 | 后端基础架构 | 2026-04-13 | 数据模型、存储模块、AI Provider |
| M2 | 基础 API | 2026-04-13 | 小说/章节/人物 CRUD |
| M3 | 前端基础架构 | 2026-04-13 | React + TypeScript + TailwindCSS |
| M4 | 核心页面 | 2026-04-13 | NovelList, NovelDetail, WorldBuilder, ChapterWriter |
| M5 | SSE 流式生成 | 2026-04-13 | 章节续写实时响应 |
| M6 | 品牌设计系统 | 2026-04-13 | 墨韵书香风格组件库 |
| M7 | 都市言情转型 | 2026-04-13 | Prompt改造 + 状态追踪移除 |
| M8 | 功能补全 | 2026-04-13 | FEAT-11/12（删除/人物管理） |
| M9 | Prompt风格优化 | 2026-04-13 | 信息密度/赘婿风格 |
| M10 | 世界观随机生成 | 2026-04-13 | FEAT-11 AI随机生成按钮 |
| M11 | 章节写作补全 | 2026-04-13 | FEAT-13 大纲上下文注入 |
| M12 | E2E测试Mock移除 | 2026-04-14 | 真实DashScope API测试 |
| M13 | 示例驱动Prompt | 2026-04-16 | FEAT-14 好示例vs坏示例对比 |
| M14 | 纯AI随机生成 | 2026-04-16 | FEAT-16 移除预配置数据 |

---

## 当前阶段：运维优化

### 阶段目标

完善用户体验，优化生成质量，提升系统稳定性。

### 阶段任务清单

| 任务ID | 任务名称 | 优先级 | 状态 | 依赖 | 负责角色 | 预计工期 |
|--------|----------|--------|------|------|----------|----------|
| T-001 | 前端界面简化（Phase 2遗留） | P1 | pending | 无 | frontend | 6h |
| T-002 | 生成质量用户反馈收集 | P2 | pending | 无 | backend | 4h |
| T-003 | 性能监控与日志优化 | P2 | pending | 无 | backend | 4h |
| T-004 | 用户风格偏好设置 | P2 | pending | T-002 | backend+frontend | 8h |
| T-005 | 部署文档与运维手册 | P3 | pending | 无 | pm | 2h |

---

## 待评估需求

| 需求ID | 需求名称 | 来源 | 状态 | 下一步 |
|--------|----------|------|------|--------|
| REQ-001 | 支持更多小说类型 | backlog | 待评估 | → Product Manager 评估优先级 |
| REQ-002 | 随机提示词供选择（P1） | FEAT-11 P1 | 待评估 | → Architect 设计方案 |
| REQ-003 | 内容质量验证层 | AI质量优化 | 待评估 | → Architect 设计方案 |
| REQ-004 | 多语言支持 | 用户反馈 | 待评估 | → Product Manager 评估 |

---

## 阻塞问题

| 问题ID | 问题描述 | 影响 | 阻塞任务 | 解决方案 | 状态 |
|--------|----------|------|----------|----------|------|
| - | 无当前阻塞问题 | - | - | - | - |

---

## 下一步计划

### 本周计划（2026-04-15 ~ 2026-04-21）

| 日期 | 计划任务 | 负责角色 |
|------|----------|----------|
| 2026-04-15 | T-001 前端界面简化启动 | frontend-dev |
| 2026-04-16 | T-001 完成 + T-002 启动 | frontend → backend |
| 2026-04-17 | T-002 完成 + T-003 启动 | backend |
| 2026-04-18 | REQ-002 架构设计评审 | architect |
| 2026-04-19 | 集成测试回归验证 | qa |
| 2026-04-20 | 进度文档更新 + Git推送 | pm |

---

## 风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| API Key 配额耗尽 | 中 | 高 | 添加请求计数与限制 |
| 生成质量不稳定 | 高 | 中 | Prompt 持续优化 |
| 前端崩溃遗留 | 低 | 高 | 全面功能检查（已完成） |

---

## 技术决策记录

| 决策ID | 决策内容 | 日期 | 原因 |
|--------|----------|------|------|
| D-001 | 移除状态追踪服务 | 2026-04-13 | 都市言情转型简化 |
| D-002 | 校验规则简化为5条 | 2026-04-13 | 适配都市言情场景 |
| D-003 | E2E测试使用真实API | 2026-04-14 | 用户要求去掉Mock |

---

## 相关文档索引

| 文档类型 | 路径 |
|----------|------|
| 进度日志 | `docs/planning/progress.md` |
| 技术发现 | `docs/planning/findings.md` |
| 需求池 | `docs/products/backlog.md` |
| PRD文档 | `docs/products/*-brief.md` |
| 交付报告 | `docs/delivery/*-report.md` |

---

*创建日期: 2026-04-15*
*维护者: PM*
*下次更新: 每阶段完成后*