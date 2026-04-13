"""伏笔状态服务"""
from typing import Dict, Any, List, Optional
from datetime import datetime


class ForeshadowingService:
    """伏笔状态管理服务"""

    def __init__(self, storage):
        self.storage = storage

    def get_foreshadowing(self, novel_id: str) -> Dict[str, Any]:
        """获取伏笔状态"""
        fs = self.storage.load_json(novel_id, "state/foreshadowing.json")
        if not fs:
            fs = {
                "novel_id": novel_id,
                "foreshadowings": [],
                "statistics": {"total_planted": 0, "recycled": 0, "pending": 0}
            }
        return fs

    def update_foreshadowing(self, novel_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """更新伏笔状态"""
        # 更新统计
        stats = self._calculate_statistics(data.get("foreshadowings", []))
        data["statistics"] = stats
        self.storage.save_json(novel_id, "state/foreshadowing.json", data)
        return data

    def update_single(self, novel_id: str, fs_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """更新单个伏笔"""
        fs = self.get_foreshadowing(novel_id)
        for item in fs["foreshadowings"]:
            if item.get("id") == fs_id:
                for key, value in updates.items():
                    item[key] = value
                break
        return self.update_foreshadowing(novel_id, fs)

    def _calculate_statistics(self, foreshadowings: List[Dict]) -> Dict[str, int]:
        """计算统计"""
        planted = len([f for f in foreshadowings if f.get("status") == "planted"])
        recycled = len([f for f in foreshadowings if f.get("status") == "recycled"])
        pending = len([f for f in foreshadowings if f.get("status") == "pending" or f.get("status") == "planned"])
        return {"total_planted": planted, "recycled": recycled, "pending": pending}