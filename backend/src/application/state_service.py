"""状态管理服务"""
from datetime import datetime
from typing import Dict, Any

from ..infrastructure.storage import FileStorage
from ..domain.services.timeline_service import TimelineService
from ..domain.services.foreshadowing_service import ForeshadowingService


class StateService:
    """统一状态管理"""

    def __init__(self, storage: FileStorage):
        self.storage = storage
        self.timeline_service = TimelineService(storage)
        self.foreshadowing_service = ForeshadowingService(storage)

    # 时间线方法
    def get_timeline(self, novel_id: str) -> Dict[str, Any]:
        return self.timeline_service.get_timeline(novel_id)

    def update_timeline(self, novel_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.timeline_service.update_timeline(novel_id, data)

    def add_timeline_event(self, novel_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
        return self.timeline_service.add_event(novel_id, event)

    def delete_timeline_event(self, novel_id: str, order: int) -> Dict[str, Any]:
        return self.timeline_service.delete_event(novel_id, order)

    # 人物状态方法
    def get_character_states(self, novel_id: str) -> Dict[str, Any]:
        states = self.storage.load_json(novel_id, "state/character_states.json")
        if not states:
            states = {"novel_id": novel_id, "last_updated_chapter": 0, "states": []}
        return states

    def update_character_states(self, novel_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        data["last_updated"] = datetime.utcnow().isoformat()
        self.storage.save_json(novel_id, "state/character_states.json", data)
        return data

    def update_single_character_state(self, novel_id: str, char_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        states = self.get_character_states(novel_id)
        for state in states.get("states", []):
            if state.get("character_id") == char_id:
                for key, value in updates.items():
                    state[key] = value
                break
        return self.update_character_states(novel_id, states)

    # 伏笔状态方法
    def get_foreshadowing_state(self, novel_id: str) -> Dict[str, Any]:
        return self.foreshadowing_service.get_foreshadowing(novel_id)

    def update_foreshadowing_state(self, novel_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.foreshadowing_service.update_foreshadowing(novel_id, data)

    def update_single_foreshadowing_state(self, novel_id: str, fs_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        return self.foreshadowing_service.update_single(novel_id, fs_id, updates)