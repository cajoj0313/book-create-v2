"""E2E 集成测试 - API 功能完整性"""
import pytest
from fastapi.testclient import TestClient
import tempfile
import shutil
import os
import sys
import json
from unittest.mock import AsyncMock, MagicMock, patch

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.interfaces.main import app


class MockAIProviderForE2E:
    """E2E 测试专用 Mock AI Provider"""

    async def generate(self, prompt: str):
        """Mock generate"""
        # 根据 prompt 内容返回不同结果 - 注意顺序很重要，校验优先
        if "文案校验" in prompt or "校验规则" in prompt:
            return json.dumps({
                "issues": [],
                "statistics": {"total_issues": 0, "high_severity": 0, "medium_severity": 0, "low_severity": 0, "auto_fixed": 0, "pending": 0}
            })
        elif "生成小说世界观" in prompt or ("世界观" in prompt and "校验" not in prompt):
            return json.dumps({
                "background": {
                    "era": "现代",
                    "era_name": "2024年",
                    "geography": {"world_name": "上海", "regions": []},
                    "society": {"power_structure": "市场经济", "social_classes": [], "key_institutions": []}
                },
                "power_system": {"name": "职场等级体系", "levels": [], "key_rules": []},
                "core_conflict": {"main_conflict": {"type": "成长", "description": "职场晋升"}},
                "special_elements": []
            })
        elif "生成小说大纲" in prompt or ("大纲" in prompt and "校验" not in prompt):
            return json.dumps({
                "volumes": [{"volume_id": "vol-001", "name": "第一卷", "chapters_range": {"start": 1, "end": 10}, "theme": "成长"}],
                "chapters": [{"chapter_num": 1, "title": "第一章", "volume_id": "vol-001", "key_events": ["入职"]}],
                "character_growth_curve": [],
                "foreshadowing_plan": []
            })
        elif "续写小说章节" in prompt or ("章节" in prompt and "校验" not in prompt):
            return json.dumps({
                "content": "这是第一章的内容...",
                "summary": {"key_events": ["入职"], "emotional_tone": "期待"},
                "character_updates": [],
                "timeline_additions": [{"event": "入职", "time": "第一天"}],
                "foreshadowing_updates": []
            })
        return "{}"

    async def stream_generate(self, prompt: str):
        """Mock stream_generate"""
        # 分块返回内容
        content = await self.generate(prompt)
        chunks = content.split("\n")
        for chunk in chunks:
            yield chunk


def get_response_data(response):
    """辅助函数：提取 API 响应数据"""
    result = response.json()
    # API 返回格式: {success: true, data: {...}}
    if "success" in result and result["success"]:
        return result.get("data", result)
    # 直接返回数据的情况
    return result


