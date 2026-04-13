# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 项目信息

- 项目名称: 灵笔 (book-create-v2)
- 项目定位: **AI 主导的小说生成平台**（单用户使用）
- 目标用户: 非专业写手，AI 负责主导创作
- 项目类型: Web应用（前后端分离）
- Backend: Python + FastAPI + asyncio
- Frontend: React + TypeScript + TailwindCSS
- 包管理器: pip (后端) / pnpm (前端)

**状态**: 📋 项目规划阶段（无源代码）

---

## 常用命令

```bash
# 后端
cd backend
./start.sh                      # 启动开发服务（自动安装依赖）
python3 -m pip install -r requirements.txt  # 安装依赖
python3 -m uvicorn src.interfaces.main:app --reload --port 8000  # 启动服务
pytest                           # 运行测试
pytest tests/unit/test_xxx.py -v # 运行单个测试

# 前端（待创建）
cd web-front
pnpm install                     # 安装依赖
pnpm dev                         # 启动开发服务
pnpm build                       # 构建生产版本
pnpm test                        # 运行测试

# 小说数据操作（待实现）
python scripts/create_novel.py --title "小说名称" --genre "都市职场"
python scripts/generate_outline.py --novel-id {id}
python scripts/write_chapter.py --novel-id {id} --chapter 1
python scripts/validate_novel.py --novel-id {id}
```

**API 访问地址**:
- API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 核心业务流程

### 小说创作流程（4 阶段）

```
【阶段 1】世界观构建 → 【阶段 2】大纲生成 → 【阶段 3】章节续写 → 【阶段 4】文案校验
```

#### 阶段 1: 世界观构建

**目的**: 建立小说的核心框架，为后续创作提供一致性基础

**输入**: 用户简短描述（如"一个武侠世界的修仙故事"）

**输出**:
- 世界设定文档（时代背景、地理环境、社会结构）
- 核心人物档案（主角、重要配角、反派）
- 核心冲突定义（主线矛盾、情感冲突）
- 关键规则/体系（如修炼体系、魔法规则）

**交互方式**: AI 提出澄清问题 → 用户确认 → AI 完善世界观

#### 阶段 2: 大纲生成

**目的**: 规划小说整体结构，确保故事节奏合理

**输入**: 世界观文档 + 用户期望（章节数量、故事走向偏好）

**输出**:
- 卷/篇章划分（如"第一卷：少年崛起"）
- 分章大纲（每章核心事件、转折点）
- 人物成长曲线（主角在各阶段的成长）
- 剧情伏笔清单（需要埋下的伏笔及回收时机）

**交互方式**: AI 生成大纲方案 → 用户选择/调整 → AI 确定大纲

#### 阶段 3: 章节续写

**目的**: 根据大纲逐章生成正文内容

**输入**: 大纲 + 上一章节内容（如有） + 用户特别要求

**输出**:
- 章节正文（完整叙事内容）
- 本章人物状态更新（人物关系变化、能力变化）
- 本章伏笔状态（已埋伏笔、已回收伏笔）
- 本章总结（核心事件摘要）

**交互方式**: 
- 自动模式：AI 按大纲自动续写
- 交互模式：用户指定本章重点 → AI 生成 → 用户调整

#### 阶段 4: 文案校验

**目的**: 确保内容质量，避免逻辑矛盾和明显错误

**校验维度**:

| 维度 | 检查内容 | 处理方式 |
|------|----------|----------|
| **逻辑一致性** | 时间线矛盾、人物行为不合理、前后设定冲突 | 标记问题 → 提出修正建议 → 用户确认修改 |
| **语法规范** | 错别字、标点错误、句子不通顺 | 自动修正 → 高置信度直接改，低置信度标记 |
| **风格一致性** | 语言风格突变、叙事视角混乱 | 标记问题 → 提出统一建议 |
| **人物一致性** | 人物性格突变、称呼前后不一致 | 标记问题 → 提出修正建议 |

**交互方式**: AI 自动校验 → 输出问题清单 → 用户确认修改 → AI 执行修改

---

### 核心数据结构

```
小说 (Novel)
├── 世界观 (WorldSetting)
│   ├── 背景（时代、地理、社会）
│   ├── 规则体系（修炼/魔法等）
│   └── 核心冲突
├── 人物库 (CharacterLibrary)
│   ├── 主角档案（性格、能力、目标）
│   ├── 配角档案
│   └── 人物关系图谱
├── 大纲 (Outline)
│   ├── 卷划分
│   └── 章节规划（每章事件、转折）
├── 正文 (Content)
│   ├── 章节（Chapter）
│   │   ├── 正文内容
│   │   ├── 本章事件摘要
│   │   └── 人物状态更新
├── 状态追踪 (StateTracker)
│   ├── 时间线（事件发生顺序）
│   ├── 人物状态（位置、能力、关系）
│   ├── 伏笔状态（已埋/待回收）
```

---

### 数据模型 JSON 结构定义 ⭐

#### 1. meta.json（小说元信息）

```json
{
  "novel_id": "novel-001",
  "title": "剑破苍穹",
  "genre": "武侠修仙",
  "theme": ["成长", "复仇", "友情"],
  "target_chapters": 200,
  "status": "writing",
  "created_at": "2026-04-11T10:00:00Z",
  "updated_at": "2026-04-11T15:30:00Z",
  "current_phase": "chapter_writing",
  "completed_chapters": 5,
  "word_count": 15000
}
```

