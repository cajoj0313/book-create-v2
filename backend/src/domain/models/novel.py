"""小说元信息数据模型"""
from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class NovelStatus(str, Enum):
    """小说状态"""
    PLANNING = "planning"      # 规划中（世界观构建）
    OUTLINING = "outlining"    # 大纲生成中
    WRITING = "writing"        # 章节写作中
    VALIDATING = "validating"  # 全书校验中
    COMPLETED = "completed"    # 已完成
    PAUSED = "paused"          # 已暂停


class NovelPhase(str, Enum):
    """创作阶段"""
    WORLD_BUILDING = "world_building"
    OUTLINE_GENERATION = "outline_generation"
    CHAPTER_WRITING = "chapter_writing"
    VALIDATION = "validation"


class NovelMeta(BaseModel):
    """小说元信息"""
    novel_id: str = Field(..., description="小说唯一ID")
    title: str = Field(..., description="小说标题")
    genre: str = Field(default="都市职场", description="题材类型")
    theme: List[str] = Field(default_factory=list, description="主题标签")
    target_chapters: int = Field(default=200, ge=1, description="目标章节数")
    status: NovelStatus = Field(default=NovelStatus.PLANNING, description="当前状态")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="更新时间")
    current_phase: NovelPhase = Field(default=NovelPhase.WORLD_BUILDING, description="当前阶段")
    completed_chapters: int = Field(default=0, ge=0, description="已完成章节数")
    word_count: int = Field(default=0, ge=0, description="总字数")


class Novel(BaseModel):
    """小说完整数据"""
    meta: NovelMeta = Field(..., description="元信息")
    world_setting: Optional[dict] = Field(default=None, description="世界观设定")
    characters: Optional[dict] = Field(default=None, description="人物库")
    outline: Optional[dict] = Field(default=None, description="大纲")

    def is_ready_for_chapter_writing(self) -> bool:
        """检查是否可以开始章节写作"""
        return (
            self.world_setting is not None and
            self.characters is not None and
            self.outline is not None and
            self.meta.current_phase == NovelPhase.CHAPTER_WRITING
        )