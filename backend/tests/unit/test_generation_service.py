"""生成服务单元测试"""
import pytest
import os
import tempfile
import shutil
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from src.infrastructure.storage import FileStorage


class MockAIProvider:
    """Mock AI Provider"""

    def __init__(self, response_content: str):
        self.response_content = response_content

    async def generate(self, prompt: str):
        """Mock generate 方法"""
        return self.response_content

    async def stream_generate(self, prompt: str):
        """Mock stream_generate 方法"""
        chunks = self.response_content.split("\n")
        for chunk in chunks:
            yield chunk


class TestGenerationServiceInit:
    """GenerationService 初始化测试"""

    def test_init_without_api_key(self):
        """测试没有 API 密钥"""
        temp_dir = tempfile.mkdtemp()
        storage = FileStorage(os.path.join(temp_dir, "data", "novels"))

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": ""}, clear=False):
            with pytest.raises(ValueError):
                from src.application.generation_service import GenerationService
                GenerationService(storage)

        shutil.rmtree(temp_dir, ignore_errors=True)


class TestGenerationServiceWorldSetting:
    """世界观生成测试"""

    @pytest.fixture
    def mock_storage(self):
        """创建 Mock 存储"""
        temp_dir = tempfile.mkdtemp()
        storage = FileStorage(os.path.join(temp_dir, "data", "novels"))
        storage.create_novel_dir("test-novel-001")

        storage.save_json("test-novel-001", "meta.json", {
            "novel_id": "test-novel-001",
            "title": "测试小说",
            "genre": "都市职场",
            "status": "planning",
            "created_at": datetime.utcnow().isoformat()
        })

        yield storage, temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    @pytest.mark.asyncio
    async def test_build_world_setting_prompt(self, mock_storage):
        """测试构建世界观 Prompt（都市言情模板）"""
        storage, temp_dir = mock_storage

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                prompt = service._build_world_setting_prompt("一个都市职场故事")

                # 都市言情模板的必要字段
                assert "都市职场故事" in prompt
                assert "background" in prompt
                assert "male_lead" in prompt
                assert "female_lead" in prompt
                assert "emotion_arc" in prompt
                assert "main_conflict" in prompt
                assert "都市言情" in prompt
                assert "JSON" in prompt

    @pytest.mark.asyncio
    async def test_generate_world_setting_success(self, mock_storage):
        """测试成功生成世界观"""
        storage, temp_dir = mock_storage

        mock_response = '''
        {
            "background": {
                "era": "现代",
                "era_name": "2024年",
                "geography": {
                    "world_name": "上海",
                    "regions": [{"name": "浦东", "description": "金融中心"}]
                },
                "society": {
                    "power_structure": "市场经济",
                    "social_classes": ["企业家", "白领", "普通员工"],
                    "key_institutions": ["公司", "银行"]
                }
            },
            "power_system": {
                "name": "职场等级体系",
                "levels": [{"name": "实习生", "rank": 0, "description": "新人"}],
                "key_rules": ["晋升需要业绩"]
            },
            "core_conflict": {
                "main_conflict": {
                    "type": "成长",
                    "description": "职场晋升",
                    "antagonist": "竞争对手"
                },
                "sub_conflicts": []
            },
            "special_elements": []
        }
        '''

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider(mock_response)
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                result = await service.generate_world_setting(
                    "test-novel-001",
                    "都市职场故事"
                )

                assert result is not None
                assert result["novel_id"] == "test-novel-001"
                assert result["version"] == 1

                saved = storage.load_json("test-novel-001", "world_setting.json")
                assert saved is not None
                assert saved["background"]["era"] == "现代"

                meta = storage.load_json("test-novel-001", "meta.json")
                assert meta["current_phase"] == "outline_generation"

    @pytest.mark.asyncio
    async def test_generate_world_setting_parse_error(self, mock_storage):
        """测试解析错误"""
        storage, temp_dir = mock_storage

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("这不是 JSON 格式")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                result = await service.generate_world_setting(
                    "test-novel-001",
                    "都市职场故事"
                )

                assert result is None


class TestGenerationServiceOutline:
    """大纲生成测试"""

    @pytest.fixture
    def mock_storage_with_world(self):
        """创建带世界观的 Mock 存储"""
        temp_dir = tempfile.mkdtemp()
        storage = FileStorage(os.path.join(temp_dir, "data", "novels"))
        storage.create_novel_dir("test-novel-002")

        storage.save_json("test-novel-002", "meta.json", {
            "novel_id": "test-novel-002",
            "title": "测试小说",
            "genre": "都市职场",
            "status": "planning",
            "current_phase": "outline_generation"
        })

        storage.save_json("test-novel-002", "world_setting.json", {
            "novel_id": "test-novel-002",
            "background": {"era": "现代"},
            "power_system": {"name": "职场等级"}
        })

        yield storage, temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    @pytest.mark.asyncio
    async def test_generate_outline_requires_world_setting(self, mock_storage_with_world):
        """测试大纲生成需要世界观"""
        storage, temp_dir = mock_storage_with_world
        storage.save_json("test-novel-002", "world_setting.json", None)

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                with pytest.raises(ValueError):
                    await service.generate_outline("test-novel-002")

    @pytest.mark.asyncio
    async def test_generate_outline_success(self, mock_storage_with_world):
        """测试成功生成大纲"""
        storage, temp_dir = mock_storage_with_world

        mock_response = '''
        {
            "volumes": [{
                "volume_id": "vol-001",
                "name": "第一卷",
                "chapters_range": {"start": 1, "end": 20},
                "theme": "职场入门",
                "arc_summary": "从实习生到正式员工"
            }],
            "chapters": [{
                "chapter_num": 1,
                "title": "第一天",
                "volume_id": "vol-001",
                "key_events": ["入职", "认识同事"]
            }],
            "character_growth_curve": [],
            "foreshadowing_plan": [{
                "id": "fs-001",
                "hint": "神秘老板",
                "recycle_chapter": 10,
                "status": "pending"
            }]
        }
        '''

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider(mock_response)
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                result = await service.generate_outline(
                    "test-novel-002",
                    target_chapters=20,
                    story_preference="快速成长",
                    pacing_preference="紧凑"
                )

                assert result is not None
                assert result["novel_id"] == "test-novel-002"

                # 都市言情简化版：移除伏笔状态初始化检查
                # foreshadowing = storage.load_json("test-novel-002", "state/foreshadowing.json")

                meta = storage.load_json("test-novel-002", "meta.json")
                assert meta["current_phase"] == "chapter_writing"

    # 都市言情简化版：移除伏笔状态初始化测试
    # 整个测试方法已移除（_init_foreshadowing_state 方法已删除）


