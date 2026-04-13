"""状态追踪数据模型"""
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ForeshadowingStatus(str, Enum):
    """伏笔状态"""
    PLANTED = "planted"      # 已埋设
    PENDING = "pending"      # 待回收
    RECYCLED = "recycled"    # 已回收


class Foreshadowing(BaseModel):
    """伏笔追踪"""
    id: str = Field(..., description="伏笔ID")
    hint: str = Field(..., description="伏笔内容")
    planted_chapter: int = Field(..., ge=1, description="埋设章节")
    planned_recycle_chapter: int = Field(..., ge=1, description="计划回收章节")
    recycle_chapter: Optional[int] = Field(default=None, description="实际回收章节")
    status: ForeshadowingStatus = Field(default=ForeshadowingStatus.PLANTED, description="状态")
    significance: str = Field(default="medium", description="重要性: high/medium/low")
    resolution_hint: Optional[str] = Field(default=None, description="回收提示")


class ForeshadowingTracker(BaseModel):
    """伏笔状态追踪器"""
    novel_id: str = Field(..., description="小说ID")
    foreshadowings: List[Foreshadowing] = Field(default_factory=list, description="伏笔列表")
    statistics: Dict[str, int] = Field(default_factory=dict, description="统计信息")
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="最后更新")


class TimelineEntry(BaseModel):
    """时间线条目"""
    order: int = Field(..., ge=1, description="事件顺序")
    chapter: int = Field(..., ge=1, description="章节号")
    time: str = Field(..., description="时间点描述")
    event: str = Field(..., description="事件描述")
    participants: List[str] = Field(default_factory=list, description="参与人物")
    location: str = Field(default="", description="地点")
    significance: str = Field(default="medium", description="重要性")


class TimeScale(BaseModel):
    """时间尺度"""
    unit: str = Field(default="天", description="时间单位")
    current_time: str = Field(default="", description="当前时间")
    total_duration: str = Field(default="", description="预计总时长")


class Timeline(BaseModel):
    """时间线追踪"""
    novel_id: str = Field(..., description="小说ID")
    events: List[TimelineEntry] = Field(default_factory=list, description="事件列表")
    time_scale: TimeScale = Field(default_factory=TimeScale, description="时间尺度")
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="最后更新")


class IssueSeverity(str, Enum):
    """问题严重程度"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ValidationIssue(BaseModel):
    """校验问题"""
    issue_id: str = Field(..., description="问题ID")
    rule_id: str = Field(..., description="规则ID (如L001, E001)")
    severity: IssueSeverity = Field(..., description="严重程度")
    confidence: int = Field(..., ge=0, le=100, description="置信度")
    description: str = Field(..., description="问题描述")
    location: Optional[Dict[str, int]] = Field(default=None, description="位置")
    suggestion: str = Field(..., description="修正建议")
    auto_fix_available: bool = Field(default=False, description="是否可自动修复")
    auto_fix_text: Optional[str] = Field(default=None, description="自动修复内容")
    status: str = Field(default="pending", description="状态: pending/auto_fixed/user_fixed")


class ValidationStatistics(BaseModel):
    """校验统计"""
    total_issues: int = Field(default=0, description="总问题数")
    high_severity: int = Field(default=0, description="高严重问题数")
    medium_severity: int = Field(default=0, description="中严重问题数")
    low_severity: int = Field(default=0, description="低严重问题数")
    auto_fixed: int = Field(default=0, description="自动修复数")
    pending: int = Field(default=0, description="待处理数")


class ValidationResult(BaseModel):
    """校验结果"""
    novel_id: str = Field(..., description="小说ID")
    chapter_num: Optional[int] = Field(default=None, description="章节号（单章校验）")
    validated_at: datetime = Field(default_factory=datetime.utcnow, description="校验时间")
    validation_type: str = Field(default="single_chapter", description="校验类型")
    issues: List[ValidationIssue] = Field(default_factory=list, description="问题列表")
    statistics: ValidationStatistics = Field(default_factory=ValidationStatistics, description="统计信息")

    def has_critical_issues(self) -> bool:
        """是否有严重问题"""
        return self.statistics.high_severity > 0

    def get_pending_issues(self) -> List[ValidationIssue]:
        """获取待处理问题"""
        return [i for i in self.issues if i.status == "pending"]