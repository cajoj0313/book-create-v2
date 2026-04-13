"""校验服务单元测试"""
import pytest
import os
import tempfile
import shutil
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from src.infrastructure.storage import FileStorage
from src.application.validation_service import VALIDATION_RULES


class MockAIProvider:
    """Mock AI Provider"""

    def __init__(self, response_content: str):
        self.response_content = response_content

    async def generate(self, prompt: str):
        """Mock generate 方法"""
        return self.response_content


class TestValidationRules:
    """校验规则测试"""

    def test_rules_count(self):
        """测试规则总数"""
        assert len(VALIDATION_RULES) == 36

    def test_rule_categories(self):
        """测试规则分类"""
        categories = {
            "逻辑一致性": ["L001", "L002", "L003", "L004", "L005"],
            "语法规范": ["G001", "G002", "G003", "G004", "G005"],
            "风格一致性": ["S001", "S002", "S003"],
            "人物一致性": ["P001", "P002", "P003", "P004"],
            "伏笔一致性": ["F001", "F002", "F003"],
            "商业逻辑": ["B001", "B002", "B003", "B004", "B005", "B006", "B007", "B008"],
            "感情线": ["E001", "E002", "E003", "E004", "E005", "E006", "E007", "E008"]
        }

        for category, rules in categories.items():
            for rule_id in rules:
                assert rule_id in VALIDATION_RULES
                assert VALIDATION_RULES[rule_id]["category"] == category

    def test_logic_rules(self):
        """测试逻辑一致性规则"""
        for rule_id in ["L001", "L002", "L003", "L004", "L005"]:
            rule = VALIDATION_RULES[rule_id]
            assert rule["severity"] in ["high", "medium"]
            assert "description" in rule
            assert "trigger" in rule
            assert "action" in rule

    def test_business_rules(self):
        """测试商业逻辑规则（都市职场专项）"""
        business_rules = ["B001", "B002", "B003", "B004", "B005", "B006", "B007", "B008"]

        for rule_id in business_rules:
            rule = VALIDATION_RULES[rule_id]
            assert rule["category"] == "商业逻辑"
            assert rule["severity"] in ["high", "medium"]

    def test_emotion_rules(self):
        """测试感情线规则（都市职场专项）"""
        emotion_rules = ["E001", "E002", "E003", "E004", "E005", "E006", "E007", "E008"]

        for rule_id in emotion_rules:
            rule = VALIDATION_RULES[rule_id]
            assert rule["category"] == "感情线"
            assert rule["severity"] in ["high", "medium", "low"]

    def test_auto_fix_threshold(self):
        """测试自动修复阈值"""
        assert VALIDATION_RULES["G001"]["auto_fix_threshold"] == 90
        assert VALIDATION_RULES["G002"]["auto_fix_threshold"] == 95

        for rule_id in ["L001", "L002", "L003", "L004", "L005"]:
            assert "auto_fix_threshold" not in VALIDATION_RULES[rule_id]


class TestValidationServiceInit:
    """ValidationService 初始化测试"""

    def test_init_without_api_key(self):
        """测试没有 API 密钥"""
        temp_dir = tempfile.mkdtemp()
        storage = FileStorage(os.path.join(temp_dir, "data", "novels"))

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": ""}, clear=False):
            with pytest.raises(ValueError):
                from src.application.validation_service import ValidationService
                ValidationService(storage)

        shutil.rmtree(temp_dir, ignore_errors=True)