#### 2. world_setting.json（世界观）

```json
{
  "novel_id": "novel-001",
  "version": 1,
  "background": {
    "era": "古代架空",
    "era_name": "大周王朝",
    "geography": {
      "world_name": "九州大陆",
      "regions": [
        {"name": "中原", "description": "王朝核心，繁华富庶"},
        {"name": "北境", "description": "苦寒之地，武风盛行"},
        {"name": "南疆", "description": "神秘蛮荒，灵药遍地"}
      ]
    },
    "society": {
      "power_structure": "皇权统治，宗门并立",
      "social_classes": ["皇室贵族", "宗门修士", "江湖侠客", "平民百姓"],
      "key_institutions": ["朝廷", "五大宗门", "江湖联盟"]
    }
  },
  "power_system": {
    "name": "灵气修炼体系",
    "levels": [
      {"name": "凡人", "rank": 0, "description": "无灵气，普通武者"},
      {"name": "筑基", "rank": 1, "description": "初入修炼，凝聚灵气"},
      {"name": "金丹", "rank": 2, "description": "灵气化丹，脱胎换骨"},
      {"name": "元婴", "rank": 3, "description": "丹破婴生，神魂双修"},
      {"name": "化神", "rank": 4, "description": "婴化神念，接近天道"}
    ],
    "key_rules": [
      "灵气需从天地汲取，修炼需闭关",
      "境界越高，寿命越长",
      "突破需渡劫，失败则重伤或死亡"
    ]
  },
  "core_conflict": {
    "main_conflict": {
      "type": "复仇",
      "description": "主角家族被灭，誓要查明真相复仇",
      "antagonist": "神秘宗门"
    },
    "sub_conflicts": [
      {"type": "成长", "description": "主角从凡人成长为强者"},
      {"type": "情感", "description": "主角与青梅竹马的纠葛"}
    ]
  },
  "special_elements": [
    {"name": "天剑", "type": "法宝", "description": "主角祖传神剑"},
    {"name": "灵石", "type": "资源", "description": "修炼必需品"}
  ]
}
```

#### 3. characters.json（人物库）

```json
{
  "novel_id": "novel-001",
  "version": 1,
  "characters": [
    {
      "character_id": "char-001",
      "name": "林剑锋",
      "role": "主角",
      "age": 18,
      "gender": "男",
      "appearance": "身材修长，剑眉星目，气质冷峻",
      "personality": ["坚韧", "冷静", "重情义", "嫉恶如仇"],
      "background": "世家子弟，家族被灭后流落江湖",
      "abilities": {
        "cultivation_level": "筑基初期",
        "skills": ["剑法", "轻功", "灵气控制"],
        "special_ability": "天剑传承"
      },
      "goals": ["查明家族灭门真相", "复仇", "成为强者"],
      "emotional_arc": {
        "love_interest": "char-002",
        "current_stage": "深厚感情",
        "key_milestones": [
          {"chapter": 1, "event": "青梅竹马，深厚羁绊"},
          {"chapter": 5, "event": "分离后思念加深"}
        ]
      },
      "relationships": [
        {"target_id": "char-002", "type": "青梅竹马", "status": "深厚"},
        {"target_id": "char-003", "type": "师徒", "status": "新建立"}
      ],
      "current_state": {
        "location": "北境剑宗",
        "physical": "健康",
        "emotional": "复仇心切",
        "equipment": ["天剑", "筑基丹"]
      }
    },
    {
      "character_id": "char-002",
      "name": "苏婉儿",
      "role": "女主角",
      "age": 17,
      "gender": "女",
      "appearance": "清丽脱俗，如出水芙蓉",
      "personality": ["温柔", "聪慧", "坚强", "善解人意"],
      "background": "与主角青梅竹马，家族幸存",
      "abilities": {
        "cultivation_level": "凡人",
        "skills": ["医术", "琴艺"],
        "special_ability": "无"
      },
      "goals": ["陪伴主角", "学习医术救人"],
      "relationships": [
        {"target_id": "char-001", "type": "青梅竹马", "status": "深厚"}
      ]
    },
    {
      "character_id": "char-003",
      "name": "剑无痕",
      "role": "重要配角",
      "character_type": "导师",
      "age": 45,
      "gender": "男",
      "appearance": "须发皆白，仙风道骨",
      "personality": ["淡泊", "睿智", "严厉", "护短"],
      "background": "北境剑宗宗主，隐世强者",
      "abilities": {
        "cultivation_level": "化神中期",
        "skills": ["剑道巅峰", "灵气掌控"],
        "special_ability": "天剑秘法"
      },
      "goals": ["培养主角", "维护宗门"]
    }
  ],
  "relationship_graph": {
    "edges": [
      {"from": "char-001", "to": "char-002", "type": "love", "strength": 90},
      {"from": "char-001", "to": "char-003", "type": "mentor", "strength": 70},
      {"from": "char-002", "to": "char-001", "type": "love", "strength": 90}
    ]
  }
}
```

#### 4. outline.json（大纲）