class TestGenerationServiceChapter:
    """章节生成测试"""

    @pytest.fixture
    def mock_storage_with_outline(self):
        """创建带大纲的 Mock 存储"""
        temp_dir = tempfile.mkdtemp()
        storage = FileStorage(os.path.join(temp_dir, "data", "novels"))
        storage.create_novel_dir("test-novel-003")

        storage.save_json("test-novel-003", "meta.json", {
            "novel_id": "test-novel-003",
            "title": "测试小说",
            "current_phase": "chapter_writing",
            "completed_chapters": 0,
            "word_count": 0
        })

        storage.save_json("test-novel-003", "world_setting.json", {
            "novel_id": "test-novel-003",
            "background": {"era": "现代"}
        })

        storage.save_json("test-novel-003", "characters.json", {
            "novel_id": "test-novel-003",
            "characters": [{"character_id": "char-001", "name": "主角"}]
        })

        storage.save_json("test-novel-003", "outline.json", {
            "novel_id": "test-novel-003",
            "chapters": [{
                "chapter_num": 1,
                "title": "第一章",
                "volume_id": "vol-001",
                "key_events": ["入职"]
            }]
        })

        storage.save_json("test-novel-003", "state/timeline.json", {
            "novel_id": "test-novel-003",
            "events": [],
            "time_scale": {"unit": "天", "current_time": "", "total_duration": ""}
        })

        storage.save_json("test-novel-003", "state/character_states.json", {
            "novel_id": "test-novel-003",
            "states": []
        })

        storage.save_json("test-novel-003", "state/foreshadowing.json", {
            "novel_id": "test-novel-003",
            "foreshadowings": []
        })

        yield storage, temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    @pytest.mark.asyncio
    async def test_load_chapter_context(self, mock_storage_with_outline):
        """测试加载章节上下文（都市言情简化版）"""
        storage, temp_dir = mock_storage_with_outline

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                context = service._load_chapter_context("test-novel-003", 1)

                assert context["world_setting"] is not None
                assert context["characters"] is not None
                assert context["outline"] is not None
                assert context["current_chapter_outline"] is not None
                # 都市言情简化版：移除时间线/人物状态/伏笔检查

    @pytest.mark.asyncio
    async def test_generate_chapter_success(self, mock_storage_with_outline):
        """测试成功生成章节"""
        storage, temp_dir = mock_storage_with_outline

        mock_response = '''
        {
            "content": "今天是入职第一天...",
            "summary": {
                "key_events": ["入职", "认识同事"],
                "emotional_tone": "紧张又期待"
            },
            "character_updates": [{
                "character_id": "char-001",
                "location_change": {"from_location": "家", "to_location": "公司"},
                "emotional_change": {"from_emotion": "紧张", "to_emotion": "期待"}
            }],
            "timeline_additions": [{
                "event": "入职第一天",
                "time": "2024年某天早晨"
            }],
            "foreshadowing_updates": []
        }
        '''

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider(mock_response)
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                result = await service.generate_chapter("test-novel-003", 1)

                assert result is not None
                assert result["novel_id"] == "test-novel-003"
                assert result["chapter_num"] == 1
                assert result["title"] == "第一章"

                chapter = storage.load_json("test-novel-003", "chapters/chapter_001.json")
                assert chapter is not None

                meta = storage.load_json("test-novel-003", "meta.json")
                assert meta["completed_chapters"] == 1
                assert meta["word_count"] > 0

                # 都市言情简化版：移除时间线状态检查

    def test_calculate_word_count(self, mock_storage_with_outline):
        """测试字数计算"""
        storage, temp_dir = mock_storage_with_outline

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                count = service._calculate_word_count("这是测试内容")
                assert count == 6

                count = service._calculate_word_count("这是 测试\n内容")
                assert count == 6

                count = service._calculate_word_count("")
                assert count == 0


class TestGenerationServiceJSONParse:
    """JSON 解析测试"""

    def test_parse_json_result_direct(self):
        """测试直接解析 JSON"""
        storage = MagicMock()
        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                result = service._parse_json_result('{"key": "value"}')
                assert result == {"key": "value"}

    def test_parse_json_result_with_markdown(self):
        """测试解析带 markdown 的 JSON"""
        storage = MagicMock()
        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                result = service._parse_json_result('```json\n{"key": "value"}\n```')
                assert result == {"key": "value"}

    def test_parse_json_result_with_extra_text(self):
        """测试解析带额外文本的 JSON"""
        storage = MagicMock()
        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                result = service._parse_json_result('这是一些文本 {"key": "value"} 更多文本')
                assert result == {"key": "value"}

    def test_parse_json_result_invalid(self):
        """测试无效 JSON"""
        storage = MagicMock()
        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                result = service._parse_json_result("这完全不是 JSON")
                assert result is None