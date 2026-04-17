# 团队技能与 MCP 调用快速参考

> **创建日期**: 2026-04-15
> **项目**: 灵笔 (book-create-v2)
> **用途**: 快速查阅各角色的技能和 MCP 调用权限
> **更新**: v2.4 流程修复 + 用户入口指引

---

## 🚀 用户入口速查 ⭐

| 场景 | 入口命令 | 说明 |
|------|---------|------|
| **新业务需求** | `/product-manager` | 需求澄清 → PRD文档 |
| **已有需求文档** | `/pm 需求文档：xxx` | 技术方案 → 开发执行 |
| **业务咨询** | `/analyst` | 业务决策建议 |
| **Bug修复** | `/pm` 或 `/diagnostic` | 问题诊断 → 修复 |

**详细指引**: `.claude/team/USER-ENTRY-GUIDE.md`

---

## 角色速查表

| 角色 | 命令 | 核心职责 | 关键技能 |
|------|------|----------|----------|
| **PM** | `/pm` | 任务分解、调度 | 并行调度、进度追踪 |
| **Backend Dev** | `/backend` | 后端开发 | `/tdd`, `/type-check` |
| **Frontend Dev** | `/frontend` | 前端开发 | `/ui-ux`, `/webapp-testing` |
| **QA Tester** | `/qa` | 测试专家 | `/tdd`, `/webapp-testing` |
| **Code Reviewer** | `/reviewer` | 代码审查 | `/type-check`, `/simplify` |
| **Senior Analyst** | `/senior-analyst` | PM业务顾问 | 需求澄清、优先级评估 ⭐ |

---

## MCP 服务器速查

### 已配置服务器

| 服务器 | 用途 | 调用示例 |
|--------|------|----------|
| `filesystem` | 文件操作 | `mcp__filesystem__read_multiple_files` |
| `sqlite` | 数据库查询 | `mcp__sqlite__read_query` |
| `time` | 时区工具 | `mcp__time__now` |
| `duckdb` | OLAP 分析 | `mcp__duckdb__read_query` |
| `puppeteer` | 浏览器自动化 | `mcp__puppeteer__screenshot` |

### 需要填写配置的服务器

| 服务器 | 配置项 | 用途 |
|--------|--------|------|
| `telegram` | BOT_TOKEN, CHAT_ID | 告警通知 |
| `ssh` | HOST, USER, KEY_PATH | 远程部署 |
| `sentry` | ORG, PROJECT, TOKEN | 异常追踪 |

**配置位置**: `~/.claude/mcp.json`

---

## 角色专属技能

### Backend Developer (`/backend`)

**核心技能**:
```bash
/tdd                          # TDD 闭环开发
/type-check                   # 类型精度检查
/simplify                     # 代码简化
/reviewer                     # 代码审查
```

**MCP 调用**:
```python
# 查询数据库表结构
mcp__sqlite__describe_table:
  table_name: signals

# 读取多个源文件
mcp__filesystem__read_multiple_files:
  paths:
    - src/domain/models.py
    - src/application/signal_pipeline.py

# 时区转换
mcp__time__format:
  timestamp: 1712000000000
  timezone: "Asia/Shanghai"
```

**权限边界**:
- ✅ `src/`, `config/`, `tests/` (与 QA 协作)
- ❌ `web-front/`

---

### Frontend Developer (`/frontend`)

**核心技能**:
```bash
/ui-ux-pro-max               # UI 设计
/frontend-design             # 前端设计
/web-artifacts-builder       # Web 构件
/simplify                    # 代码简化
/webapp-testing              # E2E 测试
```

**MCP 调用**:
```python
# 读取多个前端文件
mcp__filesystem__read_multiple_files:
  paths:
    - web-front/src/components/StrategyBuilder.tsx
    - web-front/src/types/strategy.ts

# Puppeteer 截图
mcp__puppeteer__navigate:
  url: "http://localhost:5173"
mcp__puppeteer__screenshot:
  selector: "#strategy-builder"
```

**权限边界**:
- ✅ `web-front/`
- ❌ `src/`

---

### QA Tester (`/qa`)

**核心技能**:
```bash
/tdd                          # TDD 闭环开发
/webapp-testing               # E2E 测试
/simplify                     # 测试代码简化
/reviewer                     # 测试质量审查
```

**MCP 调用**:
```python
# 查询信号尝试统计
mcp__sqlite__read_query: |
  SELECT 
    strategy_name,
    final_result,
    COUNT(*) as count
  FROM signal_attempts
  GROUP BY strategy_name, final_result

# 查询过滤器拒绝原因
mcp__sqlite__read_query: |
  SELECT 
    filter_stage,
    filter_reason,
    COUNT(*) as rejected_count
  FROM signal_attempts
  WHERE final_result = 'FILTERED'
  GROUP BY filter_stage, filter_reason
```

**权限边界**:
- ✅ `tests/`, 读取 `src/`
- ❌ 修改 `src/` 业务代码

---

### Code Reviewer (`/reviewer`)