```json
{
  "novel_id": "novel-001",
  "version": 1,
  "volumes": [
    {
      "volume_id": "vol-001",
      "name": "第一卷：少年崛起",
      "chapters_range": {"start": 1, "end": 50},
      "theme": "成长与复仇之路开始",
      "arc_summary": "主角从家族灭门中幸存，拜入剑宗，开始修炼之路"
    }
  ],
  "chapters": [
    {
      "chapter_num": 1,
      "title": "灭门之夜",
      "volume_id": "vol-001",
      "key_events": [
        "主角家族在深夜被神秘势力灭门",
        "主角在父亲掩护下逃脱",
        "主角发誓复仇"
      ],
      "turning_points": [
        {"event": "家族灭门", "type": "悲剧", "impact": "主角命运彻底改变"}
      ],
      "character_growth": [
        {"character_id": "char-001", "change": "从世家子弟变为复仇者"}
      ],
      "foreshadowing": [
        {"id": "fs-001", "hint": "神秘黑衣人使用天剑秘法", "recycle_chapter": 25}
      ]
    },
    {
      "chapter_num": 2,
      "title": "流落江湖",
      "volume_id": "vol-001",
      "key_events": [
        "主角在逃亡中遭遇追杀",
        "偶遇剑宗宗主",
        "被收为弟子"
      ],
      "turning_points": [
        {"event": "拜入剑宗", "type": "机遇", "impact": "获得修炼机会"}
      ]
    }
  ],
  "character_growth_curve": [
    {"chapter_range": "1-10", "character_id": "char-001", "growth": "心态从崩溃到坚定"},
    {"chapter_range": "11-30", "character_id": "char-001", "growth": "修为从凡人到筑基"}
  ],
  "foreshadowing_plan": [
    {"id": "fs-001", "hint": "神秘黑衣人身份", "recycle_chapter": 25, "status": "pending"},
    {"id": "fs-002", "hint": "天剑隐藏力量", "recycle_chapter": 40, "status": "pending"}
  ]
}
```

#### 5. chapter_xxx.json（章节）

```json
{
  "novel_id": "novel-001",
  "chapter_num": 1,
  "title": "灭门之夜",
  "version": 1,
  "created_at": "2026-04-11T10:00:00Z",
  "content": "夜色如墨，林府大院本该是灯火通明...\n\n（正文内容，约3000-5000字）",
  "word_count": 3500,
  "summary": {
    "key_events": [
      "深夜，神秘黑衣人袭击林府",
      "林父拼死抵抗，掩护儿子逃脱",
      "林剑锋目睹家族覆灭，发誓复仇"
    ],
    "emotional_tone": "悲壮、绝望、愤怒"
  },
  "character_updates": [
    {
      "character_id": "char-001",
      "location_change": {"from": "林府", "to": "逃亡中"},
      "emotional_change": {"from": "平静", "to": "崩溃→愤怒"},
      "ability_change": null,
      "relationship_changes": [
        {"target_id": "char-father", "type": "父亲", "status": "死亡"}
      ]
    }
  ],
  "foreshadowing_updates": [
    {"id": "fs-001", "action": "埋下", "detail": "黑衣人使用天剑秘法残影"}
  ],
  "timeline_additions": [
    {"event": "林府灭门", "time": "大周王朝第103年春夜", "order": 1}
  ],
  "validation_status": {
    "last_validated": "2026-04-11T12:00:00Z",
    "issues_found": 0,
    "issues_fixed": 0
  }
}
```

#### 6. state/timeline.json（时间线）

```json
{
  "novel_id": "novel-001",
  "events": [
    {
      "order": 1,
      "chapter": 1,
      "time": "大周王朝第103年春夜",
      "event": "林府灭门",
      "participants": ["char-001", "char-father", "神秘黑衣人"],
      "location": "林府",
      "significance": "high"
    },
    {
      "order": 2,
      "chapter": 2,
      "time": "大周王朝第103年春次日",
      "event": "主角逃亡遇剑宗宗主",
      "participants": ["char-001", "char-003"],
      "location": "北境荒野",
      "significance": "high"
    }
  ],
  "time_scale": {
    "unit": "天",
    "current_time": "大周王朝第103年春",
    "total_duration": "预计跨越5年"
  }
}
```

#### 7. state/character_states.json（人物状态）

```json
{
  "novel_id": "novel-001",
  "last_updated_chapter": 5,
  "states": [
    {
      "character_id": "char-001",
      "current_location": "北境剑宗",
      "cultivation_level": "筑基初期",
      "physical_health": "健康",
      "emotional_state": "复仇心切，但有控制",
      "emotional_details": {
        "toward_work": "专注修炼，渴望突破",
        "toward_love": "思念苏婉儿，隐忍不发",
        "overall_mood": "沉重但有希望"
      },
      "love_progress": {
        "target": "char-002",
        "stage": "deep_bond",
        "stage_progress": 80,
        "recent_event": "分离后思念加深"
      },
      "equipment": ["天剑", "筑基丹"],
      "relationships_current": [
        {"target_id": "char-002", "status": "分离中，思念"},
        {"target_id": "char-003", "status": "师徒，尊敬"}
      ],
      "goals_progress": {
        "复仇": "调查进行中",
        "修炼": "筑基初期，进展正常"
      }
    }
  ]
}
```

#### 8. state/foreshadowing.json（伏笔状态）

