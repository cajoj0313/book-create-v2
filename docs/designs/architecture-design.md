# 灵笔 - 技术架构设计文档

> **设计日期**: 2026-04-11
> **项目**: 灵笔 (book-create-v2)
> **阶段**: 架构设计

---

## 1. 设计决策汇总

| 决策项 | 用户选择 | 理由 |
|--------|----------|------|
| AI生成UX | 流式实时展示 | 体验流畅，即时反馈 |
| AI调用方式 | API调用（阿里云DashScope） | 无需本地部署，成本可控 |
| 版本管理 | 文件版本（v1/v2...） | 简单可靠，便于回滚 |
| 校验时机 | 自动校验 | 生成后立即校验，质量保障 |
| 数据目录 | 平铺结构 | 结构清晰，便于迁移 |

---

## 2. 技术选型确认

| 技术栈 | 选择 | 理由 |
|--------|------|------|
| **Backend** | Python + FastAPI + asyncio | 异步支持好，适合流式输出 |
| **Frontend** | React + TypeScript + TailwindCSS | 组件化开发，类型安全 |
| **AI模型** | 通义千问 qwen3.5 (DashScope API) | 中文生成质量好，性价比高 |
| **流式传输** | SSE (Server-Sent Events) | 单向推送，比WebSocket简单 |
| **存储** | JSON文件（无数据库） | 简单直接，便于版本管理 |
| **测试** | pytest (后端) + Vitest (前端) | Python标准测试框架 |

---

## 3. 两种架构方案对比

### 方案A：单服务流式架构 ⭐ 推荐

**特点**: 一个FastAPI服务处理所有请求，SSE实现流式输出

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                           │
│         TypeScript + TailwindCSS + SSE Client               │
└─────────────────────────────────────────────────────────────┘
                          │ HTTP + SSE
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Single FastAPI Backend                          │
│              Python + asyncio + SSE Streaming               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ NovelAPI    │  │ GenerateAPI │  │ ValidateAPI │          │
│  │ (REST)      │  │ (SSE流式)   │  │ (REST)      │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ NovelService│  │ QwenProvider│  │ Validator   │          │
│  │             │  │ (DashScope) │  │ (36规则)    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐                           │
│  │ FileStorage │  │ VersionCtrl │                           │
│  │ (JSON)      │  │ (v1/v2...)  │                           │
│  └─────────────┘  └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    data/novels/                              │
│            {novel-id}/meta.json, chapters/, state/           │
└─────────────────────────────────────────────────────────────┘
```

**优点**:
- 架构简单，部署容易（单服务）
- SSE实现流式输出，代码量少
- 无需额外组件（消息队列等）
- 适合单用户、本地部署场景

**缺点**:
- AI生成时阻塞该服务端口（但不阻塞其他请求）
- 扩展性有限（后续多用户需重构）

---

### 方案B：异步任务+消息队列架构

**特点**: 后端API + 任务队列处理AI生成，WebSocket推送结果

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                           │
│         TypeScript + TailwindCSS + WebSocket Client         │
└─────────────────────────────────────────────────────────────┘
                          │ HTTP + WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              FastAPI Backend (API Gateway)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ NovelAPI    │  │ GenerateAPI │  │ ValidateAPI │          │
│  │ (REST)      │  │ (提交任务)  │  │ (REST)      │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐                           │
│  │ TaskQueue   │  │ WebSocket   │                           │
│  │ (RQ/Redis)  │  │ Manager     │                           │
│  └─────────────┘  └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                          │ Redis
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              AI Worker Service                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐                           │
│  │ Worker      │  │ QwenProvider│                           │
│  │ (RQ Worker) │  │ (流式调用)  │                           │
│  └─────────────┘  └─────────────┘                           │
│                                                              │
│  流式结果 → Redis → WebSocket → Frontend                     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    data/novels/                              │
└─────────────────────────────────────────────────────────────┘
```

**优点**:
- API不阻塞，用户可并行操作
- 易于扩展（后续多用户、多Worker）
- 任务可排队、重试、监控

**缺点**:
- 需要Redis作为消息队列
- 架构复杂，部署组件多
- WebSocket实现比SSE复杂
- 对单用户场景过度设计

---

## 4. 推荐选择

**推荐方案A（单服务流式架构）**

理由：
1. 项目定位为单用户使用，无需复杂扩展性
2. 先本地运行，部署简单优先
3. SSE比WebSocket实现简单，代码量少
4. 30秒生成时间可接受，用户会等待审核

---

## 5. 核心模块设计（方案A）

### 5.1 Backend API 设计

| API | 方法 | 功能 | 传输方式 |
|-----|------|------|----------|
| `/novels` | POST | 创建新小说 | REST |
| `/novels/{id}` | GET | 获取小说详情 | REST |
| `/novels/{id}/world` | GET/PUT | 世界观操作 | REST |
| `/novels/{id}/outline` | GET/PUT | 大纲操作 | REST |
| `/novels/{id}/chapters/{num}` | GET | 获取章节 | REST |
| `/novels/{id}/chapters/{num}/generate` | POST | 生成章节 | **SSE** |
| `/novels/{id}/chapters/{num}/save` | PUT | 保存章节 | REST |
| `/novels/{id}/validate` | POST | 校验小说 | REST |

### 5.2 SSE 流式生成设计