class TestValidationServiceChapterValidation:
    """章节校验测试"""

    @pytest.fixture
    def mock_storage_with_chapter(self):
        """创建带章节的 Mock 存储"""
        temp_dir = tempfile.mkdtemp()
        storage = FileStorage(os.path.join(temp_dir, "data", "novels"))
        storage.create_novel_dir("test-novel-validation")

        storage.save_json("test-novel-validation", "meta.json", {
            "novel_id": "test-novel-validation",
            "title": "测试小说"
        })

        storage.save_json("test-novel-validation", "world_setting.json", {
            "novel_id": "test-novel-validation",
            "background": {"era": "现代"}
        })

        storage.save_json("test-novel-validation", "characters.json", {
            "novel_id": "test-novel-validation",
            "characters": [{
                "character_id": "char-001",
                "name": "主角",
                "personality": ["冷静"]
            }]
        })

        storage.save_json("test-novel-validation", "outline.json", {
            "novel_id": "test-novel-validation"
        })

        storage.save_json("test-novel-validation", "state/timeline.json", {
            "novel_id": "test-novel-validation",
            "events": [{
                "order": 1,
                "chapter": 1,
                "time": "第一天",
                "event": "入职"
            }]
        })

        storage.save_json("test-novel-validation", "state/character_states.json", {
            "novel_id": "test-novel-validation",
            "states": [{
                "character_id": "char-001",
                "current_location": "公司",
                "emotional_state": "正常"
            }]
        })

        storage.save_json("test-novel-validation", "state/foreshadowing.json", {
            "novel_id": "test-novel-validation",
            "foreshadowings": [{
                "id": "fs-001",
                "hint": "神秘老板",
                "planted_chapter": 1,
                "planned_recycle_chapter": 10,
                "status": "planted"
            }]
        })

        storage.save_json("test-novel-validation", "chapters/chapter_001.json", {
            "novel_id": "test-novel-validation",
            "chapter_num": 1,
            "title": "第一章",
            "content": "这是第一章内容...",
            "summary": {
                "key_events": ["入职"],
                "emotional_tone": "紧张"
            },
            "validation_status": {
                "last_validated": None,
                "issues_found": 0,
                "issues_fixed": 0
            }
        })

        yield storage, temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    @pytest.mark.asyncio
    async def test_load_validation_context(self, mock_storage_with_chapter):
        """测试加载校验上下文"""
        storage, temp_dir = mock_storage_with_chapter

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                context = service._load_validation_context("test-novel-validation", 1)

                assert context["world_setting"] is not None
                assert context["characters"] is not None
                assert context["timeline"] is not None
                assert context["character_states"] is not None
                assert context["foreshadowing"] is not None

    def test_get_rules_by_category(self, mock_storage_with_chapter):
        """测试按类别获取规则"""
        storage, temp_dir = mock_storage_with_chapter

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                rules = service._get_rules_by_category("逻辑一致性")
                assert len(rules) == 5
                assert "L001" in rules

                rules = service._get_rules_by_category("商业逻辑")
                assert len(rules) == 8

                rules = service._get_rules_by_category("感情线")
                assert len(rules) == 8

    def test_build_validation_prompt(self, mock_storage_with_chapter):
        """测试构建校验 Prompt"""
        storage, temp_dir = mock_storage_with_chapter

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                chapter = storage.load_json("test-novel-validation", "chapters/chapter_001.json")
                context = service._load_validation_context("test-novel-validation", 1)

                prompt = service._build_validation_prompt(
                    chapter,
                    context,
                    ["L001", "G001"]
                )

                assert "L001" in prompt
                assert "G001" in prompt
                assert "issues" in prompt
                assert "statistics" in prompt
                assert "红线规则" in prompt

    @pytest.mark.asyncio
    async def test_validate_chapter_success(self, mock_storage_with_chapter):
        """测试成功校验章节"""
        storage, temp_dir = mock_storage_with_chapter

        mock_response = '''
        {
            "issues": [{
                "issue_id": "ISS-001",
                "rule_id": "G001",
                "severity": "low",
                "confidence": 95,
                "description": "错别字：'此刻'应为'这时'",
                "suggestion": "修正为'这时'",
                "auto_fix_available": true,
                "auto_fix_text": "这时",
                "status": "auto_fixed"
            }],
            "statistics": {
                "total_issues": 1,
                "high_severity": 0,
                "medium_severity": 0,
                "low_severity": 1,
                "auto_fixed": 1,
                "pending": 0
            }
        }
        '''

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider(mock_response)
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                report = await service.validate_chapter("test-novel-validation", 1)

                assert report is not None
                assert report["novel_id"] == "test-novel-validation"
                assert report["chapter_num"] == 1
                assert report["validation_type"] == "single_chapter"

                import glob
                report_files = glob.glob(os.path.join(
                    storage.data_dir,
                    "test-novel-validation",
                    "validation_reports",
                    "chapter_001_*.json"
                ))
                assert len(report_files) > 0

    @pytest.mark.asyncio
    async def test_validate_chapter_with_high_severity(self, mock_storage_with_chapter):
        """测试校验发现高严重问题"""
        storage, temp_dir = mock_storage_with_chapter

        mock_response = '''
        {
            "issues": [{
                "issue_id": "ISS-001",
                "rule_id": "L001",
                "severity": "high",
                "confidence": 85,
                "description": "时间线矛盾：本章描述'三天后'，但上一章'次日'",
                "suggestion": "修正时间描述",
                "auto_fix_available": false,
                "status": "pending"
            }],
            "statistics": {
                "total_issues": 1,
                "high_severity": 1,
                "medium_severity": 0,
                "low_severity": 0,
                "auto_fixed": 0,
                "pending": 1
            }
        }
        '''

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider(mock_response)
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                report = await service.validate_chapter("test-novel-validation", 1)

                assert report["statistics"]["high_severity"] == 1
                assert report["issues"][0]["status"] == "pending"
                assert report["issues"][0]["auto_fix_available"] is False

    @pytest.mark.asyncio
    async def test_validate_chapter_not_found(self, mock_storage_with_chapter):
        """测试章节不存在"""
        storage, temp_dir = mock_storage_with_chapter

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                with pytest.raises(ValueError):
                    await service.validate_chapter("test-novel-validation", 999)

    @pytest.mark.asyncio
    async def test_validate_with_specific_types(self, mock_storage_with_chapter):
        """测试指定校验类型"""
        storage, temp_dir = mock_storage_with_chapter

        mock_response = '''
        {
            "issues": [],
            "statistics": {
                "total_issues": 0,
                "high_severity": 0,
                "medium_severity": 0,
                "low_severity": 0,
                "auto_fixed": 0,
                "pending": 0
            }
        }
        '''

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider(mock_response)
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                report = await service.validate_chapter(
                    "test-novel-validation",
                    1,
                    validation_types=["逻辑一致性"]
                )

                assert report is not None