```json
{
  "novel_id": "novel-001",
  "foreshadowings": [
    {
      "id": "fs-001",
      "hint": "神秘黑衣人使用天剑秘法残影",
      "planted_chapter": 1,
      "planned_recycle_chapter": 25,
      "recycle_chapter": null,
      "status": "planted",
      "significance": "high",
      "resolution_hint": "黑衣人是剑宗叛徒"
    },
    {
      "id": "fs-002",
      "hint": "天剑在关键时刻闪过奇光",
      "planted_chapter": 3,
      "planned_recycle_chapter": 40,
      "status": "planted",
      "significance": "medium"
    }
  ],
  "statistics": {
    "total_planted": 2,
    "recycled": 0,
    "pending": 2
  }
}
```

---

### 技术约束（AI 生成相关）

#### 1. 内容生成约束

- **一致性优先**: 生成新内容时必须校验与已有内容的兼容性
- **状态追踪**: 每章生成后必须更新时间线、人物状态、伏笔状态
- **可控性**: 用户可指定生成方向（如"本章重点写感情戏"）

#### 2. 文案校验约束

- **校验时机**: 每章完成后自动校验 + 全书完成后全文校验
- **置信度阈值**: 高置信度问题自动修复，低置信度问题标记等待用户确认
- **不可破坏**: 校验修改不能改变原意，只能修正错误

#### 3. 存储约束

- **版本管理**: 每次修改生成新版本，保留历史版本
- **增量存储**: 章节独立存储，支持单章回滚
- **状态分离**: 正文与状态追踪分开存储，便于校验

---

### 文案校验规则详解 ⭐

#### 校验维度与规则

##### 1. 逻辑一致性校验

| 规则ID | 规则名称 | 检查逻辑 | 触发条件 | 处理方式 |
|--------|----------|----------|----------|----------|
| L001 | 时间线矛盾 | 比对 timeline.json 与新章节时间描述 | 时间描述与已记录时间冲突 | 标记问题，提出修正建议 |
| L002 | 地点矛盾 | 比对 character_states.json 人物位置 | 人物出现在不可能的位置（如上一章在北境，本章突然在南方） | 标记问题，检查是否遗漏移动描述 |
| L003 | 能力越级 | 比对 character_states.json 人物能力等级 | 人物做出超出当前能力的行为（如凡人施展元婴技能） | 标记问题，检查是否有修炼突破描述 |
| L004 | 设定冲突 | 比对 world_setting.json 世界规则 | 违反世界观设定（如低境界人物长生不老） | 标记问题，提出修正建议 |
| L005 | 人物行为矛盾 | 比对 characters.json 人物性格设定 | 人物行为与性格设定严重不符（如冷静性格突然暴躁） | 标记问题，检查是否有心理变化描述 |

##### 2. 语法规范校验

| 规则ID | 规则名称 | 检查逻辑 | 置信度阈值 | 处理方式 |
|--------|----------|----------|------------|----------|
| G001 | 错别字检查 | 常见错字词典匹配 + 语义分析 | 高置信度(>90%) → 自动修正；低置信度 → 标记 |
| G002 | 标点错误 | 标点使用规则检查 | 高置信度(>95%) → 自动修正 |
| G003 | 句子不通顺 | 语法结构分析 | 标记问题，提出改写建议 |
| G004 | 重复用词 | 同一段落内重复词语检测 | 标记问题，提出替换建议 |
| G005 | 空格/格式错误 | 格式规范检查 | 高置信度 → 自动修正 |

##### 3. 风格一致性校验

| 规则ID | 规则名称 | 检查逻辑 | 触发条件 | 处理方式 |
|--------|----------|----------|----------|----------|
| S001 | 语言风格突变 | 比对前10章风格特征 | 风格偏离度过高（如文言文突变白话） | 标记问题，提出统一建议 |
| S002 | 叙事视角混乱 | 检测叙事人称变化 | 同一章节内人称切换（如第一人称突然变第三人称） | 标记问题，提出修正建议 |
| S003 | 文风时代错位 | 比对 world_setting.json 时代设定 | 使用与设定时代不符的词汇（如古代用现代词） | 标记问题，提出替换建议 |

##### 4. 人物一致性校验

| 规则ID | 规则名称 | 检查逻辑 | 触发条件 | 处理方式 |
|--------|----------|----------|----------|----------|
| P001 | 称呼不一致 | 比对 characters.json 人物名称 | 同一人物在同一章节内称呼变化（如"林剑锋"变"林少侠"） | 标记问题，统一建议 |
| P002 | 人物消失 | 比对前章出现人物 | 重要人物无故消失（如上一章在场，本章未提及去向） | 标记问题，检查是否有退场描述 |
| P003 | 外貌描述矛盾 | 比对 characters.json 外貌设定 | 外貌描述与设定严重不符 | 标记问题，提出修正建议 |
| P004 | 关系突变 | 比对 characters.json 关系图谱 | 人物关系未说明突变（如敌人变朋友无过渡） | 标记问题，检查是否有关系变化描述 |

##### 5. 伏笔一致性校验

| 规则ID | 规则名称 | 检查逻辑 | 触发条件 | 处理方式 |
|--------|----------|----------|----------|----------|
| F001 | 伏笔遗漏回收 | 比对 foreshadowing.json 待回收伏笔 | 到达回收章节但未回收 | 标记提醒，提示伏笔内容 |
| F002 | 伏笔提前回收 | 比对 foreshadowing.json 计划回收章节 | 提前回收伏笔但无铺垫 | 标记问题，检查是否需要增加铺垫 |
| F003 | 伏笔回收不符 | 比对伏笔 resolution_hint | 回收内容与预设不符（如黑衣人身份变了） | 标记问题，用户确认 |

