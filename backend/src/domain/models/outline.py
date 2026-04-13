"""大纲数据模型"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ChaptersRange(BaseModel):
    """章节范围"""
    start: int = Field(..., ge=1, description="起始章节")
    end: int = Field(..., ge=1, description="结束章节")


class Volume(BaseModel):
    """卷/篇章"""
    volume_id: str = Field(..., description="卷ID")
    name: str = Field(..., description="卷名称")
    chapters_range: ChaptersRange = Field(..., description="章节范围")
    theme: str = Field(..., description="主题")
    arc_summary: str = Field(..., description="故事弧线概述")


class TurningPoint(BaseModel):
    """转折点"""
    event: str = Field(..., description="事件")
    type: str = Field(..., description="类型: 悲剧/机遇/冲突等")
    impact: str = Field(..., description="影响")


class ForeshadowingPlan(BaseModel):
    """伏笔计划"""
    id: str = Field(..., description="伏笔ID")
    hint: str = Field(..., description="伏笔提示")
    recycle_chapter: int = Field(..., ge=1, description="计划回收章节")
    status: str = Field(default="pending", description="状态")


class CharacterGrowth(BaseModel):
    """人物成长变化"""
    character_id: str = Field(..., description="人物ID")
    change: str = Field(..., description="变化描述")


class ChapterOutline(BaseModel):
    """章节大纲"""
    chapter_num: int = Field(..., ge=1, description="章节号")
    title: str = Field(..., description="标题")
    volume_id: str = Field(..., description="所属卷ID")
    key_events: List[str] = Field(default_factory=list, description="核心事件")
    turning_points: List[TurningPoint] = Field(default_factory=list, description="转折点")
    character_growth: List[CharacterGrowth] = Field(default_factory=list, description="人物成长")
    foreshadowing: List[ForeshadowingPlan] = Field(default_factory=list, description="伏笔")


class GrowthCurve(BaseModel):
    """人物成长曲线"""
    chapter_range: str = Field(..., description="章节范围")
    character_id: str = Field(..., description="人物ID")
    growth: str = Field(..., description="成长描述")


class Outline(BaseModel):
    """小说大纲"""
    novel_id: str = Field(..., description="小说ID")
    version: int = Field(default=1, ge=1, description="版本号")
    volumes: List[Volume] = Field(default_factory=list, description="卷划分")
    chapters: List[ChapterOutline] = Field(default_factory=list, description="章节大纲")
    character_growth_curve: List[GrowthCurve] = Field(default_factory=list, description="成长曲线")
    foreshadowing_plan: List[ForeshadowingPlan] = Field(default_factory=list, description="伏笔计划")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="创建时间")
    updated_at: Optional[datetime] = Field(default=None, description="更新时间")

    def get_current_chapter_outline(self, chapter_num: int) -> Optional[ChapterOutline]:
        """获取指定章节的大纲"""
        for ch in self.chapters:
            if ch.chapter_num == chapter_num:
                return ch
        return None

    def get_next_chapter(self, current_chapter: int) -> Optional[ChapterOutline]:
        """获取下一章大纲"""
        return self.get_current_chapter_outline(current_chapter + 1)