```python
# 章节生成API（SSE流式）
@app.post("/novels/{novel_id}/chapters/{chapter_num}/generate")
async def generate_chapter_stream(novel_id: str, chapter_num: int):
    async def event_generator():
        # 1. 读取上下文
        context = await load_generation_context(novel_id, chapter_num)
        
        # 2. 调用AI流式生成
        async for chunk in qwen_provider.stream_generate(context):
            yield f"data: {json.dumps({'type': 'content', 'text': chunk})}\n\n"
        
        # 3. 自动校验
        validation_result = await validator.validate(chapter_content)
        yield f"data: {json.dumps({'type': 'validation', 'result': validation_result})}\n\n"
        
        # 4. 完成
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )
```

### 5.3 校验流程设计

```
章节生成完成 → 自动触发校验 → 输出问题清单 → 用户确认修改 → 保存新版本
```

**校验规则执行顺序**:
1. L001-L005（逻辑一致性）- 必须通过
2. G001-G005（语法规范）- 高置信度自动修正
3. S001-S003（风格一致性）- 标记问题
4. P001-P004（人物一致性）- 标记问题
5. F001-F003（伏笔一致性）- 标记问题
6. B001-B008（商业逻辑）- 标记问题
7. E001-E008（感情线）- 标记问题

### 5.4 版本管理设计

```
data/novels/{novel-id}/chapters/
├── chapter_001.json          # 当前版本（用户编辑的最新版）
├── chapter_001_v1.json       # 历史版本1（AI首次生成）
├── chapter_001_v2.json       # 历史版本2（用户第一次修改）
├── chapter_001_v3.json       # 历史版本3（用户第二次修改）
└── ...
```

**版本命名规则**:
- `chapter_xxx.json` - 当前工作版本（用户正在编辑）
- `chapter_xxx_v{n}.json` - 历史版本（每次保存自动生成）

---

## 6. 前端页面设计

| 页面 | 功能 | 关键组件 |
|------|------|----------|
| NovelList | 小说列表 | NovelCard, CreateButton |
| NovelDetail | 小说详情仪表盘 | ProgressPanel, StatsCards |
| WorldBuilder | 世界观构建/编辑 | WorldForm, CharacterList |
| OutlineEditor | 大纲编辑 | ChapterTree, OutlineCard |
| ChapterWriter | 章节写作（核心） | StreamingEditor, ValidationPanel |
| ValidationReport | 校验报告查看 | IssueList, FixSuggestion |
| CharacterGraph | 人物关系图谱 | RelationGraph (可视化组件) |
| ForeshadowingPanel | 伏笔管理 | ForeshadowList, StatusBadge |

### ChapterWriter 核心交互流程

```
1. 用户点击"生成下一章"
   ↓
2. SSE连接建立，内容逐步显示
   ↓
3. 生成完成，自动校验启动
   ↓
4. 校验结果展示（问题清单）
   ↓
5. 用户编辑调整内容
   ↓
6. 点击"保存"（生成新版本）
   ↓
7. 点击"审核通过，继续下一章"
```

---

## 7. 数据流设计

### 7.1 章节生成数据流

```
Frontend                    Backend                     AI Provider
   │                           │                           │
   │ POST /generate            │                           │
   │──────────────────────────>│                           │
   │                           │ load_context()            │
   │                           │──────────────────────────>│
   │                           │                           │
   │ SSE: content chunk        │ stream_generate()         │
   │<──────────────────────────│<──────────────────────────│
   │                           │                           │
   │ SSE: validation result    │ validate()                │
   │<──────────────────────────│                           │
   │                           │                           │
   │ SSE: done                 │                           │
   │<──────────────────────────│                           │
   │                           │                           │
   │ PUT /save                 │ save_version()            │
   │──────────────────────────>│                           │
```

### 7.2 校验数据流

```
Validator Service
    │
    ├── 输入: chapter_content + reference_data
    │   ├── world_setting.json
    │   ├── characters.json
    │   ├── timeline.json
    │   ├── character_states.json
    │   └── foreshadowing.json
    │
    ├── 执行: 36条规则并行检查
    │   ├── 高置信度语法问题 → 自动修正
    │   ├── 低置信度问题 → 标记pending
    │   └── 逻辑问题 → 标记pending（用户确认）
    │
    └── 输出: validation_report.json
        ├── issues: 问题列表
        ├── statistics: 统计信息
        └── auto_fixes: 自动修正内容
```

---

## 8. 部署方案

### 8.1 本地开发部署

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd web-front
pnpm install
pnpm dev  # http://localhost:5173

# 访问
open http://localhost:5173
```

### 8.2 阿里云ECS部署（后续）

```bash
# 单服务部署
docker build -t lingbi-backend .
docker run -d -p 8000:8000 -v /data/novels:/app/data lingbi-backend

# 前端静态部署
pnpm build
# 上传 dist/ 到 Nginx
```

---

## 9. 下一步行动

用户确认方案后：
1. 创建项目目录结构
2. 定义数据模型（Pydantic）
3. 实现核心API
4. 实现AI Provider（流式调用）
5. 实现校验引擎
6. 前端页面开发

---

## 附录：用户确认清单

**✅ 已确认**

- [x] **方案A：单服务流式架构**（推荐）
- [ ] **方案B：异步任务+消息队列架构**

---

*设计者: Architect Agent*
*文档版本: v1.1*
*用户确认日期: 2026-04-11*
*状态: 已确认，可进入开发阶段*