##### 6. 商业逻辑校验（都市职场专项）⭐

| 规则ID | 规则名称 | 检查逻辑 | 触发条件 | 处理方式 |
|--------|----------|----------|----------|----------|
| B001 | 利益动机缺失 | 检查商业行为是否有明确的利益动机描述 | 重要商业决策（投资、合作、背叛）无动机说明 | 标记问题，提示补充动机 |
| B002 | 决策成本失衡 | 检查商业决策的成本收益是否合理 | 决策成本远高于收益且无解释 | 标记问题，检查是否有特殊理由 |
| B003 | 权限越界 | 检查人物行为是否超出其职位权限 | 人物做出超出职位权限的决策 | 标记问题，检查是否有授权描述 |
| B004 | 时间线商业矛盾 | 检查商业事件的时间合理性 | 商业事件时间不合理（如一夜完成并购） | 标记问题，提示补充过渡时间 |
| B005 | 资金来源不明 | 检查资金使用是否有来源说明 | 大额资金使用无来源描述 | 标记问题，提示补充资金来源 |
| B006 | 行业常识冲突 | 检查是否符合行业基本常识 | 违反行业常识（如金融术语错误） | 标记问题，提出修正建议 |
| B007 | 博弈逻辑跳跃 | 检查博弈过程是否有完整推理 | 博弈结果直接跳过推理过程 | 标记问题，提示补充博弈细节 |
| B008 | 股权/权力变更缺失 | 检查重要股权或权力变更是否有记录 | 股权变更未在状态中更新 | 标记问题，提示更新人物状态 |

##### 7. 感情线校验（都市职场专项）⭐

| 规则ID | 规则名称 | 检查逻辑 | 触发条件 | 处理方式 |
|--------|----------|----------|----------|----------|
| E001 | 感情动机缺失 | 检查感情产生是否有合理动机描述 | 重要感情变化（表白、分手、暧昧）无动机说明 | 标记问题，提示补充动机（如：为什么爱上、为什么分手） |
| E002 | 感情进展过快 | 检查感情发展是否有合理节奏 | 感情状态跨越过快（如陌生→恋人无过渡章节） | 标记问题，检查是否有过渡描写（至少需要暧昧、试探阶段） |
| E003 | 感情反应失当 | 检查情感反应是否符合人物性格设定 | 人物情感反应与性格矛盾（如冷静理性者突然情绪失控无解释） | 标记问题，检查是否有触发事件或心理变化描述 |
| E004 | 感情状态未更新 | 检查人物情感状态变化是否在 character_states.json 中记录 | 重要感情变化未更新情感状态 | 标记问题，提示更新人物状态（emotional_state 字段） |
| E005 | 感情冲突未解决 | 检查感情矛盾是否有明确解决过程 | 感情冲突出现后消失无交代（如误会→和解无过程） | 标记问题，提示补充冲突解决过程 |
| E006 | 感情互动越界 | 检查人物互动是否符合当前关系设定 | 互动方式与关系类型不符（如上下级关系却有恋人互动） | 标记问题，检查关系类型是否正确或互动是否合理 |
| E007 | 感情线比例失衡 | 检查感情线篇幅占比是否合理 | 单章感情内容占比 > 60%（都市职场应有事业线平衡） | 标记问题，提示平衡感情线与事业线比例 |
| E008 | 感情转折无铺垫 | 检查感情重要转折是否有铺垫 | 感情转折突兀（如突然表白、突然分手）无前兆 | 标记问题，检查是否有铺垫事件或心理变化 |

#### 校验执行时机

| 时机 | 校验范围 | 校验规则 | 输出 |
|------|----------|----------|------|
| **单章完成后** | 当前章节 | L001-L005, G001-G005, S001-S003, P001-P004, F001-F003, B001-B008, E001-E008 | 章节校验报告 |
| **全书完成后** | 全书全文 | L001-L005（跨章检查）, F001（全部伏笔检查）, E002/E004（感情线完整检查） | 全书校验报告 |
| **用户手动触发** | 指定范围 | 用户选择规则 | 自定义校验报告 |

#### 校验报告格式

```json
{
  "novel_id": "novel-001",
  "chapter_num": 5,
  "validated_at": "2026-04-11T12:00:00Z",
  "validation_type": "single_chapter",
  "issues": [
    {
      "issue_id": "ISS-001",
      "rule_id": "L001",
      "severity": "high",
      "confidence": 85,
      "description": "时间线矛盾：本章描述'三天后'，但上一章结尾'次日'，仅隔一天",
      "location": {"start_line": 150, "end_line": 155},
      "suggestion": "改为'次日清晨'或增加过渡描述",
      "auto_fix_available": false,
      "status": "pending"
    },
    {
      "issue_id": "ISS-002",
      "rule_id": "G001",
      "severity": "low",
      "confidence": 95,
      "description": "错别字：'此刻'应为'这刻'（文言风格）",
      "location": {"start_line": 80},
      "suggestion": "修正为'这刻'",
      "auto_fix_available": true,
      "auto_fix_text": "这刻",
      "status": "auto_fixed"
    }
  ],
  "statistics": {
    "total_issues": 2,
    "high_severity": 1,
    "low_severity": 1,
    "auto_fixed": 1,
    "pending": 1
  }
}
```

