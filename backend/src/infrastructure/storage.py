"""File Storage - JSON文件存储"""
import json
import os
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime


class FileStorage:
    """JSON文件存储管理"""

    def __init__(self, data_dir: str = "data/novels"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def create_novel_dir(self, novel_id: str) -> Path:
        """创建小说目录结构"""
        novel_dir = self.data_dir / novel_id
        novel_dir.mkdir(parents=True, exist_ok=True)

        # 创建子目录
        (novel_dir / "chapters").mkdir(exist_ok=True)
        (novel_dir / "state").mkdir(exist_ok=True)
        (novel_dir / "versions").mkdir(exist_ok=True)
        (novel_dir / "validation_reports").mkdir(exist_ok=True)

        return novel_dir

    def save_json(self, novel_id: str, filename: str, data: Dict[Any, Any]) -> Path:
        """保存JSON文件"""
        novel_dir = self.data_dir / novel_id
        filepath = novel_dir / filename

        filepath.parent.mkdir(parents=True, exist_ok=True)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return filepath

    def load_json(self, novel_id: str, filename: str) -> Optional[Dict[Any, Any]]:
        """读取JSON文件"""
        filepath = self.data_dir / novel_id / filename

        if not filepath.exists():
            return None

        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)

    def list_novels(self) -> List[str]:
        """列出所有小说ID"""
        if not self.data_dir.exists():
            return []
        return [d.name for d in self.data_dir.iterdir() if d.is_dir()]

    def delete_novel(self, novel_id: str) -> bool:
        """删除小说目录"""
        novel_dir = self.data_dir / novel_id
        if novel_dir.exists():
            # 安全删除（实际项目应做备份）
            import shutil
            shutil.rmtree(novel_dir)
            return True
        return False


class VersionControl:
    """版本管理"""

    def __init__(self, storage: FileStorage):
        self.storage = storage

    def save_chapter_version(
        self,
        novel_id: str,
        chapter_num: int,
        content: Dict[Any, Any]
    ) -> int:
        """保存章节版本"""
        # 获取当前版本号
        current_version = self._get_current_version(novel_id, chapter_num)
        new_version = current_version + 1

        # 保存当前工作版本
        self.storage.save_json(
            novel_id,
            f"chapters/chapter_{chapter_num:03d}.json",
            content
        )

        # 保存历史版本
        self.storage.save_json(
            novel_id,
            f"chapters/chapter_{chapter_num:03d}_v{new_version}.json",
            content
        )

        return new_version

    def get_chapter_versions(
        self,
        novel_id: str,
        chapter_num: int
    ) -> List[Dict[str, Any]]:
        """获取章节版本列表"""
        novel_dir = self.storage.data_dir / novel_id / "chapters"
        versions = []

        for f in novel_dir.iterdir():
            if f.name.startswith(f"chapter_{chapter_num:03d}_v"):
                version_num = int(f.name.split("_v")[1].replace(".json", ""))
                versions.append({
                    "version": version_num,
                    "file": f.name,
                    "created_at": datetime.fromtimestamp(f.stat().st_mtime)
                })

        return sorted(versions, key=lambda x: x["version"])

    def rollback_chapter(
        self,
        novel_id: str,
        chapter_num: int,
        target_version: int
    ) -> Dict[Any, Any]:
        """回滚章节到指定版本"""
        content = self.storage.load_json(
            novel_id,
            f"chapters/chapter_{chapter_num:03d}_v{target_version}.json"
        )

        if content is None:
            raise ValueError(f"Version {target_version} not found")

        # 保存为新版本（回滚也生成新版本）
        self.save_chapter_version(novel_id, chapter_num, content)

        return content

    def _get_current_version(self, novel_id: str, chapter_num: int) -> int:
        """获取当前版本号"""
        versions = self.get_chapter_versions(novel_id, chapter_num)
        if not versions:
            return 0
        return max(v["version"] for v in versions)