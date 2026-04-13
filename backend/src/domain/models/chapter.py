"""章节数据模型"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class LocationChange(BaseModel):
    """位置变化"""
    from_location: str = Field(..., description="原位置")
    to_location: str = Field(..., description="新位置")


class EmotionalChange(BaseModel):
    """情绪变化"""
    from_emotion: str = Field(..., description="原情绪")
    to_emotion: str = Field(..., description="新情绪")


class RelationshipChange(BaseModel):
    """关系变化"""
    target_id: str = Field(..., description="目标人物ID")
    type: str = Field(..., description="关系类型")
    status: str = Field(..., description="新状态")


class CharacterUpdate(BaseModel):
    """本章人物状态更新"""
    character_id: str = Field(..., description="人物ID")
    location_change: Optional[LocationChange] = Field(default=None, description="位置变化")
    emotional_change: Optional[EmotionalChange] = Field(default=None, description="情绪变化")
    ability_change: Optional[Dict[str, str]] = Field(default=None, description="能力变化")
    relationship_changes: List[RelationshipChange] = Field(default_factory=list, description="关系变化")

    # 都市职场专项
    position_change: Optional[Dict[str, str]] = Field(default=None, description="职位变化")
    equity_change: Optional[Dict[str, Any]] = Field(default=None, description="股权变化")


class ForeshadowingUpdate(BaseModel):
    """本章伏笔更新"""
    id: str = Field(..., description="伏笔ID")
    action: str = Field(..., description="操作类型: planted/recycled")
    detail: str = Field(..., description="详细描述")


class TimelineEvent(BaseModel):
    """时间线事件"""
    event: str = Field(..., description="事件描述")
    time: str = Field(..., description="时间点")
    order: Optional[int] = Field(default=None, description="事件顺序")


class ChapterSummary(BaseModel):
    """章节摘要"""
    key_events: List[str] = Field(default_factory=list, description="核心事件")
    emotional_tone: str = Field(default="", description="情感基调")


class ValidationStatus(BaseModel):
    """校验状态"""
    last_validated: Optional[datetime] = Field(default=None, description="最后校验时间")
    issues_found: int = Field(default=0, ge=0, description="发现问题数")
    issues_fixed: int = Field(default=0, ge=0, description="已修复问题数")


class Chapter(BaseModel):
    """章节完整数据"""
    novel_id: str = Field(..., description="小说ID")
    chapter_num: int = Field(..., ge=1, description="章节号")
    title: str = Field(..., description="章节标题")
    version: int = Field(default=1, ge=1, description="版本号")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间")
    updated_at: Optional[datetime] = Field(default=None, description="更新时间")
    content: str = Field(..., description="正文内容")
    word_count: int = Field(default=0, ge=0, description="字数")

    summary: ChapterSummary = Field(default_factory=ChapterSummary, description="章节摘要")
    character_updates: List[CharacterUpdate] = Field(default_factory=list, description="人物更新")
    foreshadowing_updates: List[ForeshadowingUpdate] = Field(default_factory=list, description="伏笔更新")
    timeline_additions: List[TimelineEvent] = Field(default_factory=list, description="时间线新增")

    validation_status: ValidationStatus = Field(default_factory=ValidationStatus, description="校验状态")

    def calculate_word_count(self) -> int:
        """计算字数"""
        return len(self.content.replace("\n", "").replace(" ", ""))