---

### AI 生成 Prompt 设计模板 ⭐

#### Prompt 设计原则

| 原则 | 说明 | 示例 |
|------|------|------|
| **上下文注入** | Prompt 必须包含已有世界观、人物状态等上下文 | "参考以下世界观设定：{world_setting}" |
| **约束明确** | 明确禁止违反红线规则 | "禁止创造与已有设定矛盾的新规则" |
| **输出结构化** | 要求输出结构化内容便于解析 | "输出 JSON 格式，包含：title, content, summary" |
| **风格一致** | 指定语言风格与小说类型匹配 | "使用文言文风格，符合武侠小说语感" |
| **可控生成** | 提供用户指定参数的接口 | "重点描写：{user_focus}，其他事件简略" |

#### 1. 世界观生成 Prompt

```markdown
# 任务：生成小说世界观

## 用户输入
{user_description}

## 输出要求
请生成完整的世界观设定，输出为 JSON 格式，包含以下字段：

### background（背景设定）
- era: 时代类型（古代架空/现代/未来/异世界）
- era_name: 具体时代名称
- geography: 地理设定，包含：
  - world_name: 世界名称
  - regions: 至少3个主要地区，每个包含 name, description
- society: 社会设定，包含：
  - power_structure: 权力结构描述
  - social_classes: 社会阶层列表（至少3层）
  - key_institutions: 关键机构（至少2个）

### power_system（能力体系）
- name: 体系名称
- levels: 能力等级列表（至少4级），每个包含 name, rank, description
- key_rules: 规则列表（至少3条核心规则）

### core_conflict（核心冲突）
- main_conflict: 主线冲突，包含 type, description, antagonist
- sub_conflicts: 子冲突列表（至少2个）

### special_elements（特殊元素）
至少包含2个特殊元素（法宝、资源、组织等）

## 约束条件
1. 所有设定必须自洽，不能存在内部矛盾
2. 能力体系必须有明确的等级和晋升规则
3. 核心冲突必须能支撑至少50章的故事发展

## 输出格式
输出严格遵循 world_setting.json 结构定义
```

#### 2. 大纲生成 Prompt

```markdown
# 任务：生成小说大纲

## 输入上下文

### 世界观设定
{world_setting_json}

### 用户期望
- 目标章节数: {target_chapters}
- 故事走向偏好: {story_preference}
- 节奏偏好: {pacing_preference}

## 输出要求
请生成完整的大纲，输出为 JSON 格式，包含以下字段：

### volumes（卷划分）
根据章节总数划分卷，每卷包含：
- volume_id, name, chapters_range, theme, arc_summary

### chapters（章节规划）
为前20章生成详细规划（后续章节可简化），每章包含：
- chapter_num, title, volume_id
- key_events: 核心事件列表（每章至少2个）
- turning_points: 转折点列表（重要章节必须包含）
- character_growth: 人物成长变化
- foreshadowing: 需要埋下的伏笔

### character_growth_curve（人物成长曲线）
定义主要人物在各阶段的变化

### foreshadowing_plan（伏笔计划）
列出主要伏笔及其回收时机

## 纾束条件
1. 禁止与世界观设定冲突
2. 每卷必须有明确的主题和故事弧线
3. 伏笔回收时机必须在合理范围内（不超过50章间隔）
4. 主线冲突必须在大纲中逐步推进

## 输出格式
输出严格遵循 outline.json 结构定义
```

#### 3. 章节续写 Prompt

```markdown
# 任务：续写小说章节

## 输入上下文 ⭐ 必须校验一致性

### 世界观设定
{world_setting_json}

### 人物库
{characters_json}

### 大纲（当前章节）
{current_chapter_outline}

### 时间线状态
{timeline_json}

### 人物当前状态
{character_states_json}

### 上一章内容（如有）
{previous_chapter_json}

### 用户特别要求（如有）
{user_special_request}

## 输出要求
请续写第 {chapter_num} 章，输出为 JSON 格式，包含以下字段：

### content（正文内容）
- 完整的叙事内容，约3000-5000字
- 必须符合章节大纲中的 key_events
- 语言风格与已有章节一致

### summary（章节摘要）
- key_events: 本章核心事件列表
- emotional_tone: 本章情感基调

### character_updates（人物状态更新）
- 本章中发生变化的人物，包含：
  - location_change, emotional_change, ability_change, relationship_changes

### timeline_additions（时间线新增）
- 本章新增的时间节点事件

### foreshadowing_updates（伏笔状态更新）
- 本章埋下或回收的伏笔

## 纾束条件 ⭐ 红线规则
1. 禁止与时间线状态矛盾（时间必须连续）
2. 禁止与人物位置状态矛盾（人物位置变化必须有描述）
3. 禁止与人物能力等级矛盾（能力表现不能越级）
4. 禁止与世界观设定矛盾
5. 必须覆盖大纲中的所有 key_events
6. 伏笔操作必须与 foreshadowing.json 一致

## 写作风格指南
- 叙事视角: {narrative_perspective}
- 语言风格: {language_style}
- 情感基调: {emotional_tone}

## 输出格式
输出严格遵循 chapter_xxx.json 结构定义
```

