# 技术发现 (Findings)

---

## 项目架构发现

### Backend 技术栈

- **FastAPI** - 异步 API 框架
- **asyncio** - 异步 I/O
- **QwenProvider** - AI 流式生成封装
- **FileStorage** - JSON 文件存储

### Frontend 技术栈

- **React 18** - 前端框架
- **TypeScript** - 类型安全
- **TailwindCSS** - 样式系统
- **SSE (Server-Sent Events)** - 实时流式响应

### 数据存储结构

```
data/novels/{novel-id}/
├── meta.json            # 小说元信息
├── world_setting.json   # 世界观
├── characters.json      # 人物库
├── outline.json         # 大纲
├── chapters/            # 章节目录
└── state/               # 状态追踪
    ├── timeline.json
    ├── character_states.json
    └── foreshadowing.json
```

### API 设计模式

- **RESTful** - 小说/章节/人物 CRUD
- **SSE** - 章节续写流式生成
- **JSON Schema** - 数据模型校验

---

*最后更新: 2026-04-13*