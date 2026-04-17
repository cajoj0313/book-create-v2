# 灵笔项目 MySQL 数据库迁移方案

## 1. 数据库设计

### 1.1 ER 图

```
┌─────────────────────┐
│       novels        │
│─────────────────────│
│ PK novel_id         │
│    title            │
│    genre            │
│    status           │
│    target_chapters  │
│    current_phase    │
│    completed_chapters│
│    word_count       │
│    created_at       │
│    updated_at       │
└──────────┬──────────┘
           │
           │ 1:1
           │
           ▼
┌─────────────────────┐
│    world_settings   │
│─────────────────────│
│ PK id               │
│ FK novel_id         │
│    version          │
│    background       │
│    male_lead        │
│    female_lead      │
│    emotion_arc      │
│    main_conflict    │
│    supporting_chars │
│    created_at       │
└──────────┬──────────┘
           │
           │ 1:1
           │
           ▼
┌─────────────────────┐
│       outlines      │
│─────────────────────│
│ PK id               │
│ FK novel_id         │
│    version          │
│    genre            │
│    main_conflict    │
│    created_at       │
│    updated_at       │
└──────────┬──────────┘
           │
           ├─────────────────────┐
           │                     │
           │ 1:N                 │ 1:N
           ▼                     ▼
┌─────────────────────┐  ┌─────────────────────┐
│    volumes          │  │   outline_chapters  │
│─────────────────────│  │─────────────────────│
│ PK id               │  │ PK id               │
│ FK novel_id         │  │ FK novel_id         │
│ FK outline_id       │  │ FK outline_id       │
│    volume_id        │  │    chapter_num      │
│    name             │  │    title            │
│    chapters_range   │  │    emotion_stage    │
│    theme            │  │    key_events       │
│    arc_summary      │  │    emotion_progress │
│    sort_order       │  │    sort_order       │
└─────────────────────┘  └─────────────────────┘
```

### 1.2 建表语句