#### 4. 文案校验 Prompt

```markdown
# 任务：文案校验

## 输入上下文

### 当前章节内容
{chapter_json}

### 校验规则
{validation_rules}

### 参考数据
- world_setting.json
- characters.json
- timeline.json
- character_states.json
- foreshadowing.json
- previous_chapters（最近3章）

## 校验范围
1. 逻辑一致性校验（L001-L005）
2. 语法规范校验（G001-G005）
3. 风格一致性校验（S001-S003）
4. 人物一致性校验（P001-P004）
5. 伏笔一致性校验（F001-F003）
6. 商业逻辑校验（B001-B008）⭐ 都市职场专项
7. 感情线校验（E001-E008）⭐ 都市职场专项

## 输出要求
输出校验报告，JSON 格式，包含：
- issues: 问题列表，每个问题包含：
  - issue_id, rule_id, severity, confidence
  - description, location, suggestion
  - auto_fix_available, auto_fix_text（如可自动修复）
  - status: pending/auto_fixed
- statistics: 统计信息

## 纾束条件 ⭐ 红线规则
1. 低置信度问题（<80%）必须标记为 pending
2. 高置信度语法问题（>95%）可自动修复
3. 逻辑问题不能自动修复，必须等待用户确认
4. 校验修改不能改变原意
```

---

## Agent Team 配置

本项目已配置完整的 Agent Team 工作流框架，包含 10 个角色。

### 日常入口

- `/pm` - 项目经理（统一入口，日常首选）

### 角色命令

```bash
# 决策层
/product-manager   # 产品经理（需求评估）
/architect         # 架构师（技术方案）
/pm                # 项目经理（任务调度）

# 执行层
/backend           # 后端开发
/frontend          # 前端开发

# 支持层
/qa                # 质量保障
/reviewer          # 代码审查
/diagnostic        # 诊断分析师
```

### 特殊技能

```bash
/pua               # 提示词升级助手
/prd               # 生成产品需求文档
/kaigong           # 开工技能（恢复工作会话）
/shougong          # 收工技能（结束工作会话）
```

---

## 🔴 5 条红线（强制遵守）

### 开发红线（3 条）

1. **【强制】新需求必须先 brainstorming → Architect 设计 +2 个方案 → 用户确认**
   - 禁止跳过设计直接编码
   - 禁止闷头写文档不经用户确认

2. **【强制】任务分解必须识别并行簇和依赖关系**
   - 使用 TaskCreate + TaskUpdate 设置依赖
   - 前后端独立任务可并行执行

3. **【强制】测试前必须用户确认（耗时 30-60 分钟）**
   - 禁止未经确认直接运行测试

### 内容生成红线（2 条）⭐ 灵笔特有

4. **【强制】生成内容前必须校验一致性**
   - 新章节生成前必须读取：世界观、人物状态、时间线、大纲
   - 禁止在不了解已有内容的情况下凭空生成

5. **【强制】文案校验不能改变原意**
   - 校验修改只能修正错误，不能改变叙事内容或人物设定
   - 低置信度问题必须标记等待用户确认，禁止自动修改

---

## 进度管理规范

### 三文件管理（强制）

所有复杂任务必须使用 `planning-with-files-zh` 技能：

| 文件 | 路径 | 用途 |
|------|------|------|
| task_plan.md | docs/planning/task_plan.md | 任务计划与阶段追踪 |
| findings.md | docs/planning/findings.md | 研究发现与技术笔记 |
| progress.md | docs/planning/progress.md | 进度日志与会话记录 |

**违反后果**: 上下文丢失后无法追溯进度

### 会话交接规范

每个会话结束时创建交接文档：
- `docs/planning/<session-id>-handoff.md`
- 内容包括：已完成工作、问题清单、下一步计划、文件索引
- Git 提交并推送

---

## 文件边界规则

### 开发代码边界