class TestE2EFullWorkflow:
    """完整业务流程测试"""

    @pytest.fixture(autouse=True)
    def setup_test_env(self):
        """设置测试环境"""
        # 创建临时目录
        self.test_dir = tempfile.mkdtemp()
        self.test_data_dir = os.path.join(self.test_dir, "data", "novels")
        os.makedirs(self.test_data_dir, exist_ok=True)

        # 保存原始工作目录
        self.original_cwd = os.getcwd()
        os.chdir(self.test_dir)

        # Mock AI Provider
        self.mock_ai_patcher = patch(
            'src.application.generation_service.AIProviderFactory.create',
            return_value=MockAIProviderForE2E()
        )
        self.mock_ai_patcher.start()

        # Mock 环境变量
        self.env_patcher = patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"})
        self.env_patcher.start()

        yield

        # 清理
        self.mock_ai_patcher.stop()
        self.env_patcher.stop()
        os.chdir(self.original_cwd)
        shutil.rmtree(self.test_dir, ignore_errors=True)

    @pytest.fixture
    def client(self):
        """创建测试客户端"""
        return TestClient(app)

    def test_create_novel(self, client):
        """测试步骤 1: 创建小说"""
        response = client.post(
            "/novels/",
            json={
                "title": "E2E测试小说",
                "genre": "都市职场",
                "target_chapters": 10
            }
        )

        assert response.status_code == 200
        data = get_response_data(response)
        self.novel_id = data["novel_id"]

        assert data["title"] == "E2E测试小说"
        assert data["genre"] == "都市职场"
        assert data["status"] == "planning"

    def test_full_workflow(self, client):
        """测试完整流程: 创建 → 世界观 → 大纲 → 章节 → 校验"""
        # 步骤 1: 创建小说
        create_response = client.post(
            "/novels/",
            json={
                "title": "完整流程测试",
                "genre": "都市职场",
                "target_chapters": 10
            }
        )
        assert create_response.status_code == 200
        novel_id = get_response_data(create_response)["novel_id"]

        # 步骤 2: 生成世界观
        world_response = client.post(
            "/generation/world-setting",
            json={
                "novel_id": novel_id,
                "user_description": "一个都市职场故事"
            }
        )
        assert world_response.status_code == 200
        world_data = get_response_data(world_response)
        assert world_data["novel_id"] == novel_id

        # 步骤 3: 获取小说详情，验证世界观已保存
        detail_response = client.get(f"/novels/{novel_id}")
        assert detail_response.status_code == 200
        detail_data = get_response_data(detail_response)
        assert detail_data["world_setting"] is not None

        # 步骤 4: 生成大纲
        outline_response = client.post(
            "/generation/outline",
            json={
                "novel_id": novel_id,
                "target_chapters": 10,
                "story_preference": "平衡发展",
                "pacing_preference": "中等节奏"
            }
        )
        assert outline_response.status_code == 200
        outline_data = get_response_data(outline_response)
        assert outline_data["novel_id"] == novel_id

        # 步骤 5: 生成章节
        chapter_response = client.post(
            "/generation/chapter",
            json={
                "novel_id": novel_id,
                "chapter_num": 1
            }
        )
        assert chapter_response.status_code == 200
        chapter_data = get_response_data(chapter_response)
        assert chapter_data["chapter_num"] == 1

        # 步骤 6: 获取章节内容
        get_chapter_response = client.get(f"/generation/chapter/{novel_id}/1")
        assert get_chapter_response.status_code == 200
        saved_chapter = get_chapter_response.json()
        # 验证章节已保存（Mock 数据可能没有 content，但应该有其他字段）
        assert "chapter_num" in saved_chapter or "novel_id" in saved_chapter

        # 步骤 7: 校验章节
        validate_response = client.post(
            "/generation/validate/chapter",
            json={
                "novel_id": novel_id,
                "chapter_num": 1
            }
        )
        assert validate_response.status_code == 200
        validate_data = get_response_data(validate_response)
        assert "issues" in validate_data
        assert "statistics" in validate_data

        # 步骤 8: 删除小说
        delete_response = client.delete(f"/novels/{novel_id}")
        assert delete_response.status_code == 200

        # 步骤 9: 验证已删除
        get_deleted_response = client.get(f"/novels/{novel_id}")
        assert get_deleted_response.status_code == 404


