"""
SQLAlchemy 数据模型

对应 MySQL 表结构：
- novels: 小说主表
- world_settings: 世界观设定表
- outlines: 大纲表
- outline_volumes: 大纲卷表
- outline_chapters: 大纲章节表
- chapters: 章节正文表
- story_synopsis: 故事梗概表
- characters: 人物库表
- chapter_versions: 章节版本历史表
- validation_reports: 校验报告表
"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, JSON, Text, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from infrastructure.database import Base


class Novel(Base):
    """小说主表"""
    __tablename__ = "novels"

    novel_id = Column(String(36), primary_key=True, comment="小说 ID")
    title = Column(String(255), nullable=False, comment="小说标题")
    genre = Column(String(100), default="都市职场", comment="题材类型")
    theme = Column(JSON, comment="主题标签数组")
    target_chapters = Column(Integer, default=12, comment="目标章节数")
    status = Column(String(50), default="planning", comment="当前状态")
    current_phase = Column(String(50), default="world_building", comment="当前阶段")
    completed_chapters = Column(Integer, default=0, comment="已完成章节数")
    word_count = Column(Integer, default=0, comment="总字数")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")

    # 关系
    world_setting = relationship("WorldSetting", back_populates="novel", uselist=False)
    outline = relationship("Outline", back_populates="novel", uselist=False)
    synopsis = relationship("StorySynopsis", back_populates="novel", uselist=False)
    chapters = relationship("Chapter", back_populates="novel", order_by="Chapter.chapter_num")
    characters = relationship("Character", back_populates="novel")
    outline_volumes = relationship("OutlineVolume", back_populates="novel")
    outline_chapters = relationship("OutlineChapter", back_populates="novel")

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "novel_id": self.novel_id,
            "title": self.title,
            "genre": self.genre,
            "theme": self.theme or [],
            "target_chapters": self.target_chapters,
            "status": self.status,
            "current_phase": self.current_phase,
            "completed_chapters": self.completed_chapters,
            "word_count": self.word_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class WorldSetting(Base):
    """世界观设定表"""
    __tablename__ = "world_settings"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键 ID")
    novel_id = Column(String(36), ForeignKey("novels.novel_id", ondelete="CASCADE"), unique=True, nullable=False, comment="小说 ID")
    version = Column(Integer, default=1, comment="版本号")
    background = Column(JSON, comment="背景设定")
    male_lead = Column(JSON, comment="男主设定")
    female_lead = Column(JSON, comment="女主设定")
    emotion_arc = Column(JSON, comment="感情线弧度")
    theme = Column(JSON, comment="故事主题")
    main_conflict = Column(JSON, comment="核心冲突")
    supporting_chars = Column(JSON, comment="配角设定")
    power_system = Column(JSON, comment="能力体系")
    special_elements = Column(JSON, comment="特殊元素")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")

    # 关系
    novel = relationship("Novel", back_populates="world_setting")

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "novel_id": self.novel_id,
            "version": self.version,
            "background": self.background or {},
            "male_lead": self.male_lead or {},
            "female_lead": self.female_lead or {},
            "emotion_arc": self.emotion_arc or {},
            "theme": self.theme or {},
            "main_conflict": self.main_conflict or {},
            "supporting_chars": self.supporting_chars or [],
            "power_system": self.power_system or {},
            "special_elements": self.special_elements or [],
        }


class Outline(Base):
    """大纲表"""
    __tablename__ = "outlines"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键 ID")
    novel_id = Column(String(36), ForeignKey("novels.novel_id", ondelete="CASCADE"), unique=True, nullable=False, comment="小说 ID")
    version = Column(Integer, default=1, comment="版本号")
    genre = Column(String(100), comment="题材")
    main_conflict = Column(JSON, comment="核心冲突")
    character_growth_curve = Column(JSON, comment="人物成长曲线")
    foreshadowing_plan = Column(JSON, comment="伏笔计划")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")

    # 关系
    novel = relationship("Novel", back_populates="outline")
    volumes = relationship("OutlineVolume", back_populates="outline", order_by="OutlineVolume.sort_order")
    chapters = relationship("OutlineChapter", back_populates="outline", order_by="OutlineChapter.chapter_num")

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "novel_id": self.novel_id,
            "version": self.version,
            "genre": self.genre,
            "main_conflict": self.main_conflict or {},
            "character_growth_curve": self.character_growth_curve or [],
            "foreshadowing_plan": self.foreshadowing_plan or [],
            "volumes": [v.to_dict() for v in self.volumes] if self.volumes else [],
            "chapters": [c.to_dict() for c in self.chapters] if self.chapters else [],
        }


class OutlineVolume(Base):
    """大纲卷表"""
    __tablename__ = "outline_volumes"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键 ID")
    novel_id = Column(String(36), ForeignKey("novels.novel_id", ondelete="CASCADE"), nullable=False, comment="小说 ID")
    outline_id = Column(Integer, ForeignKey("outlines.id", ondelete="CASCADE"), nullable=False, comment="大纲 ID")
    volume_id = Column(String(36), comment="卷 ID")
    name = Column(String(255), comment="卷名")
    chapters_range_start = Column(Integer, comment="起始章节")
    chapters_range_end = Column(Integer, comment="结束章节")
    theme = Column(Text, comment="主题")
    arc_summary = Column(Text, comment="卷摘要")
    sort_order = Column(Integer, default=0, comment="排序")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")

    # 关系
    novel = relationship("Novel", back_populates="outline_volumes")
    outline = relationship("Outline", back_populates="volumes")

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "volume_id": self.volume_id,
            "name": self.name,
            "chapters_range": {
                "start": self.chapters_range_start,
                "end": self.chapters_range_end
            },
            "theme": self.theme,
            "arc_summary": self.arc_summary,
            "sort_order": self.sort_order,
        }


class OutlineChapter(Base):
    """大纲章节表"""
    __tablename__ = "outline_chapters"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键 ID")
    novel_id = Column(String(36), ForeignKey("novels.novel_id", ondelete="CASCADE"), nullable=False, comment="小说 ID")
    outline_id = Column(Integer, ForeignKey("outlines.id", ondelete="CASCADE"), nullable=False, comment="大纲 ID")
    chapter_num = Column(Integer, nullable=False, comment="章节号")
    title = Column(String(255), comment="章节标题")
    volume_id = Column(String(36), comment="所属卷 ID")
    key_events = Column(JSON, comment="核心事件数组")
    turning_points = Column(JSON, comment="转折点数组")
    character_growth = Column(JSON, comment="人物成长")
    foreshadowing = Column(JSON, comment="伏笔")
    emotion_stage = Column(String(50), comment="感情阶段")
    emotion_progress = Column(JSON, comment="感情进展")
    sort_order = Column(Integer, default=0, comment="排序")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")

    # 关系
    novel = relationship("Novel", back_populates="outline_chapters")
    outline = relationship("Outline", back_populates="chapters")

    __table_args__ = (
        UniqueConstraint('novel_id', 'chapter_num', name='uk_chapter'),
    )

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "chapter_num": self.chapter_num,
            "title": self.title,
            "volume_id": self.volume_id,
            "key_events": self.key_events or [],
            "turning_points": self.turning_points or [],
            "character_growth": self.character_growth or [],
            "foreshadowing": self.foreshadowing or [],
            "emotion_stage": self.emotion_stage,
            "emotion_progress": self.emotion_progress or {},
        }


class Chapter(Base):
    """章节正文表"""
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键 ID")
    novel_id = Column(String(36), ForeignKey("novels.novel_id", ondelete="CASCADE"), nullable=False, comment="小说 ID")
    chapter_num = Column(Integer, nullable=False, comment="章节号")
    title = Column(String(255), comment="章节标题")
    version = Column(Integer, default=1, comment="版本号")
    content = Column(Text, comment="正文内容")
    word_count = Column(Integer, default=0, comment="字数")
    summary = Column(JSON, comment="章节摘要")
    character_updates = Column(JSON, comment="人物状态更新")
    foreshadowing_updates = Column(JSON, comment="伏笔更新")
    timeline_additions = Column(JSON, comment="时间线新增")
    validation_status = Column(JSON, comment="校验状态")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")

    # 关系
    novel = relationship("Novel", back_populates="chapters")

    __table_args__ = (
        UniqueConstraint('novel_id', 'chapter_num', name='uk_chapter'),
    )

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "novel_id": self.novel_id,
            "chapter_num": self.chapter_num,
            "title": self.title,
            "version": self.version,
            "content": self.content,
            "word_count": self.word_count,
            "summary": self.summary or {},
            "character_updates": self.character_updates or [],
            "foreshadowing_updates": self.foreshadowing_updates or [],
            "timeline_additions": self.timeline_additions or [],
            "validation_status": self.validation_status or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class StorySynopsis(Base):
    """故事梗概表"""
    __tablename__ = "story_synopsis"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键 ID")
    novel_id = Column(String(36), ForeignKey("novels.novel_id", ondelete="CASCADE"), unique=True, nullable=False, comment="小说 ID")
    story_content = Column(Text, comment="故事梗概正文 3000-5000 字")
    key_plot_points = Column(JSON, comment="关键情节节点")
    character_arc = Column(JSON, comment="人物成长弧光")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")

    # 关系
    novel = relationship("Novel", back_populates="synopsis")

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "novel_id": self.novel_id,
            "story_content": self.story_content,
            "key_plot_points": self.key_plot_points or [],
            "character_arc": self.character_arc or {},
        }


class Character(Base):
    """人物库表"""
    __tablename__ = "characters"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键 ID")
    novel_id = Column(String(36), ForeignKey("novels.novel_id", ondelete="CASCADE"), nullable=False, comment="小说 ID")
    character_id = Column(String(36), comment="人物 ID")
    name = Column(String(100), comment="人物名称")
    role = Column(String(50), comment="角色类型")
    character_type = Column(String(50), comment="人物类型")
    age = Column(Integer, comment="年龄")
    gender = Column(String(20), comment="性别")
    appearance = Column(Text, comment="外貌描述")
    personality = Column(JSON, comment="性格特点数组")
    background = Column(Text, comment="背景故事")
    inner_wound = Column(Text, comment="内心创伤")
    growth_arc = Column(Text, comment="成长弧光")
    abilities = Column(JSON, comment="能力设定")
    goals = Column(JSON, comment="目标数组")
    emotional_arc = Column(JSON, comment="感情弧线")
    relationships = Column(JSON, comment="人物关系数组")
    current_state = Column(JSON, comment="当前状态")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")

    # 关系
    novel = relationship("Novel", back_populates="characters")

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "character_id": self.character_id,
            "novel_id": self.novel_id,
            "name": self.name,
            "role": self.role,
            "character_type": self.character_type,
            "age": self.age,
            "gender": self.gender,
            "appearance": self.appearance,
            "personality": self.personality or [],
            "background": self.background,
            "inner_wound": self.inner_wound,
            "growth_arc": self.growth_arc,
            "abilities": self.abilities or {},
            "goals": self.goals or [],
            "emotional_arc": self.emotional_arc or {},
            "relationships": self.relationships or [],
            "current_state": self.current_state or {},
        }


class ChapterVersion(Base):
    """章节版本历史表"""
    __tablename__ = "chapter_versions"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键 ID")
    chapter_id = Column(Integer, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, comment="章节 ID")
    novel_id = Column(String(36), ForeignKey("novels.novel_id", ondelete="CASCADE"), nullable=False, comment="小说 ID")
    chapter_num = Column(Integer, nullable=False, comment="章节号")
    version = Column(Integer, nullable=False, comment="版本号")
    content = Column(Text, comment="正文内容")
    change_summary = Column(Text, comment="变更摘要")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")


class ValidationReport(Base):
    """校验报告表"""
    __tablename__ = "validation_reports"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键 ID")
    novel_id = Column(String(36), ForeignKey("novels.novel_id", ondelete="CASCADE"), nullable=False, comment="小说 ID")
    chapter_num = Column(Integer, comment="章节号，NULL 表示全书校验")
    validated_at = Column(DateTime, comment="校验时间")
    validation_type = Column(String(50), comment="校验类型")
    issues = Column(JSON, comment="问题列表")
    statistics = Column(JSON, comment="统计信息")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
