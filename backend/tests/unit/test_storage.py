"""存储模块单元测试"""
import pytest
import tempfile
import shutil
import os
from pathlib import Path

from src.infrastructure.storage import FileStorage, VersionControl


class TestFileStorage:
    """文件存储测试"""

    @pytest.fixture
    def temp_storage(self):
        """创建临时存储实例"""
        temp_dir = tempfile.mkdtemp()
        storage = FileStorage(os.path.join(temp_dir, "data", "novels"))
        yield storage
        shutil.rmtree(temp_dir, ignore_errors=True)

    def test_create_novel_dir(self, temp_storage):
        """测试创建小说目录"""
        novel_dir = temp_storage.create_novel_dir("novel-test-001")

        assert novel_dir.exists()
        assert (novel_dir / "chapters").exists()
        assert (novel_dir / "state").exists()
        assert (novel_dir / "versions").exists()
        assert (novel_dir / "validation_reports").exists()

    def test_save_and_load_json(self, temp_storage):
        """测试保存和读取JSON"""
        temp_storage.create_novel_dir("novel-test-002")

        data = {
            "novel_id": "novel-test-002",
            "title": "测试小说",
            "genre": "都市职场"
        }

        filepath = temp_storage.save_json("novel-test-002", "meta.json", data)

        assert filepath.exists()

        loaded_data = temp_storage.load_json("novel-test-002", "meta.json")

        assert loaded_data == data

    def test_load_json_not_exists(self, temp_storage):
        """测试读取不存在的文件"""
        result = temp_storage.load_json("non-existent", "meta.json")
        assert result is None

    def test_save_to_subdirectory(self, temp_storage):
        """测试保存到子目录"""
        temp_storage.create_novel_dir("novel-test-003")

        chapter_data = {
            "chapter_num": 1,
            "title": "第一章",
            "content": "测试内容"
        }

        filepath = temp_storage.save_json(
            "novel-test-003",
            "chapters/chapter_001.json",
            chapter_data
        )

        assert filepath.exists()
        assert filepath.name == "chapter_001.json"
        assert filepath.parent.name == "chapters"

        loaded_data = temp_storage.load_json(
            "novel-test-003",
            "chapters/chapter_001.json"
        )
        assert loaded_data == chapter_data

    def test_list_novels(self, temp_storage):
        """测试列出所有小说"""
        # 创建多个小说目录
        temp_storage.create_novel_dir("novel-001")
        temp_storage.create_novel_dir("novel-002")
        temp_storage.create_novel_dir("novel-003")

        novel_ids = temp_storage.list_novels()

        assert len(novel_ids) == 3
        assert "novel-001" in novel_ids
        assert "novel-002" in novel_ids
        assert "novel-003" in novel_ids

    def test_list_novels_empty(self, temp_storage):
        """测试空目录列表"""
        novel_ids = temp_storage.list_novels()
        assert novel_ids == []

    def test_delete_novel(self, temp_storage):
        """测试删除小说"""
        temp_storage.create_novel_dir("novel-to-delete")
        temp_storage.save_json("novel-to-delete", "meta.json", {"test": "data"})

        # 验证存在
        assert temp_storage.load_json("novel-to-delete", "meta.json") is not None

        # 删除
        result = temp_storage.delete_novel("novel-to-delete")
        assert result is True

        # 验证已删除
        assert temp_storage.load_json("novel-to-delete", "meta.json") is None

    def test_delete_novel_not_exists(self, temp_storage):
        """测试删除不存在的小说"""
        result = temp_storage.delete_novel("non-existent")
        assert result is False


class TestVersionControl:
    """版本管理测试"""

    @pytest.fixture
    def temp_version_control(self):
        """创建临时版本控制实例"""
        temp_dir = tempfile.mkdtemp()
        storage = FileStorage(os.path.join(temp_dir, "data", "novels"))
        storage.create_novel_dir("novel-version-test")
        vc = VersionControl(storage)
        yield vc
        shutil.rmtree(temp_dir, ignore_errors=True)

    def test_save_chapter_version(self, temp_version_control):
        """测试保存章节版本"""
        content_v1 = {
            "chapter_num": 1,
            "content": "第一版内容",
            "version": 1
        }

        version = temp_version_control.save_chapter_version(
            "novel-version-test",
            1,
            content_v1
        )

        assert version == 1

        # 保存第二版
        content_v2 = {
            "chapter_num": 1,
            "content": "第二版内容",
            "version": 2
        }

        version = temp_version_control.save_chapter_version(
            "novel-version-test",
            1,
            content_v2
        )

        assert version == 2

    def test_get_chapter_versions(self, temp_version_control):
        """测试获取章节版本列表"""
        # 保存多个版本
        for i in range(3):
            temp_version_control.save_chapter_version(
                "novel-version-test",
                1,
                {"content": f"版本{i+1}", "version": i + 1}
            )

        versions = temp_version_control.get_chapter_versions(
            "novel-version-test",
            1
        )

        assert len(versions) == 3
        assert versions[0]["version"] == 1
        assert versions[2]["version"] == 3

    def test_get_chapter_versions_empty(self, temp_version_control):
        """测试获取无版本章节"""
        versions = temp_version_control.get_chapter_versions(
            "novel-version-test",
            999
        )

        assert versions == []

    def test_rollback_chapter(self, temp_version_control):
        """测试回滚章节"""
        # 保存多个版本
        temp_version_control.save_chapter_version(
            "novel-version-test",
            2,
            {"content": "第一版", "version": 1}
        )

        temp_version_control.save_chapter_version(
            "novel-version-test",
            2,
            {"content": "第二版", "version": 2}
        )

        temp_version_control.save_chapter_version(
            "novel-version-test",
            2,
            {"content": "第三版", "version": 3}
        )

        # 回滚到第一版
        rolled_content = temp_version_control.rollback_chapter(
            "novel-version-test",
            2,
            1
        )

        assert rolled_content["content"] == "第一版"

        # 验证当前版本已更新
        current = temp_version_control.storage.load_json(
            "novel-version-test",
            "chapters/chapter_002.json"
        )

        assert current["content"] == "第一版"

    def test_rollback_to_nonexistent_version(self, temp_version_control):
        """测试回滚到不存在的版本"""
        temp_version_control.save_chapter_version(
            "novel-version-test",
            3,
            {"content": "测试内容", "version": 1}
        )

        with pytest.raises(ValueError):
            temp_version_control.rollback_chapter(
                "novel-version-test",
                3,
                999
            )