"""时间线服务"""
from typing import Dict, Any, List, Optional
from datetime import datetime


class TimelineService:
    """时间线管理服务"""

    def __init__(self, storage):
        self.storage = storage

    def get_timeline(self, novel_id: str) -> Dict[str, Any]:
        """获取时间线"""
        timeline = self.storage.load_json(novel_id, "state/timeline.json")
        if not timeline:
            timeline = {
                "novel_id": novel_id,
                "events": [],
                "time_scale": {"unit": "天", "current_time": "", "total_duration": ""},
                "last_updated": datetime.utcnow().isoformat()
            }
        return timeline

    def update_timeline(self, novel_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """更新时间线"""
        data["last_updated"] = datetime.utcnow().isoformat()
        self.storage.save_json(novel_id, "state/timeline.json", data)
        return data

    def add_event(self, novel_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
        """添加时间线事件（自动排序）"""
        timeline = self.get_timeline(novel_id)
        max_order = max([e.get("order", 0) for e in timeline["events"]], default=0)
        event["order"] = max_order + 1
        timeline["events"].append(event)
        return self.update_timeline(novel_id, timeline)

    def delete_event(self, novel_id: str, order: int) -> Dict[str, Any]:
        """删除时间线事件（自动重排序）"""
        timeline = self.get_timeline(novel_id)
        timeline["events"] = [e for e in timeline["events"] if e.get("order") != order]
        # 重排序
        for i, e in enumerate(timeline["events"], 1):
            e["order"] = i
        return self.update_timeline(novel_id, timeline)