class TestValidationServiceFullNovel:
    """全书校验测试"""

    @pytest.fixture
    def mock_storage_with_multiple_chapters(self):
        """创建带多章节的 Mock 存储"""
        temp_dir = tempfile.mkdtemp()
        storage = FileStorage(os.path.join(temp_dir, "data", "novels"))
        storage.create_novel_dir("test-novel-full")

        storage.save_json("test-novel-full", "meta.json", {
            "novel_id": "test-novel-full",
            "title": "测试小说",
            "completed_chapters": 2,
            "word_count": 1000
        })

        storage.save_json("test-novel-full", "world_setting.json", {"era": "现代"})
        storage.save_json("test-novel-full", "characters.json", {"characters": []})
        storage.save_json("test-novel-full", "outline.json", {"chapters": []})
        storage.save_json("test-novel-full", "state/timeline.json", {"events": []})
        storage.save_json("test-novel-full", "state/character_states.json", {"states": []})

        storage.save_json("test-novel-full", "state/foreshadowing.json", {
            "novel_id": "test-novel-full",
            "foreshadowings": [{
                "id": "fs-001",
                "hint": "神秘老板",
                "planted_chapter": 1,
                "planned_recycle_chapter": 5,
                "status": "planted"
            }]
        })

        for i in range(1, 3):
            storage.save_json("test-novel-full", f"chapters/chapter_{i:03d}.json", {
                "chapter_num": i,
                "title": f"第{i}章",
                "content": f"第{i}章内容",
                "summary": {"key_events": []},
                "validation_status": {"last_validated": None, "issues_found": 0}
            })

        yield storage, temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    @pytest.mark.asyncio
    async def test_cross_chapter_validation(self, mock_storage_with_multiple_chapters):
        """测试跨章校验"""
        storage, temp_dir = mock_storage_with_multiple_chapters

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider('{"issues": [], "statistics": {}}')
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                issues = await service._cross_chapter_validation("test-novel-full")

                assert len(issues) >= 1
                assert issues[0]["rule_id"] == "F001"
                assert "伏笔" in issues[0]["description"]

    def test_calculate_statistics(self, mock_storage_with_multiple_chapters):
        """测试统计计算"""
        storage, temp_dir = mock_storage_with_multiple_chapters

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                issues = [
                    {"severity": "high", "status": "pending"},
                    {"severity": "medium", "status": "pending"},
                    {"severity": "low", "status": "auto_fixed"},
                    {"severity": "high", "status": "auto_fixed"}
                ]

                stats = service._calculate_statistics(issues)

                assert stats["total_issues"] == 4
                assert stats["high_severity"] == 2
                assert stats["medium_severity"] == 1
                assert stats["low_severity"] == 1
                assert stats["auto_fixed"] == 2
                assert stats["pending"] == 2

    def test_get_rules_info(self, mock_storage_with_multiple_chapters):
        """测试获取规则信息"""
        storage, temp_dir = mock_storage_with_multiple_chapters

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                info = service.get_rules_info()

                assert info["total_rules"] == 36
                assert "categories" in info
                assert info["categories"]["逻辑一致性"] == 5
                assert info["categories"]["商业逻辑"] == 8
                assert info["categories"]["感情线"] == 8


class TestValidationServiceJSONParse:
    """校验 JSON 解析测试"""

    def test_parse_validation_result_direct(self):
        """测试直接解析"""
        storage = MagicMock()
        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                result = '{"issues": [], "statistics": {}}'
                parsed = service._parse_validation_result(result, 1)

                assert parsed is not None
                assert "issues" in parsed

    def test_parse_validation_result_with_markdown(self):
        """测试带 markdown 解析"""
        storage = MagicMock()
        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                result = '```json\n{"issues": [], "statistics": {}}\n```'
                parsed = service._parse_validation_result(result, 1)

                assert parsed is not None

    def test_parse_validation_result_empty_on_failure(self):
        """测试解析失败返回空报告"""
        storage = MagicMock()
        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                result = "完全无效的文本"
                parsed = service._parse_validation_result(result, 1)

                assert parsed is not None
                assert parsed["issues"] == []
                assert parsed["statistics"]["total_issues"] == 0