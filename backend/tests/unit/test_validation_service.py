"""校验服务单元测试（都市言情简化版）"""
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
    """校验规则测试（都市言情简化版）"""

    def test_rules_count(self):
        """测试规则总数（简化版：5条）"""
        assert len(VALIDATION_RULES) == 5

    def test_rule_categories(self):
        """测试规则分类（简化版：3类）"""
        categories = {
            "语法规范": ["G001", "G002"],
            "感情线": ["E001", "E002"],
            "人物一致性": ["P001"]
        }

        for category, rules in categories.items():
            for rule_id in rules:
                assert rule_id in VALIDATION_RULES
                assert VALIDATION_RULES[rule_id]["category"] == category

    def test_grammar_rules(self):
        """测试语法规范规则"""
        for rule_id in ["G001", "G002"]:
            rule = VALIDATION_RULES[rule_id]
            assert rule["severity"] == "low"
            assert "description" in rule
            assert "trigger" in rule
            assert "action" in rule
            assert "auto_fix_threshold" in rule

    def test_emotion_rules(self):
        """测试感情线规则（简化版：E001/E002）"""
        emotion_rules = ["E001", "E002"]

        for rule_id in emotion_rules:
            rule = VALIDATION_RULES[rule_id]
            assert rule["category"] == "感情线"
            assert rule["severity"] in ["high", "medium"]

    def test_character_rule(self):
        """测试人物一致性规则"""
        rule = VALIDATION_RULES["P001"]
        assert rule["category"] == "人物一致性"
        assert rule["severity"] == "medium"

    def test_auto_fix_threshold(self):
        """测试自动修复阈值"""
        # 只有语法规则有自动修复阈值
        assert VALIDATION_RULES["G001"]["auto_fix_threshold"] == 90
        assert VALIDATION_RULES["G002"]["auto_fix_threshold"] == 95

        # 感情线和人物一致性规则无自动修复阈值
        for rule_id in ["E001", "E002", "P001"]:
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
        """创建带章节的 Mock 存储（简化版）"""
        temp_dir = tempfile.mkdtemp()
        storage = FileStorage(os.path.join(temp_dir, "data", "novels"))
        storage.create_novel_dir("test-novel-validation")

        storage.save_json("test-novel-validation", "meta.json", {
            "novel_id": "test-novel-validation",
            "title": "测试小说"
        })

        storage.save_json("test-novel-validation", "world_setting.json", {
            "novel_id": "test-novel-validation",
            "background": {"era": "现代"},
            "emotion_stages": ["陌生人", "暧昧", "心动", "热恋", "稳定"]
        })

        storage.save_json("test-novel-validation", "characters.json", {
            "novel_id": "test-novel-validation",
            "characters": [{
                "character_id": "char-001",
                "name": "男主",
                "role": "主角",
                "personality": ["冷静", "霸道"]
            }, {
                "character_id": "char-002",
                "name": "女主",
                "role": "主角",
                "personality": ["温柔", "坚强"]
            }]
        })

        storage.save_json("test-novel-validation", "outline.json", {
            "novel_id": "test-novel-validation",
            "emotion_schedule": [{
                "chapter_range": "1-10",
                "stage": "陌生人",
                "key_events": ["初遇", "误会"]
            }]
        })

        # 简化版：移除 timeline/foreshadowing/character_states

        storage.save_json("test-novel-validation", "chapters/chapter_001.json", {
            "novel_id": "test-novel-validation",
            "chapter_num": 1,
            "title": "第一章",
            "content": "这是第一章内容...",
            "emotion_stage": "陌生人",
            "summary": {
                "key_events": ["初遇"],
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
        """测试加载校验上下文（简化版）"""
        storage, temp_dir = mock_storage_with_chapter

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                context = service._load_validation_context("test-novel-validation", 1)

                # 简化版：只检查核心数据
                assert context["world_setting"] is not None
                assert context["characters"] is not None
                assert context["outline"] is not None
                # timeline/foreshadowing 已移除

    def test_get_rules_by_category(self, mock_storage_with_chapter):
        """测试按类别获取规则（简化版）"""
        storage, temp_dir = mock_storage_with_chapter

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                # 简化版：只有3类
                rules = service._get_rules_by_category("语法规范")
                assert len(rules) == 2
                assert "G001" in rules
                assert "G002" in rules

                rules = service._get_rules_by_category("感情线")
                assert len(rules) == 2
                assert "E001" in rules
                assert "E002" in rules

                rules = service._get_rules_by_category("人物一致性")
                assert len(rules) == 1
                assert "P001" in rules

    def test_build_validation_prompt(self, mock_storage_with_chapter):
        """测试构建校验 Prompt（简化版）"""
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
                    ["G001", "E001"]
                )

                assert "G001" in prompt
                assert "E001" in prompt
                assert "issues" in prompt
                assert "statistics" in prompt
                # 简化版：使用"校验约束"而非"红线规则"
                assert "校验约束" in prompt

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

        # 简化版：使用 E001 而非 L001
        mock_response = '''
        {
            "issues": [{
                "issue_id": "ISS-001",
                "rule_id": "E001",
                "severity": "high",
                "confidence": 85,
                "description": "感情节奏矛盾：当前应为'陌生人'阶段，但描述为'心动'",
                "suggestion": "修正感情描述",
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

                # 简化版：使用存在的类别"感情线"
                report = await service.validate_chapter(
                    "test-novel-validation",
                    1,
                    validation_types=["感情线"]
                )

                assert report is not None


class TestValidationServiceFullNovel:
    """全书校验测试"""

    @pytest.fixture
    def mock_storage_with_multiple_chapters(self):
        """创建带多章节的 Mock 存储（简化版）"""
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

        # 简化版：移除 state 目录文件

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
        """测试全书校验（简化版：移除跨章校验方法）"""
        storage, temp_dir = mock_storage_with_multiple_chapters

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
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
            mock_provider = MockAIProvider(mock_response)
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                # 简化版：直接测试 validate_novel 而非 _cross_chapter_validation
                report = await service.validate_novel("test-novel-full")

                assert report is not None
                assert report["validation_type"] == "full_novel"
                assert "issues" in report

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
        """测试获取规则信息（简化版）"""
        storage, temp_dir = mock_storage_with_multiple_chapters

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                info = service.get_rules_info()

                # 简化版：5条规则，3类
                assert info["total_count"] == 5
                assert "categories" in info
                assert "rules" in info
                # 验证分类结构
                assert "G" in info["categories"]
                assert "E" in info["categories"]
                assert "P" in info["categories"]


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
        """测试解析失败返回 None"""
        storage = MagicMock()
        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.validation_service import ValidationService
                service = ValidationService(storage)

                result = "完全无效的文本"
                parsed = service._parse_validation_result(result, 1)

                # 解析失败时返回 None
                assert parsed is None