**核心技能**:
```bash
/type-check                   # 类型精度检查
/simplify                     # 代码简化分析
/code-review                  # 正式审查
```

**MCP 调用**:
```python
# 读取多个文件进行审查
mcp__filesystem__read_multiple_files:
  paths:
    - src/domain/risk_manager.py
    - src/domain/strategy_engine.py

# 运行检查脚本
Bash(python3 scripts/check_float.py)
Bash(python3 scripts/check_quantize.py)
```

**权限边界**:
- ✅ 读取所有代码
- ❌ 直接修改业务代码

---

### Team PM (`/pm`)

**核心技能**:
```bash
/planning-with-files          # 任务规划
/brainstorming                # 需求探索
```

**MCP 调用**:
```python
# 读取规划文件
mcp__filesystem__read_multiple_files:
  paths:
    - docs/planning/task_plan.md
    - docs/planning/findings.md
    - docs/planning/progress.md

# 查询任务统计
mcp__sqlite__read_query: |
  SELECT 
    strategy_name,
    COUNT(*) as total_signals,
    SUM(CASE WHEN status = 'SENT' THEN 1 ELSE 0 END) as sent_count
  FROM signal_attempts
  GROUP BY strategy_name
```

**权限边界**:
- ✅ 读取所有规划文件
- ❌ 直接修改业务代码/测试代码

---

### Senior Analyst (`/senior-analyst`) ⭐ 新增

**核心职责**:
- PM的业务顾问，减少用户确认环节
- 需求澄清、优先级评估、MVP范围建议
- 有行业通用方案直接采用，实在不确定才问用户

**调用方式**:
```python
SendMessage(
    to="senior-analyst",
    summary="业务决策咨询：[问题类型]",
    message="""
【问题类型】: 需求澄清 / 优先级评估 / MVP范围 / 行业实践 / 风险识别
【问题描述】: {具体问题}
"""
)
```

**决策权限**: 有限决策权
- Level 1: 行业通用方案 → 直接采用
- Level 2: 推荐方案 → PM确认后执行
- Level 3: 无明确方案 → 问用户

---

## 典型工作流

### 新功能开发 (TDD)

```bash
# 1. PM 分解任务
/pm 实现移动止损功能

# 2. Backend 调用 TDD 技能
/backend
/tdd 实现移动止损功能

# 3. 代码完成后检查
/simplify src/domain/risk_manager.py
/type-check src/domain/

# 4. QA 编写测试
/qa
/tdd 编写移动止损测试

# 5. Reviewer 审查
/reviewer 审查移动止损代码

# 6. PM 整合
```

### Bug 修复

```bash
# 1. QA 发现 Bug
/qa
pytest tests/unit/test_xxx.py -v
# 测试失败

# 2. 分析根因
Agent(subagent_type="systematic-debugging", 
      prompt="test_xxx 失败，分析根因")

# 3. Backend 修复
/backend
# 修复业务代码

# 4. QA 回归验证
/qa
pytest tests/unit/test_xxx.py -v

# 5. Reviewer 审查
/reviewer 审查 Bug 修复
```

---

## 检查脚本

### 类型精度检查

```bash
# float 使用检测
python3 scripts/check_float.py

# TickSize/LotSize 格式化检查
python3 scripts/check_quantize.py
```

### 输出示例

```
============================================================
float 使用检测 - 量化系统精度检查
============================================================

检查了 28 个 Python 文件

❌ 发现 34 处 float 使用:
  - models.py: 7 处 (score, pattern_score 等)
  - filter_factory.py: 8 处 (float() 调用)
  ...
```

---

## 文件边界总览

| 目录 | Backend | Frontend | QA | Reviewer | PM |
|------|---------|----------|----|----------|-------------|
| `src/` | ✅ 全权 | ❌ 禁止 | ⚠️ 读取 | ✅ 读取 | 🔍 只读 |
| `web-front/` | ❌ 禁止 | ✅ 全权 | ⚠️ 测试 | ✅ 读取 | 🔍 只读 |
| `tests/` | ⚠️ 协作 | ⚠️ 测试 | ✅ 全权 | ✅ 审查 | 🔍 只读 |
| `config/` | ✅ 全权 | ❌ 禁止 | ❌ 禁止 | ✅ 读取 | 🔍 只读 |
| `docs/` | ✅ 读取 | ✅ 读取 | ✅ 读取 | ✅ 读取 | 🔍 只读 |

> ⚠️ **新规则**: PM 禁止修改所有目录，只分配任务。

**图例**: ✅ 全权 | ❌ 禁止 | ⚠️ 有限权限 | 🔍 仅只读

---

## 相关文档

| 文档 | 路径 |
|------|------|
| MCP 编排配置 | `.claude/MCP-ORCHESTRATION.md` |
| MCP 快速开始 | `.claude/MCP-QUICKSTART.md` |
| MCP 环境变量 | `.claude/MCP-ENV-CONFIG.md` |
| Agentic Workflow | `.claude/skills/agentic-workflow/README.md` |

---

*维护者：AI Builder*
*项目：灵笔 (book-create-v2)*
*最后更新：2026-04-01*