| 目录 | Frontend | Backend | QA | Reviewer |
|------|----------|---------|----|----------|
| web-front/** | ✅ 全权 | ❌ | ⚠️ | 🔍 |
| src/** | ❌ | ✅ 全权 | ⚠️ | 🔍 |
| tests/** | ⚠️ | ⚠️ | ✅ | ✅ |
| config/** | ❌ | ✅ | ❌ | 🔍 |

### 小说数据边界 ⭐ 灵笔特有

| 目录 | Backend | Frontend | 说明 |
|------|---------|----------|------|
| data/novels/** | ✅ 全权 | ⚠️ 仅读取 | 小说数据存储（世界观、大纲、章节） |
| data/novels/*/versions/** | ✅ | ❌ | 版本历史，前端不直接访问 |
| data/novels/*/state/** | ✅ | ⚠️ | 状态追踪（时间线、人物状态） |

**图例**: ✅ 全权 | ❌ 禁止 | ⚠️ 有限 | 🔍 仅审查

---

## 复杂任务工作流

```
【阶段 0】需求接收 → 【阶段 1】契约设计 → 【阶段 2】任务分解 → 【阶段 3】并行开发
                                                                    ↓
【阶段 6】提交汇报 ←─【阶段 5】测试执行 ←─【阶段 4】审查验证 ←──────────┘
```

**核心原则**:
1. 契约先行：先写接口契约表
2. 并行执行：前后端独立任务并行
3. 自动审查：Reviewer 对照契约表检查
4. 阶段 4 完成、阶段 5 启动前必须通知用户确认

---

## 配置文件位置

```
.claude/
├── settings.json              # 技能与子 Agent 配置
├── TEAM-SETUP-SUMMARY.md      # 团队配置总结
├── team/
│   ├── README.md              # 团队角色说明
│   ├── project-manager/SKILL.md
│   ├── backend-dev/SKILL.md
│   ├── frontend-dev/SKILL.md
│   ├── qa-tester/SKILL.md
│   ├── code-reviewer/SKILL.md
│   ├── architect/SKILL.md
│   └── diagnostic-analyst/SKILL.md
├── commands/                  # 斜杠命令定义
└── skills/                    # 自定义技能
```

---

## 项目目录结构 ⭐ 灵笔特有

```
灵笔/
├── src/                       # 后端源码
│   ├── domain/                # 领域模型
│   │   ├── models/            # 小说数据模型
│   │   │   ├── novel.py       # 小说主体
│   │   │   ├── world_setting.py   # 世界观
│   │   │   ├── character.py   # 人物
│   │   │   ├── chapter.py     # 章节
│   │   │   └── state_tracker.py   # 状态追踪
│   │   └── services/          # 领域服务
│   │       ├── world_builder.py   # 世界观构建
│   │       ├── outline_generator.py   # 大纲生成
│   │       ├── chapter_writer.py   # 章节续写
│   │       └── content_validator.py   # 文案校验
│   ├── application/           # 应用服务
│   │   ├── novel_service.py   # 小说管理服务
│   │   ├── generation_service.py   # AI 生成服务
│   │   └── validation_service.py   # 校验服务
│   ├── infrastructure/        # 基础设施
│   │   ├── ai_provider.py     # AI API 调用
│   │   ├── storage.py         # 数据存储
│   │   └── version_control.py # 版本管理
│   └── interfaces/            # API 接口
│       └ api_novels.py        # 小说相关 API
│       └ api_generation.py    # 生成相关 API
│
├── web-front/                 # 前端源码
│   ├── src/
│   │   ├── pages/             # 页面
│   │   │   ├── NovelList/     # 小说列表页
│   │   │   ├── NovelDetail/   # 小说详情页
│   │   │   ├── WorldBuilder/  # 世界观构建页
│   │   │   ├── OutlineEditor/ # 大纲编辑页
│   │   │   ├── ChapterWriter/ # 章节写作页
│   │   │   └── ValidationReport/  # 校验报告页
│   │   ├── components/        # 组件
│   │   ├── services/          # 前端服务
│   │   └── types/             # TypeScript 类型
│
├── data/                      # 数据存储 ⭐
│   └ novels/                  # 小说数据
│   │   ├── {novel-id}/        # 单本小说
│   │   │   ├── meta.json      # 小说元信息
│   │   │   ├── world_setting.json   # 世界观
│   │   │   ├── characters.json   # 人物库
│   │   │   ├── outline.json   # 大纲
│   │   │   ├── chapters/      # 章节目录
│   │   │   │   ├── chapter_001.json
│   │   │   │   ├── chapter_002.json
│   │   │   │   └── ...
│   │   │   ├── state/         # 状态追踪
│   │   │   │   ├── timeline.json
│   │   │   │   ├── character_states.json
│   │   │   │   └── foreshadowing.json
│   │   │   ├── versions/      # 版本历史
│   │   │   │   ├── v1/
│   │   │   │   ├── v2/
│   │   │   │   └── ...
│   │   │   └── validation_reports/  # 校验报告
│
├── tests/                     # 测试
│   ├── unit/                  # 单元测试
│   │   ├── test_world_builder.py
│   │   ├── test_outline_generator.py
│   │   ├── test_chapter_writer.py
│   │   ├── test_content_validator.py
│   └── integration/           # 集成测试
│
├── config/                    # 配置
│   ├── ai_config.yaml         # AI 模型配置
│   ├── validation_rules.yaml  # 校验规则配置
│   └── app_config.yaml        # 应用配置
│
└── docs/                      # 文档
    ├── planning/              # 规划文档
    ├── designs/               # 设计文档
    └── api/                   # API 文档
```

---

## 新项目初始化清单

**已完成**:
- [x] 创建开发目录结构 (`backend/src/`, `backend/tests/`, `backend/config/`)
- [x] 创建小说数据目录 (`data/novels/`)
- [x] 初始化后端: requirements.txt, main.py, 基础路由
- [x] 定义小说数据模型: Novel, WorldSetting, Character, Chapter, StateTracker, Outline
- [x] 实现基础 API: 创建小说、获取小说列表、获取小说详情、删除小说
- [x] 实现文件存储模块: FileStorage, VersionControl
- [x] 实现AI Provider封装: QwenProvider (流式生成支持)

**待完成**:
- [ ] 初始化前端: package.json, 基础组件
- [ ] 配置测试框架: pytest 单元测试
- [ ] 实现世界观生成API
- [ ] 实现大纲生成API
- [ ] 实现章节续写API（SSE流式）
- [ ] 实现文案校验模块: 36条校验规则
- [ ] 前端页面开发
- [ ] 部署流程文档

---

*本文件继承全局配置 `/Users/supercao/.claude/CLAUDE.md`*
*最后更新: 2026-04-11*