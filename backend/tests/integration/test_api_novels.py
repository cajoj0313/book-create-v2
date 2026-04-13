"""小说管理 API 集成测试"""
import pytest
from fastapi.testclient import TestClient
import tempfile
import shutil
import os
import sys

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.interfaces.main import app


class TestNovelAPI:
    """小说管理 API 测试"""

    @pytest.fixture(autouse=True)
    def setup_test_data_dir(self):
        """设置测试数据目录"""
        # 创建临时目录
        self.test_dir = tempfile.mkdtemp()
        self.test_data_dir = os.path.join(self.test_dir, "data", "novels")
        os.makedirs(self.test_data_dir, exist_ok=True)

        # 保存原始工作目录并切换
        self.original_cwd = os.getcwd()
        os.chdir(self.test_dir)

        yield

        # 恢复工作目录
        os.chdir(self.original_cwd)

        # 清理临时目录
        shutil.rmtree(self.test_dir, ignore_errors=True)

    @pytest.fixture
    def client(self):
        """创建测试客户端"""
        return TestClient(app)

    def test_create_novel(self, client):
        """测试创建小说"""
        response = client.post(
            "/novels/",
            json={
                "title": "剑破苍穹",
                "genre": "武侠修仙",
                "target_chapters": 200
            }
        )

        assert response.status_code == 200
        result = response.json()

        # API 返回格式: {success: true, data: {...}}
        assert result["success"] is True
        data = result["data"]

        assert data["title"] == "剑破苍穹"
        assert data["genre"] == "武侠修仙"
        assert data["status"] == "planning"
        assert data["completed_chapters"] == 0
        assert data["word_count"] == 0
        assert data["novel_id"].startswith("novel-")

    def test_list_novels(self, client):
        """测试获取小说列表"""
        # 先创建一本小说
        client.post(
            "/novels/",
            json={"title": "测试小说", "genre": "都市职场"}
        )

        # 获取列表
        response = client.get("/novels/")

        assert response.status_code == 200
        result = response.json()

        # API 返回格式: {success: true, data: [...]}
        assert result["success"] is True
        data = result["data"]

        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_novel_detail(self, client):
        """测试获取小说详情"""
        # 先创建小说
        create_response = client.post(
            "/novels/",
            json={"title": "详情测试", "genre": "都市职场"}
        )
        novel_id = create_response.json()["data"]["novel_id"]

        # 获取详情
        response = client.get(f"/novels/{novel_id}")

        assert response.status_code == 200
        result = response.json()

        # API 返回格式: {success: true, data: {meta: ...}}
        assert result["success"] is True
        data = result["data"]

        assert "meta" in data
        assert data["meta"]["title"] == "详情测试"

    def test_get_novel_not_found(self, client):
        """测试获取不存在的小说"""
        response = client.get("/novels/non-existent-id")

        assert response.status_code == 404

    def test_delete_novel(self, client):
        """测试删除小说"""
        # 先创建小说
        create_response = client.post(
            "/novels/",
            json={"title": "待删除", "genre": "都市职场"}
        )
        novel_id = create_response.json()["data"]["novel_id"]

        # 删除
        response = client.delete(f"/novels/{novel_id}")

        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True

        # 验证已删除
        get_response = client.get(f"/novels/{novel_id}")
        assert get_response.status_code == 404

    def test_delete_novel_not_found(self, client):
        """测试删除不存在的小说"""
        response = client.delete("/novels/non-existent-id")

        assert response.status_code == 404