```sql
-- 小说主表
CREATE TABLE `novels` (
  `novel_id` VARCHAR(36) PRIMARY KEY COMMENT '小说 ID',
  `title` VARCHAR(255) NOT NULL COMMENT '小说标题',
  `genre` VARCHAR(100) DEFAULT '都市职场' COMMENT '题材类型',
  `theme` JSON COMMENT '主题标签数组',
  `target_chapters` INT DEFAULT 12 COMMENT '目标章节数',
  `status` VARCHAR(50) DEFAULT 'planning' COMMENT '当前状态',
  `current_phase` VARCHAR(50) DEFAULT 'world_building' COMMENT '当前阶段',
  `completed_chapters` INT DEFAULT 0 COMMENT '已完成章节数',
  `word_count` INT DEFAULT 0 COMMENT '总字数',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_status` (`status`),
  INDEX `idx_phase` (`current_phase`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小说主表';

-- 世界观设定表
CREATE TABLE `world_settings` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `novel_id` VARCHAR(36) NOT NULL UNIQUE COMMENT '小说 ID',
  `version` INT DEFAULT 1 COMMENT '版本号',
  `background` JSON COMMENT '背景设定',
  `male_lead` JSON COMMENT '男主设定',
  `female_lead` JSON COMMENT '女主设定',
  `emotion_arc` JSON COMMENT '感情线弧度',
  `theme` JSON COMMENT '故事主题',
  `main_conflict` JSON COMMENT '核心冲突',
  `supporting_chars` JSON COMMENT '配角设定',
  `power_system` JSON COMMENT '能力体系',
  `special_elements` JSON COMMENT '特殊元素',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  INDEX `idx_novel` (`novel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='世界观设定表';

-- 大纲表
CREATE TABLE `outlines` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `novel_id` VARCHAR(36) NOT NULL UNIQUE COMMENT '小说 ID',
  `version` INT DEFAULT 1 COMMENT '版本号',
  `genre` VARCHAR(100) COMMENT '题材',
  `main_conflict` JSON COMMENT '核心冲突',
  `character_growth_curve` JSON COMMENT '人物成长曲线',
  `foreshadowing_plan` JSON COMMENT '伏笔计划',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  INDEX `idx_novel` (`novel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大纲表';

-- 大纲卷表
CREATE TABLE `outline_volumes` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `novel_id` VARCHAR(36) NOT NULL,
  `outline_id` BIGINT NOT NULL,
  `volume_id` VARCHAR(36) COMMENT '卷 ID',
  `name` VARCHAR(255) COMMENT '卷名',
  `chapters_range_start` INT COMMENT '起始章节',
  `chapters_range_end` INT COMMENT '结束章节',
  `theme` TEXT COMMENT '主题',
  `arc_summary` TEXT COMMENT '卷摘要',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  FOREIGN KEY (`outline_id`) REFERENCES `outlines`(`id`) ON DELETE CASCADE,
  INDEX `idx_outline` (`outline_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大纲卷表';

-- 大纲章节表
CREATE TABLE `outline_chapters` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `novel_id` VARCHAR(36) NOT NULL,
  `outline_id` BIGINT NOT NULL,
  `chapter_num` INT NOT NULL COMMENT '章节号',
  `title` VARCHAR(255) COMMENT '章节标题',
  `volume_id` VARCHAR(36) COMMENT '所属卷 ID',
  `key_events` JSON COMMENT '核心事件数组',
  `turning_points` JSON COMMENT '转折点数组',
  `character_growth` JSON COMMENT '人物成长',
  `foreshadowing` JSON COMMENT '伏笔',
  `emotion_stage` VARCHAR(50) COMMENT '感情阶段',
  `emotion_progress` JSON COMMENT '感情进展',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  FOREIGN KEY (`outline_id`) REFERENCES `outlines`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_chapter` (`novel_id`, `chapter_num`),
  INDEX `idx_outline` (`outline_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大纲章节表';

-- 章节正文表
CREATE TABLE `chapters` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `novel_id` VARCHAR(36) NOT NULL,
  `chapter_num` INT NOT NULL COMMENT '章节号',
  `title` VARCHAR(255) COMMENT '章节标题',
  `version` INT DEFAULT 1 COMMENT '版本号',
  `content` LONGTEXT COMMENT '正文内容',
  `word_count` INT DEFAULT 0 COMMENT '字数',
  `summary` JSON COMMENT '章节摘要',
  `character_updates` JSON COMMENT '人物状态更新',
  `foreshadowing_updates` JSON COMMENT '伏笔更新',
  `timeline_additions` JSON COMMENT '时间线新增',
  `validation_status` JSON COMMENT '校验状态',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_chapter` (`novel_id`, `chapter_num`),
  INDEX `idx_novel_chapter` (`novel_id`, `chapter_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='章节正文表';

-- 故事梗概表（短篇小说 MVP 新增）
CREATE TABLE `story_synopsis` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `novel_id` VARCHAR(36) NOT NULL UNIQUE COMMENT '小说 ID',
  `story_content` LONGTEXT COMMENT '故事梗概正文 3000-5000 字',
  `key_plot_points` JSON COMMENT '关键情节节点',
  `character_arc` JSON COMMENT '人物成长弧光',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  INDEX `idx_novel` (`novel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='故事梗概表';

-- 人物库表
CREATE TABLE `characters` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `novel_id` VARCHAR(36) NOT NULL,
  `character_id` VARCHAR(36) COMMENT '人物 ID',
  `name` VARCHAR(100) COMMENT '人物名称',
  `role` VARCHAR(50) COMMENT '角色类型',
  `character_type` VARCHAR(50) COMMENT '人物类型',
  `age` INT COMMENT '年龄',
  `gender` VARCHAR(20) COMMENT '性别',
  `appearance` TEXT COMMENT '外貌描述',
  `personality` JSON COMMENT '性格特点数组',
  `background` TEXT COMMENT '背景故事',
  `inner_wound` TEXT COMMENT '内心创伤',
  `growth_arc` TEXT COMMENT '成长弧光',
  `abilities` JSON COMMENT '能力设定',
  `goals` JSON COMMENT '目标数组',
  `emotional_arc` JSON COMMENT '感情弧线',
  `relationships` JSON COMMENT '人物关系数组',
  `current_state` JSON COMMENT '当前状态',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  INDEX `idx_novel` (`novel_id`),
  INDEX `idx_character` (`character_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='人物库表';

-- 章节版本历史表
CREATE TABLE `chapter_versions` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `chapter_id` BIGINT NOT NULL,
  `novel_id` VARCHAR(36) NOT NULL,
  `chapter_num` INT NOT NULL,
  `version` INT NOT NULL,
  `content` LONGTEXT COMMENT '正文内容',
  `change_summary` TEXT COMMENT '变更摘要',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  INDEX `idx_chapter` (`chapter_id`),
  INDEX `idx_novel_version` (`novel_id`, `chapter_num`, `version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='章节版本历史表';

-- 校验报告表
CREATE TABLE `validation_reports` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `novel_id` VARCHAR(36) NOT NULL,
  `chapter_num` INT COMMENT '章节号，NULL 表示全书校验',
  `validated_at` DATETIME COMMENT '校验时间',
  `validation_type` VARCHAR(50) COMMENT '校验类型',
  `issues` JSON COMMENT '问题列表',
  `statistics` JSON COMMENT '统计信息',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`novel_id`) REFERENCES `novels`(`novel_id`) ON DELETE CASCADE,
  INDEX `idx_novel_chapter` (`novel_id`, `chapter_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='校验报告表';
```

---

## 2. 迁移策略

### 2.1 数据迁移方案

**步骤 1: 导出 JSON 数据**
```python
# scripts/export_json_data.py
import json
import os
from pathlib import Path

def export_all_novels():
    novels_dir = Path("data/novels")
    export_data = []
    
    for novel_dir in novels_dir.iterdir():
        if not novel_dir.is_dir():
            continue
        
        novel_data = {
            "novel_id": novel_dir.name,
            "meta": None,
            "world_setting": None,
            "outline": None,
            "chapters": [],
            "characters": None
        }
        
        # 读取所有 JSON 文件
        for json_file in novel_dir.glob("*.json"):
            with open(json_file) as f:
                key = json_file.stem
                novel_data[key] = json.load(f)
        
        # 读取章节
        chapters_dir = novel_dir / "chapters"
        if chapters_dir.exists():
            for chapter_file in chapters_dir.glob("*.json"):
                with open(chapter_file) as f:
                    novel_data["chapters"].append(json.load(f))
        
        export_data.append(novel_data)
    
    # 保存导出文件
    with open("data/export_all_novels.json", "w", encoding="utf-8") as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)
    
    return export_data
```

**步骤 2: 导入 MySQL**
```python
# scripts/import_to_mysql.py
import json
import pymysql
from datetime import datetime

def import_to_mysql(export_file="data/export_all_novels.json"):
    # 连接数据库
    conn = pymysql.connect(
        host="localhost",
        user="root",
        password="your_password",
        database="lingbi",
        charset="utf8mb4"
    )
    
    with open(export_file) as f:
        novels = json.load(f)
    
    with conn.cursor() as cursor:
        for novel in novels:
            # 插入小说主表
            meta = novel.get("meta", {})
            cursor.execute("""
                INSERT INTO novels (
                    novel_id, title, genre, theme, target_chapters,
                    status, current_phase, completed_chapters, word_count
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                novel["novel_id"],
                meta.get("title", ""),
                meta.get("genre", "都市职场"),
                json.dumps(meta.get("theme", [])),
                meta.get("target_chapters", 12),
                meta.get("status", "planning"),
                meta.get("current_phase", "world_building"),
                meta.get("completed_chapters", 0),
                meta.get("word_count", 0)
            ))
            
            # 插入世界观
            world_setting = novel.get("world_setting")
            if world_setting:
                cursor.execute("""
                    INSERT INTO world_settings (
                        novel_id, version, background, male_lead, female_lead,
                        emotion_arc, theme, main_conflict, supporting_chars,
                        power_system, special_elements
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    novel["novel_id"],
                    world_setting.get("version", 1),
                    json.dumps(world_setting.get("background", {})),
                    json.dumps(world_setting.get("male_lead", {})),
                    json.dumps(world_setting.get("female_lead", {})),
                    json.dumps(world_setting.get("emotion_arc", {})),
                    json.dumps(world_setting.get("theme", {})),
                    json.dumps(world_setting.get("core_conflict", {})),
                    json.dumps(world_setting.get("supporting_chars", [])),
                    json.dumps(world_setting.get("power_system", {})),
                    json.dumps(world_setting.get("special_elements", []))
                ))
            
            # 插入大纲
            outline = novel.get("outline")
            if outline:
                cursor.execute("""
                    INSERT INTO outlines (
                        novel_id, version, genre, main_conflict,
                        character_growth_curve, foreshadowing_plan
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    novel["novel_id"],
                    outline.get("version", 1),
                    outline.get("genre", "都市职场"),
                    json.dumps(outline.get("core_conflict", {})),
                    json.dumps(outline.get("character_growth_curve", [])),
                    json.dumps(outline.get("foreshadowing_plan", []))
                ))
                outline_id = cursor.lastrowid
                
                # 插入大纲卷
                for vol in outline.get("volumes", []):
                    chapters_range = vol.get("chapters_range", {})
                    cursor.execute("""
                        INSERT INTO outline_volumes (
                            novel_id, outline_id, volume_id, name,
                            chapters_range_start, chapters_range_end,
                            theme, arc_summary, sort_order
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        novel["novel_id"],
                        outline_id,
                        vol.get("volume_id", ""),
                        vol.get("name", ""),
                        chapters_range.get("start", 0),
                        chapters_range.get("end", 0),
                        vol.get("theme", ""),
                        vol.get("arc_summary", ""),
                        vol.get("sort_order", 0)
                    ))
                
                # 插入大纲章节
                for ch in outline.get("chapters", []):
                    cursor.execute("""
                        INSERT INTO outline_chapters (
                            novel_id, outline_id, chapter_num, title,
                            volume_id, key_events, turning_points,
                            character_growth, foreshadowing, emotion_stage,
                            emotion_progress, sort_order
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        novel["novel_id"],
                        outline_id,
                        ch.get("chapter_num", 0),
                        ch.get("title", ""),
                        ch.get("volume_id", ""),
                        json.dumps(ch.get("key_events", [])),
                        json.dumps(ch.get("turning_points", [])),
                        json.dumps(ch.get("character_growth", [])),
                        json.dumps(ch.get("foreshadowing", [])),
                        ch.get("emotion_stage", ""),
                        json.dumps(ch.get("emotion_progress", {})),
                        ch.get("sort_order", 0)
                    ))
            
            # 插入章节
            for chapter in novel.get("chapters", []):
                cursor.execute("""
                    INSERT INTO chapters (
                        novel_id, chapter_num, title, version, content,
                        word_count, summary, character_updates,
                        foreshadowing_updates, timeline_additions,
                        validation_status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    novel["novel_id"],
                    chapter.get("chapter_num", 0),
                    chapter.get("title", ""),
                    chapter.get("version", 1),
                    chapter.get("content", ""),
                    chapter.get("word_count", 0),
                    json.dumps(chapter.get("summary", {})),
                    json.dumps(chapter.get("character_updates", [])),
                    json.dumps(chapter.get("foreshadowing_updates", [])),
                    json.dumps(chapter.get("timeline_additions", [])),
                    json.dumps(chapter.get("validation_status", {}))
                ))
            
            # 插入故事梗概
            synopsis = novel.get("story_synopsis")
            if synopsis:
                cursor.execute("""
                    INSERT INTO story_synopsis (
                        novel_id, story_content, key_plot_points, character_arc
                    ) VALUES (%s, %s, %s, %s)
                """, (
                    novel["novel_id"],
                    synopsis.get("story_content", ""),
                    json.dumps(synopsis.get("key_plot_points", [])),
                    json.dumps(synopsis.get("character_arc", {}))
                ))
            
            conn.commit()
    
    conn.close()
```

### 2.2 迁移步骤清单

| 步骤 | 操作 | 预计时间 | 负责人 |
|------|------|----------|--------|
| 1 | 安装 MySQL 8.0+ | 30 分钟 | 后端 |
| 2 | 创建数据库和用户 | 15 分钟 | 后端 |
| 3 | 执行建表 SQL | 15 分钟 | 后端 |
| 4 | 运行导出脚本 | 5 分钟 | 后端 |
| 5 | 运行导入脚本 | 30 分钟 | 后端 |
| 6 | 验证数据完整性 | 60 分钟 | 测试 |
| 7 | 改造 FileStorage 为 MySQLRepository | 4 小时 | 后端 |
| 8 | 更新 GenerationService | 4 小时 | 后端 |
| 9 | 集成测试 | 2 小时 | 测试 |
| 10 | 上线切换 | 30 分钟 | 运维 |

### 2.3 回滚方案

```bash
# 1. 停止应用
systemctl stop lingbi-backend

# 2. 备份 MySQL 数据
mysqldump -u root -p lingbi > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. 恢复文件系统（如有需要）
# git checkout <迁移前的 commit>

# 4. 修改配置回退到文件系统
# 修改 backend/.env: STORAGE_TYPE=filesystem

# 5. 重启应用
systemctl start lingbi-backend
```

---

## 3. 代码改造

### 3.1 ORM 选型：SQLAlchemy

**推荐理由**:
- 成熟的 Python ORM，社区活跃
- 支持异步操作 (asyncpg)
- Alembic 迁移工具
- 类型提示支持良好

### 3.2 新增文件结构

```
backend/
├── src/
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   ├── connection.py       # 数据库连接
│   │   │   ├── models.py           # SQLAlchemy 模型
│   │   │   └── repositories.py     # 数据仓库
│   │   └── ai_provider.py
│   ├── application/
│   │   ├── generation_service.py   # 修改：使用 repository
│   │   └── validation_service.py   # 修改：使用 repository
│   └── interfaces/
│       └── api_*.py                # 无需修改
├── config/
│   ├── database.py                 # 数据库配置
│   └── app_config.yaml
├── alembic/                        # 数据库迁移
│   ├── versions/
│   └── env.py
└── scripts/
    ├── export_json_data.py
    └── import_to_mysql.py
```

### 3.3 核心代码改造示例

**database/connection.py**
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "mysql+aiomysql://root:password@localhost/lingbi"

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

**database/models.py**
```python
from sqlalchemy import Column, String, Integer, DateTime, JSON, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Novel(Base):
    __tablename__ = "novels"
    
    novel_id = Column(String(36), primary_key=True)
    title = Column(String(255), nullable=False)
    genre = Column(String(100), default="都市职场")
    theme = Column(JSON)
    target_chapters = Column(Integer, default=12)
    status = Column(String(50), default="planning")
    current_phase = Column(String(50), default="world_building")
    completed_chapters = Column(Integer, default=0)
    word_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**infrastructure/database/repositories.py**
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .models import Novel, WorldSetting, Outline, Chapter

class NovelRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get(self, novel_id: str) -> Novel | None:
        result = await self.db.execute(
            select(Novel).where(Novel.novel_id == novel_id)
        )
        return result.scalar_one_or_none()
    
    async def create(self, novel: Novel) -> Novel:
        self.db.add(novel)
        await self.db.commit()
        await self.db.refresh(novel)
        return novel
    
    async def update(self, novel_id: str, **kwargs) -> Novel | None:
        novel = await self.get(novel_id)
        if novel:
            for key, value in kwargs.items():
                setattr(novel, key, value)
            await self.db.commit()
            await self.db.refresh(novel)
        return novel

class WorldSettingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_novel(self, novel_id: str) -> WorldSetting | None:
        result = await self.db.execute(
            select(WorldSetting).where(WorldSetting.novel_id == novel_id)
        )
        return result.scalar_one_or_none()
    
    async def save(self, world_setting: WorldSetting) -> WorldSetting:
        self.db.add(world_setting)
        await self.db.commit()
        await self.db.refresh(world_setting)
        return world_setting
```

### 3.4 改造 GenerationService

```python
# 原代码
from ..infrastructure.storage import FileStorage

class GenerationService:
    def __init__(self, storage: FileStorage):
        self.storage = storage
    
    async def generate_world_setting(self, novel_id: str, ...):
        meta = self.storage.load_json(novel_id, "meta.json")
        # ...

# 新代码
from ..infrastructure.database.repositories import NovelRepository, WorldSettingRepository

class GenerationService:
    def __init__(self, novel_repo: NovelRepository, world_setting_repo: WorldSettingRepository):
        self.novel_repo = novel_repo
        self.world_setting_repo = world_setting_repo
    
    async def generate_world_setting(self, novel_id: str, ...):
        novel = await self.novel_repo.get(novel_id)
        # ...
```

### 3.5 配置文件

**backend/.env.example**
```bash
# 数据库配置
DATABASE_URL=mysql+aiomysql://root:password@localhost:3306/lingbi
STORAGE_TYPE=mysql  # mysql 或 filesystem

# DashScope API
DASHSCOPE_API_KEY=your_api_key

# 应用配置
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

**backend/config/database.py**
```python
from pydantic import BaseSettings

class DatabaseConfig(BaseSettings):
    database_url: str
    storage_type: str = "mysql"
    
    class Config:
        env_file = ".env"

database_config = DatabaseConfig()
```

---

## 4. 风险评估

### 4.1 性能影响

| 操作 | 文件系统 | MySQL | 影响 |
|------|----------|-------|------|
| 读取单章 | ~5ms | ~10ms | +100% (可接受) |
| 读取全书 | ~50ms | ~100ms | +100% (可接受) |
| 写入单章 | ~10ms | ~20ms | +100% (可接受) |
| 全文搜索 | 不支持 | 支持 | 大幅提升 |
| 并发写入 | 文件锁 | 行锁 | 大幅提升 |

**优化建议**:
- 添加查询缓存 (Redis)
- 章节内容使用延迟加载
- 批量操作使用事务

### 4.2 数据一致性

**风险**:
- 迁移过程中数据丢失
- JSON 字段解析失败
- 外键约束导致插入失败

**缓解措施**:
- 迁移前完整备份
- 编写数据验证脚本
- 分批次迁移，每批验证

### 4.3 停机时间

| 阶段 | 预计时间 | 是否停机 |
|------|----------|----------|
| 数据库准备 | 1 小时 | 否 |
| 数据导出 | 5 分钟 | 否 |
| 数据导入 | 30 分钟 | 是 ⚠️ |
| 代码部署 | 15 分钟 | 是 ⚠️ |
| 验证测试 | 60 分钟 | 是 ⚠️ |
| **合计** | **2 小时** | **1.75 小时** |

**建议**: 选择低峰期（凌晨 2-4 点）进行迁移

---

## 5. 工作量评估

| 角色 | 任务 | 预计工时 |
|------|------|----------|
| 后端开发 | 数据库设计 + 建表 | 4 小时 |
| 后端开发 | 导出/导入脚本 | 4 小时 |
| 后端开发 | Repository 层实现 | 8 小时 |
| 后端开发 | Service 层改造 | 8 小时 |
| 后端开发 | 集成测试 | 4 小时 |
| 测试工程师 | 数据验证测试 | 4 小时 |
| 测试工程师 | 回归测试 | 4 小时 |
| 运维 | 数据库部署 | 2 小时 |
| 运维 | 上线切换 | 1 小时 |
| **总计** | | **39 小时 ≈ 5 人天** |

---

## 6. 迁移时间表

### 阶段 1: 准备阶段（Day 1-2）
- [ ] 安装 MySQL 8.0+
- [ ] 创建数据库和用户
- [ ] 执行建表 SQL
- [ ] 编写导出/导入脚本

### 阶段 2: 开发阶段（Day 3-4）
- [ ] 实现 Repository 层
- [ ] 改造 Service 层
- [ ] 编写单元测试

### 阶段 3: 测试阶段（Day 5）
- [ ] 数据迁移测试
- [ ] 集成测试
- [ ] 性能测试

### 阶段 4: 上线阶段（Day 6）
- [ ] 凌晨 2:00 停机
- [ ] 数据迁移
- [ ] 验证测试
- [ ] 凌晨 4:00 恢复服务

---

## 7. 下一步行动

1. **确认方案**: review 本迁移方案
2. **创建任务**: 拆分具体开发任务
3. **备份数据**: 迁移前完整备份
4. **执行迁移**: 按计划执行

---

*文档创建时间：2026-04-17*
*版本：v1.0*
