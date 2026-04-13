"""人物数据模型"""
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class CharacterRole(str, Enum):
    """人物角色类型"""
    PROTAGONIST = "主角"
    HEROINE = "女主角"
    MAJOR_SUPPORTING = "重要配角"
    MINOR_SUPPORTING = "次要配角"
    ANTAGONIST = "反派"
    MENTOR = "导师"


class RelationshipType(str, Enum):
    """关系类型"""
    LOVE = "love"           # 爱情
    MENTOR = "mentor"       # 师徒
    PARTNER = "partner"     # 合作伙伴
    COMPETITOR = "competitor"  # 竞争对手
    SUPERIOR = "superior"   # 上级
    SUBORDINATE = "subordinate"  # 下级
    FAMILY = "family"       # 家人
    FRIEND = "friend"       # 朋友
    ENEMY = "enemy"         # 敌人


class EmotionalMilestone(BaseModel):
    """感情里程碑"""
    chapter: int = Field(..., description="章节号")
    event: str = Field(..., description="事件描述")


class EmotionalArc(BaseModel):
    """感情线发展"""
    love_interest: Optional[str] = Field(default=None, description="恋爱对象ID")
    current_stage: str = Field(default="初识", description="当前阶段")
    key_milestones: List[EmotionalMilestone] = Field(default_factory=list, description="关键里程碑")


class Relationship(BaseModel):
    """人物关系"""
    target_id: str = Field(..., description="目标人物ID")
    type: RelationshipType = Field(..., description="关系类型")
    status: str = Field(..., description="关系状态")
    strength: Optional[int] = Field(default=50, ge=0, le=100, description="关系强度")


class Abilities(BaseModel):
    """人物能力"""
    cultivation_level: str = Field(default="普通员工", description="能力等级")
    skills: List[str] = Field(default_factory=list, description="技能列表")
    special_ability: Optional[str] = Field(default=None, description="特殊能力")


class CurrentState(BaseModel):
    """人物当前状态"""
    location: str = Field(default="", description="当前位置")
    physical: str = Field(default="健康", description="身体状况")
    emotional: str = Field(default="正常", description="情绪状态")
    equipment: List[str] = Field(default_factory=list, description="装备/物品")


class Character(BaseModel):
    """人物完整档案"""
    character_id: str = Field(..., description="人物ID")
    name: str = Field(..., description="姓名")
    role: CharacterRole = Field(..., description="角色类型")
    age: int = Field(..., ge=0, description="年龄")
    gender: str = Field(..., description="性别")
    appearance: str = Field(..., description="外貌描述")
    personality: List[str] = Field(default_factory=list, description="性格特点")
    background: str = Field(..., description="背景经历")
    abilities: Abilities = Field(default_factory=Abilities, description="能力")
    goals: List[str] = Field(default_factory=list, description="目标")
    emotional_arc: Optional[EmotionalArc] = Field(default=None, description="感情线")
    relationships: List[Relationship] = Field(default_factory=list, description="人物关系")
    current_state: CurrentState = Field(default_factory=CurrentState, description="当前状态")

    # 都市职场专项
    position: Optional[str] = Field(default=None, description="职位")
    company: Optional[str] = Field(default=None, description="所属公司")
    salary_level: Optional[int] = Field(default=None, description="薪资等级")


class CharacterState(BaseModel):
    """人物状态追踪"""
    character_id: str = Field(..., description="人物ID")
    current_location: str = Field(..., description="当前位置")
    cultivation_level: str = Field(default="", description="能力等级")
    physical_health: str = Field(default="健康", description="身体状况")
    emotional_state: str = Field(default="正常", description="情绪状态")

    # 感情线追踪
    emotional_details: Optional[Dict[str, str]] = Field(default=None, description="情感详情")
    love_progress: Optional[Dict[str, Any]] = Field(default=None, description="感情进度")

    relationships_current: List[Dict[str, str]] = Field(default_factory=list, description="当前关系")
    goals_progress: Optional[Dict[str, str]] = Field(default=None, description="目标进度")

    # 都市职场专项
    position: Optional[str] = Field(default=None, description="当前职位")
    company: Optional[str] = Field(default=None, description="当前公司")
    equity: Optional[Dict[str, Any]] = Field(default=None, description="股权情况")


class CharacterLibrary(BaseModel):
    """人物库"""
    novel_id: str = Field(..., description="小说ID")
    version: int = Field(default=1, ge=1, description="版本号")
    characters: List[Character] = Field(default_factory=list, description="人物列表")
    relationship_graph: Optional[Dict[str, List]] = Field(default=None, description="关系图谱")
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="最后更新时间")