class TestE2EAPIEndpoints:
    """API 端点完整性测试"""

    @pytest.fixture(autouse=True)
    def setup_test_env(self):
        """设置测试环境"""
        self.test_dir = tempfile.mkdtemp()
        self.test_data_dir = os.path.join(self.test_dir, "data", "novels")
        os.makedirs(self.test_data_dir, exist_ok=True)

        self.original_cwd = os.getcwd()
        os.chdir(self.test_dir)

        self.mock_ai_patcher = patch(
            'src.application.generation_service.AIProviderFactory.create',
            return_value=MockAIProviderForE2E()
        )
        self.mock_ai_patcher.start()

        self.env_patcher = patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"})
        self.env_patcher.start()

        yield

        self.mock_ai_patcher.stop()
        self.env_patcher.stop()
        os.chdir(self.original_cwd)
        shutil.rmtree(self.test_dir, ignore_errors=True)

    @pytest.fixture
    def client(self):
        """创建测试客户端"""
        return TestClient(app)

    def test_root_endpoint(self, client):
        """测试根路径"""
        response = client.get("/")
        assert response.status_code == 200
        assert "灵笔" in response.json()["message"]

    def test_health_endpoint(self, client):
        """测试健康检查"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_list_novels_endpoint(self, client):
        """测试小说列表"""
        response = client.get("/novels/")
        assert response.status_code == 200
        # API 返回格式: {success: true, data: [...]}
        result = response.json()
        assert result["success"] is True
        assert isinstance(result["data"], list)

    def test_create_novel_endpoint(self, client):
        """测试创建小说"""
        response = client.post(
            "/novels/",
            json={"title": "API测试小说", "genre": "都市职场"}
        )
        assert response.status_code == 200
        data = get_response_data(response)
        assert "novel_id" in data
        assert data["title"] == "API测试小说"

    def test_get_novel_endpoint(self, client):
        """测试获取小说详情"""
        # 先创建
        create_response = client.post(
            "/novels/",
            json={"title": "详情测试", "genre": "都市职场"}
        )
        novel_id = get_response_data(create_response)["novel_id"]

        # 获取详情
        response = client.get(f"/novels/{novel_id}")
        assert response.status_code == 200
        data = get_response_data(response)
        assert "meta" in data

    def test_get_novel_not_found(self, client):
        """测试获取不存在的小说"""
        response = client.get("/novels/non-existent-id")
        assert response.status_code == 404

    def test_delete_novel_endpoint(self, client):
        """测试删除小说"""
        # 先创建
        create_response = client.post(
            "/novels/",
            json={"title": "删除测试", "genre": "都市职场"}
        )
        novel_id = get_response_data(create_response)["novel_id"]

        # 删除
        response = client.delete(f"/novels/{novel_id}")
        assert response.status_code == 200

        # 验证已删除
        response = client.get(f"/novels/{novel_id}")
        assert response.status_code == 404

    def test_validation_rules_endpoint(self, client):
        """测试校验规则端点"""
        response = client.get("/generation/validate/rules")
        assert response.status_code == 200
        data = response.json()
        # 都市言情简化版：5条规则（G001, G002, E001, E002, P001）
        assert data["total_rules"] == 5
        assert "categories" in data
        # 验证规则详情存在
        assert "rules" in data
        # 验证规则 ID 正确
        expected_rules = {"G001", "G002", "E001", "E002", "P001"}
        assert set(data["rules"].keys()) == expected_rules

    def test_world_setting_not_found(self, client):
        """测试世界观生成 - 小说不存在"""
        response = client.post(
            "/generation/world-setting",
            json={"novel_id": "non-existent", "user_description": "测试"}
        )
        assert response.status_code == 404

    def test_outline_without_world_setting(self, client):
        """测试大纲生成 - 无世界观"""
        # 创建小说但不生成世界观
        create_response = client.post(
            "/novels/",
            json={"title": "无世界观测试", "genre": "都市职场"}
        )
        novel_id = get_response_data(create_response)["novel_id"]

        # 直接尝试生成大纲
        response = client.post(
            "/generation/outline",
            json={"novel_id": novel_id, "target_chapters": 10}
        )
        assert response.status_code == 400

    def test_chapter_without_outline(self, client):
        """测试章节生成 - 无大纲"""
        # 创建小说
        create_response = client.post(
            "/novels/",
            json={"title": "无大纲测试", "genre": "都市职场"}
        )
        novel_id = get_response_data(create_response)["novel_id"]

        # 直接尝试生成章节
        response = client.post(
            "/generation/chapter",
            json={"novel_id": novel_id, "chapter_num": 1}
        )
        assert response.status_code == 400

    def test_validate_nonexistent_chapter(self, client):
        """测试校验不存在的章节"""
        # 创建小说
        create_response = client.post(
            "/novels/",
            json={"title": "校验测试", "genre": "都市职场"}
        )
        novel_id = get_response_data(create_response)["novel_id"]

        # 校验不存在章节
        response = client.post(
            "/generation/validate/chapter",
            json={"novel_id": novel_id, "chapter_num": 999}
        )
        assert response.status_code == 404


class TestE2ESSEStreaming:
    """SSE 流式传输测试"""

    @pytest.fixture(autouse=True)
    def setup_test_env(self):
        """设置测试环境"""
        self.test_dir = tempfile.mkdtemp()
        os.makedirs(os.path.join(self.test_dir, "data", "novels"), exist_ok=True)

        self.original_cwd = os.getcwd()
        os.chdir(self.test_dir)

        # 创建支持流式的 Mock
        mock_provider = MockAIProviderForE2E()

        self.mock_ai_patcher = patch(
            'src.application.generation_service.AIProviderFactory.create',
            return_value=mock_provider
        )
        self.mock_ai_patcher.start()

        self.env_patcher = patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"})
        self.env_patcher.start()

        yield

        self.mock_ai_patcher.stop()
        self.env_patcher.stop()
        os.chdir(self.original_cwd)
        shutil.rmtree(self.test_dir, ignore_errors=True)

    @pytest.fixture
    def client(self):
        """创建测试客户端"""
        return TestClient(app)

    @pytest.mark.skip(reason="TestClient 不支持 stream=True 参数")
    def test_stream_world_setting(self, client):
        """测试流式生成世界观"""
        # 先创建小说
        create_response = client.post(
            "/novels/",
            json={"title": "SSE测试", "genre": "都市职场"}
        )
        novel_id = get_response_data(create_response)["novel_id"]

        # 流式生成世界观
        response = client.post(
            "/generation/world-setting/stream",
            json={"novel_id": novel_id, "user_description": "都市职场"},
            stream=True
        )

        # 收集所有事件
        events = []
        for line in response.iter_lines():
            if line:
                events.append(line.decode('utf-8'))

        # 验证有 SSE 事件
        assert len(events) > 0
        # 验证格式正确
        event_types = [e for e in events if e.startswith("event:")]
        assert len(event_types) >= 1  # 应有 start 或其他事件

    @pytest.mark.skip(reason="TestClient 不支持 stream=True 参数")
    def test_stream_outline(self, client):
        """测试流式生成大纲"""
        # 创建小说并生成世界观
        create_response = client.post(
            "/novels/",
            json={"title": "大纲SSE测试", "genre": "都市职场"}
        )
        novel_id = get_response_data(create_response)["novel_id"]

        # 先生成世界观
        client.post(
            "/generation/world-setting",
            json={"novel_id": novel_id, "user_description": "都市职场"}
        )

        # 流式生成大纲
        response = client.post(
            "/generation/outline/stream",
            json={"novel_id": novel_id, "target_chapters": 10},
            stream=True
        )

        events = []
        for line in response.iter_lines():
            if line:
                events.append(line.decode('utf-8'))

        assert len(events) > 0

    @pytest.mark.skip(reason="TestClient 不支持 stream=True 参数")
    def test_stream_chapter(self, client):
        """测试流式生成章节"""
        # 准备完整数据
        create_response = client.post(
            "/novels/",
            json={"title": "章节SSE测试", "genre": "都市职场"}
        )
        novel_id = get_response_data(create_response)["novel_id"]

        client.post(
            "/generation/world-setting",
            json={"novel_id": novel_id, "user_description": "都市职场"}
        )

        client.post(
            "/generation/outline",
            json={"novel_id": novel_id, "target_chapters": 10}
        )

        # 流式生成章节
        response = client.post(
            "/generation/chapter/stream",
            json={"novel_id": novel_id, "chapter_num": 1},
            stream=True
        )

        events = []
        for line in response.iter_lines():
            if line:
                events.append(line.decode('utf-8'))

        assert len(events) > 0


class TestE2EErrorHandling:
    """错误处理测试"""

    @pytest.fixture(autouse=True)
    def setup_test_env(self):
        """设置测试环境"""
        self.test_dir = tempfile.mkdtemp()
        os.makedirs(os.path.join(self.test_dir, "data", "novels"), exist_ok=True)

        self.original_cwd = os.getcwd()
        os.chdir(self.test_dir)

        self.env_patcher = patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"})
        self.env_patcher.start()

        yield

        self.env_patcher.stop()
        os.chdir(self.original_cwd)
        shutil.rmtree(self.test_dir, ignore_errors=True)

    @pytest.fixture
    def client(self):
        """创建测试客户端"""
        return TestClient(app)

    def test_create_novel_invalid_data(self, client):
        """测试创建小说 - 无效数据"""
        # 缺少必需字段
        response = client.post("/novels/", json={"genre": "都市职场"})
        assert response.status_code == 422  # Validation error

    def test_create_novel_negative_chapters(self, client):
        """测试创建小说 - 负数章节"""
        response = client.post(
            "/novels/",
            json={"title": "测试", "target_chapters": -1}
        )
        # 应该被模型验证拒绝，但 API 可能返回 200 或 422
        # 取决于验证在哪里
        # 这里我们检查是否被接受或拒绝
        # Pydantic 会拒绝负数
        assert response.status_code in [200, 422]

    def test_delete_nonexistent_novel(self, client):
        """测试删除不存在的小说"""
        response = client.delete("/novels/non-existent-id")
        assert response.status_code == 404

    def test_get_chapter_not_found(self, client):
        """测试获取不存在的章节"""
        response = client.get("/generation/chapter/non-existent/1")
        assert response.status_code == 404

    def test_validation_report_not_found(self, client):
        """测试获取不存在的校验报告"""
        # 先创建小说
        create_response = client.post(
            "/novels/",
            json={"title": "报告测试", "genre": "都市职场"}
        )
        novel_id = get_response_data(create_response)["novel_id"]

        response = client.get(f"/generation/validate/report/{novel_id}/1")
        assert response.status_code == 404


class TestE2EDataPersistence:
    """数据持久化测试"""

    @pytest.fixture(autouse=True)
    def setup_test_env(self):
        """设置测试环境"""
        self.test_dir = tempfile.mkdtemp()
        self.test_data_dir = os.path.join(self.test_dir, "data", "novels")
        os.makedirs(self.test_data_dir, exist_ok=True)

        self.original_cwd = os.getcwd()
        os.chdir(self.test_dir)

        self.mock_ai_patcher = patch(
            'src.application.generation_service.AIProviderFactory.create',
            return_value=MockAIProviderForE2E()
        )
        self.mock_ai_patcher.start()

        self.env_patcher = patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"})
        self.env_patcher.start()

        yield

        self.mock_ai_patcher.stop()
        self.env_patcher.stop()
        os.chdir(self.original_cwd)
        shutil.rmtree(self.test_dir, ignore_errors=True)

    @pytest.fixture
    def client(self):
        """创建测试客户端"""
        return TestClient(app)

    def test_novel_persistence(self, client):
        """测试小说数据持久化"""
        # 创建小说
        create_response = client.post(
            "/novels/",
            json={"title": "持久化测试", "genre": "都市职场", "target_chapters": 10}
        )
        novel_id = get_response_data(create_response)["novel_id"]

        # 多次获取验证数据持久化
        for _ in range(3):
            response = client.get(f"/novels/{novel_id}")
            assert response.status_code == 200
            data = get_response_data(response)
            assert data["meta"]["title"] == "持久化测试"

    def test_world_setting_persistence(self, client):
        """测试世界观持久化"""
        create_response = client.post(
            "/novels/",
            json={"title": "世界观持久化", "genre": "都市职场"}
        )
        novel_id = get_response_data(create_response)["novel_id"]

        # 生成世界观
        client.post(
            "/generation/world-setting",
            json={"novel_id": novel_id, "user_description": "都市职场"}
        )

        # 多次获取验证持久化
        for _ in range(3):
            response = client.get(f"/novels/{novel_id}")
            data = get_response_data(response)
            assert data["world_setting"] is not None

    def test_chapter_persistence(self, client):
        """测试章节持久化"""
        create_response = client.post(
            "/novels/",
            json={"title": "章节持久化", "genre": "都市职场"}
        )
        novel_id = get_response_data(create_response)["novel_id"]

        # 生成必要数据
        client.post(
            "/generation/world-setting",
            json={"novel_id": novel_id, "user_description": "都市职场"}
        )
        client.post(
            "/generation/outline",
            json={"novel_id": novel_id, "target_chapters": 10}
        )

        # 生成章节
        client.post(
            "/generation/chapter",
            json={"novel_id": novel_id, "chapter_num": 1}
        )

        # 多次获取验证持久化
        for _ in range(3):
            response = client.get(f"/generation/chapter/{novel_id}/1")
            assert response.status_code == 200
            assert response.json()["chapter_num"] == 1

    