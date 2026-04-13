"""状态追踪 API"""
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..infrastructure.storage import FileStorage
from ..application.state_service import StateService

router = APIRouter()


# ========== 时间线 API ==========

@router.get("/{novel_id}/timeline")
async def get_timeline(novel_id: str):
    """获取时间线"""
    storage = FileStorage("data/novels")
    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    service = StateService(storage)
    timeline = service.get_timeline(novel_id)
    return {"success": True, "data": timeline}


class UpdateTimelineRequest(BaseModel):
    events: List[Dict[str, Any]]
    time_scale: Optional[Dict[str, Any]] = None


@router.put("/{novel_id}/timeline")
async def update_timeline(novel_id: str, request: UpdateTimelineRequest):
    """更新时间线"""
    storage = FileStorage("data/novels")
    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    service = StateService(storage)
    data = {
        "novel_id": novel_id,
        "events": request.events,
        "time_scale": request.time_scale or {"unit": "天", "current_time": "", "total_duration": ""}
    }
    result = service.update_timeline(novel_id, data)
    return {"success": True, "data": result}


class AddEventRequest(BaseModel):
    time: str
    event: str
    chapter: Optional[int] = None
    participants: Optional[List[str]] = []
    location: Optional[str] = ""
    significance: Optional[str] = "medium"


@router.post("/{novel_id}/timeline/events")
async def add_timeline_event(novel_id: str, request: AddEventRequest):
    """添加时间线事件"""
    storage = FileStorage("data/novels")
    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    service = StateService(storage)
    event = {
        "time": request.time,
        "event": request.event,
        "chapter": request.chapter,
        "participants": request.participants,
        "location": request.location,
        "significance": request.significance
    }
    result = service.add_timeline_event(novel_id, event)
    return {"success": True, "data": result}


@router.delete("/{novel_id}/timeline/events/{order}")
async def delete_timeline_event(novel_id: str, order: int):
    """删除时间线事件"""
    storage = FileStorage("data/novels")
    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    service = StateService(storage)
    result = service.delete_timeline_event(novel_id, order)
    return {"success": True, "data": result}


# ========== 人物状态 API ==========

@router.get("/{novel_id}/character-states")
async def get_character_states(novel_id: str):
    """获取人物状态"""
    storage = FileStorage("data/novels")
    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    service = StateService(storage)
    states = service.get_character_states(novel_id)
    return {"success": True, "data": states}


class UpdateCharacterStatesRequest(BaseModel):
    states: List[Dict[str, Any]]


@router.put("/{novel_id}/character-states")
async def update_character_states(novel_id: str, request: UpdateCharacterStatesRequest):
    """批量更新人物状态"""
    storage = FileStorage("data/novels")
    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    service = StateService(storage)
    data = {"novel_id": novel_id, "states": request.states}
    result = service.update_character_states(novel_id, data)
    return {"success": True, "data": result}


class UpdateSingleCharacterStateRequest(BaseModel):
    current_location: Optional[str] = None
    emotional_state: Optional[str] = None
    cultivation_level: Optional[str] = None
    physical_health: Optional[str] = None


@router.put("/{novel_id}/character-states/{char_id}")
async def update_single_character_state(novel_id: str, char_id: str, request: UpdateSingleCharacterStateRequest):
    """更新单人物状态"""
    storage = FileStorage("data/novels")
    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    service = StateService(storage)
    updates = request.dict(exclude_none=True)
    result = service.update_single_character_state(novel_id, char_id, updates)
    return {"success": True, "data": result}


# ========== 伏笔状态 API ==========

@router.get("/{novel_id}/foreshadowing")
async def get_foreshadowing_state(novel_id: str):
    """获取伏笔状态"""
    storage = FileStorage("data/novels")
    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    service = StateService(storage)
    fs = service.get_foreshadowing_state(novel_id)
    return {"success": True, "data": fs}


class UpdateForeshadowingRequest(BaseModel):
    foreshadowings: List[Dict[str, Any]]


@router.put("/{novel_id}/foreshadowing")
async def update_foreshadowing_state(novel_id: str, request: UpdateForeshadowingRequest):
    """批量更新伏笔状态"""
    storage = FileStorage("data/novels")
    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    service = StateService(storage)
    data = {"novel_id": novel_id, "foreshadowings": request.foreshadowings}
    result = service.update_foreshadowing_state(novel_id, data)
    return {"success": True, "data": result}


class UpdateSingleForeshadowingRequest(BaseModel):
    status: Optional[str] = None
    planted_chapter: Optional[int] = None
    recycle_chapter: Optional[int] = None


@router.put("/{novel_id}/foreshadowing/{fs_id}")
async def update_single_foreshadowing_state(novel_id: str, fs_id: str, request: UpdateSingleForeshadowingRequest):
    """更新单伏笔状态"""
    storage = FileStorage("data/novels")
    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    service = StateService(storage)
    updates = request.dict(exclude_none=True)
    result = service.update_single_foreshadowing_state(novel_id, fs_id, updates)
    return {"success": True, "data": result}