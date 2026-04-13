"""世界观数据模型"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class Region(BaseModel):
    """地理区域"""
    name: str = Field(..., description="区域名称")
    description: str = Field(..., description="区域描述")


class Geography(BaseModel):
    """地理设定"""
    world_name: str = Field(..., description="世界名称")
    regions: List[Region] = Field(default_factory=list, description="区域列表")


class SocialClass(BaseModel):
    """社会阶层"""
    name: str = Field(..., description="阶层名称")


class Society(BaseModel):
    """社会设定"""
    power_structure: str = Field(..., description="权力结构")
    social_classes: List[str] = Field(default_factory=list, description="社会阶层")
    key_institutions: List[str] = Field(default_factory=list, description="关键机构")


class Background(BaseModel):
    """背景设定"""
    era: str = Field(..., description="时代类型")
    era_name: str = Field(..., description="时代名称")
    geography: Geography = Field(..., description="地理设定")
    society: Society = Field(..., description="社会设定")


class PowerLevel(BaseModel):
    """能力等级"""
    name: str = Field(..., description="等级名称")
    rank: int = Field(..., ge=0, description="等级数值")
    description: str = Field(..., description="等级描述")


class PowerSystem(BaseModel):
    """能力体系（都市职场为职业等级体系）"""
    name: str = Field(default="职场等级体系", description="体系名称")
    levels: List[PowerLevel] = Field(default_factory=list, description="等级列表")
    key_rules: List[str] = Field(default_factory=list, description="规则列表")


class Conflict(BaseModel):
    """冲突设定"""
    type: str = Field(..., description="冲突类型")
    description: str = Field(..., description="冲突描述")
    antagonist: Optional[str] = Field(default=None, description="对立方")


class CoreConflict(BaseModel):
    """核心冲突"""
    main_conflict: Conflict = Field(..., description="主线冲突")
    sub_conflicts: List[Dict[str, str]] = Field(default_factory=list, description="子冲突")


class SpecialElement(BaseModel):
    """特殊元素"""
    name: str = Field(..., description="元素名称")
    type: str = Field(..., description="元素类型")
    description: str = Field(..., description="元素描述")


class WorldSetting(BaseModel):
    """世界观完整设定"""
    novel_id: str = Field(..., description="小说ID")
    version: int = Field(default=1, ge=1, description="版本号")
    background: Background = Field(..., description="背景设定")
    power_system: PowerSystem = Field(..., description="能力体系")
    core_conflict: CoreConflict = Field(..., description="核心冲突")
    special_elements: List[SpecialElement] = Field(default_factory=list, description="特殊元素")

    # 都市职场专项字段
    industry: Optional[str] = Field(default=None, description="行业类型")
    company_setting: Optional[Dict[str, Any]] = Field(default=None, description="公司设定")