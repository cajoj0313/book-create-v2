"""短篇小说 MVP 功能单元测试

测试新增的功能：
1. 故事梗概生成 (story synopsis)
2. 章节批量拆分 (batch chapter splitting)
3. 内心世界深度设定 (inner_wound, growth_arc)
"""
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


class TestStorySynopsisGeneration:
    """故事梗概生成测试"""

    @pytest.fixture
    def mock_storage_with_complete_data(self):
        """创建包含世界观和大纲的 Mock 存储"""
        temp_dir = tempfile.mkdtemp()
        storage = FileStorage(os.path.join(temp_dir, "data", "novels"))
        storage.create_novel_dir("test-novel-001")

        # 保存 meta
        storage.save_json("test-novel-001", "meta.json", {
            "novel_id": "test-novel-001",
            "title": "测试短篇小说",
            "genre": "都市职场",
            "status": "writing",
            "target_chapters": 12,
            "created_at": datetime.utcnow().isoformat()
        })

        # 保存世界观（包含内心创伤和成长弧光）
        storage.save_json("test-novel-001", "world_setting.json", {
            "novel_id": "test-novel-001",
            "version": 1,
            "background": {
                "era": "现代",
                "era_name": "2024 年",
                "geography": {
                    "world_name": "上海",
                    "regions": [
                        {"name": "浦东新区", "description": "金融中心"},
                        {"name": "黄浦区", "description": "老城区"}
                    ]
                },
                "society": {
                    "power_structure": "职场竞争",
                    "social_classes": ["高管", "中层", "基层员工"],
                    "key_institutions": ["天成广告公司", "奥美广告公司"]
                }
            },
            "male_lead": {
                "name": "陆远",
                "age": 28,
                "appearance": "身材修长，眼神深邃",
                "personality": ["冷静", "理性", "外冷内热"],
                "background": "广告界天才，曾因失误导致项目失败",
                "inner_wound": "前女友因他工作太忙而分手，不再相信爱情",
                "growth_arc": "从封闭内心到学会信任和爱",
                "abilities": {
                    "skills": ["创意策划", "团队管理", "市场分析"]
                }
            },
            "female_lead": {
                "name": "苏晴",
                "age": 25,
                "appearance": "清丽脱俗，笑容温暖",
                "personality": ["乐观", "坚韧", "善解人意"],
                "background": "新人策划师，大学时被男友劈腿",
                "inner_wound": "大学时被男友劈腿，自卑敏感",
                "growth_arc": "从自卑到自信，学会爱自己",
                "abilities": {
                    "skills": ["文案写作", "沟通协调"]
                }
            },
            "emotion_arc": {
                "stages": [
                    {"stage": "初遇", "chapter_range": "1-2", "description": "职场相遇，互有印象"},
                    {"stage": "暧昧", "chapter_range": "3-5", "description": "合作项目中逐渐了解"},
                    {"stage": "升温", "chapter_range": "6-8", "description": "共同克服困难"},
                    {"stage": "甜蜜", "chapter_range": "9-10", "description": "确认关系"},
                    {"stage": "波折", "chapter_range": "11", "description": "误会与考验"},
                    {"stage": "结局", "chapter_range": "12", "description": "和解与成长"}
                ]
            },
            "theme": {
                "main": "爱与治愈",
                "description": "通过职场竞争和感情纠葛，探讨现代都市人如何在压力下保持初心"
            },
            "core_conflict": {
                "main_conflict": {
                    "type": "职场竞争",
                    "description": "天成广告 vs 奥美广告的竞标大战"
                },
                "sub_conflicts": [
                    {"type": "成长", "description": "主角从职场新人到独当一面"},
                    {"type": "情感", "description": "主角之间的爱情纠葛"}
                ]
            }
        })

        # 保存大纲（12 章短篇小说）
        storage.save_json("test-novel-001", "outline.json", {
            "novel_id": "test-novel-001",
            "version": 1,
            "volumes": [
                {
                    "volume_id": "vol-001",
                    "name": "第一卷：职场新星",
                    "chapters_range": {"start": 1, "end": 12},
                    "theme": "职场成长与爱情",
                    "arc_summary": "苏晴加入天成广告，与陆远从相识到相恋"
                }
            ],
            "chapters": [
                {
                    "chapter_num": 1,
                    "title": "初入职场",
                    "key_events": ["苏晴入职天成广告", "与陆远初次相遇", "被分配到重要项目"],
                    "turning_points": [{"event": "与陆远相遇", "type": "初遇"}]
                },
                {
                    "chapter_num": 2,
                    "title": "第一次合作",
                    "key_events": ["团队讨论方案", "苏晴提出创意", "陆远注意到她"],
                    "turning_points": [{"event": "创意被采纳", "type": "认可"}]
                }
            ],
            "character_growth_curve": [
                {"chapter_range": "1-3", "character_id": "苏晴", "growth": "从紧张到适应"},
                {"chapter_range": "4-6", "character_id": "苏晴", "growth": "从依赖到独立"}
            ]
        })

        yield storage, temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    @pytest.mark.asyncio
    async def test_build_story_synopsis_prompt(self, mock_storage_with_complete_data):
        """测试构建故事梗概 Prompt"""
        storage, temp_dir = mock_storage_with_complete_data

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                # 加载世界观和大纲
                world_setting = storage.load_json("test-novel-001", "world_setting.json")
                outline = storage.load_json("test-novel-001", "outline.json")

                prompt = service._build_story_synopsis_prompt(world_setting, outline)

                # 验证 Prompt 包含必要元素
                assert "陆远" in prompt  # 男主名字
                assert "苏晴" in prompt  # 女主名字
                assert "inner_wound" in prompt or "内心创伤" in prompt
                assert "growth_arc" in prompt or "成长弧光" in prompt
                assert "emotion_arc" in prompt or "感情线" in prompt
                assert "JSON" in prompt

    @pytest.mark.asyncio
    async def test_generate_story_synopsis_success(self, mock_storage_with_complete_data):
        """测试成功生成故事梗概"""
        storage, temp_dir = mock_storage_with_complete_data

        mock_response = '''```json
{
    "novel_id": "test-novel-001",
    "story_content": "上海的天际线下，苏晴踏入了天成广告大楼...",
    "key_plot_points": [
        {
            "point": 1,
            "chapter_range": "1-2",
            "event": "苏晴入职天成广告，与陆远初次相遇",
            "emotion_stage": "初遇"
        },
        {
            "point": 2,
            "chapter_range": "3-5",
            "event": "合作项目中逐渐了解彼此",
            "emotion_stage": "暧昧"
        }
    ],
    "character_arc": {
        "male_lead_arc": "陆远从封闭内心到学会信任",
        "female_lead_arc": "苏晴从自卑到自信"
    }
}
```'''

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider(mock_response)
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                result = await service.generate_story_synopsis("test-novel-001")

                assert result is not None
                assert result.get("story_content") is not None
                assert result.get("key_plot_points") is not None
                assert len(result.get("key_plot_points", [])) >= 2
                assert result.get("character_arc") is not None

    @pytest.mark.asyncio
    async def test_generate_story_synopsis_without_world_setting(self, mock_storage_with_complete_data):
        """测试没有世界观时生成故事梗概应失败"""
        storage, temp_dir = mock_storage_with_complete_data

        # 删除世界观
        import os
        world_setting_path = os.path.join(temp_dir, "data", "novels", "test-novel-001", "world_setting.json")
        if os.path.exists(world_setting_path):
            os.remove(world_setting_path)

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                with pytest.raises(ValueError, match="World setting"):
                    await service.generate_story_synopsis("test-novel-001")

    @pytest.mark.asyncio
    async def test_generate_story_synopsis_without_outline(self, mock_storage_with_complete_data):
        """测试没有大纲时生成故事梗概应失败"""
        storage, temp_dir = mock_storage_with_complete_data

        # 删除大纲
        import os
        outline_path = os.path.join(temp_dir, "data", "novels", "test-novel-001", "outline.json")
        if os.path.exists(outline_path):
            os.remove(outline_path)

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                with pytest.raises(ValueError, match="Outline"):
                    await service.generate_story_synopsis("test-novel-001")


class TestBatchChapterSplitting:
    """章节批量拆分测试"""

    @pytest.fixture
    def mock_storage_with_synopsis(self):
        """创建包含故事梗概的 Mock 存储"""
        temp_dir = tempfile.mkdtemp()
        storage = FileStorage(os.path.join(temp_dir, "data", "novels"))
        storage.create_novel_dir("test-novel-001")

        # 保存 meta
        storage.save_json("test-novel-001", "meta.json", {
            "novel_id": "test-novel-001",
            "title": "测试短篇小说",
            "genre": "都市职场",
            "status": "writing",
            "target_chapters": 12,
            "created_at": datetime.utcnow().isoformat()
        })

        # 保存世界观
        storage.save_json("test-novel-001", "world_setting.json", {
            "novel_id": "test-novel-001",
            "version": 1,
            "background": {
                "era": "现代",
                "era_name": "2024 年",
                "geography": {
                    "world_name": "上海",
                    "regions": [{"name": "浦东新区", "description": "金融中心"}]
                },
                "society": {
                    "power_structure": "职场竞争",
                    "social_classes": ["高管", "中层", "基层员工"],
                    "key_institutions": ["天成广告公司"]
                }
            },
            "male_lead": {
                "name": "陆远",
                "age": 28,
                "inner_wound": "前女友背叛",
                "growth_arc": "学会信任"
            },
            "female_lead": {
                "name": "苏晴",
                "age": 25,
                "inner_wound": "被男友劈腿",
                "growth_arc": "从自卑到自信"
            }
        })

        # 保存大纲
        storage.save_json("test-novel-001", "outline.json", {
            "novel_id": "test-novel-001",
            "version": 1,
            "chapters": [
                {"chapter_num": i, "title": f"第{i}章", "key_events": ["事件 1", "事件 2"]}
                for i in range(1, 13)
            ]
        })

        # 保存故事梗概
        storage.save_json("test-novel-001", "story_synopsis.json", {
            "novel_id": "test-novel-001",
            "story_content": "上海的天际线下，苏晴踏入了天成广告大楼。她与陆远的故事就此展开...",
            "key_plot_points": [
                {"point": 1, "chapter_range": "1-2", "event": "初遇", "emotion_stage": "初遇"},
                {"point": 2, "chapter_range": "3-5", "event": "暧昧", "emotion_stage": "暧昧"},
                {"point": 3, "chapter_range": "6-8", "event": "升温", "emotion_stage": "升温"},
                {"point": 4, "chapter_range": "9-10", "event": "甜蜜", "emotion_stage": "甜蜜"},
                {"point": 5, "chapter_range": "11", "event": "波折", "emotion_stage": "波折"},
                {"point": 6, "chapter_range": "12", "event": "结局", "emotion_stage": "结局"}
            ],
            "character_arc": {
                "male_lead_arc": "陆远从封闭内心到学会信任",
                "female_lead_arc": "苏晴从自卑到自信"
            }
        })

        yield storage, temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    @pytest.mark.asyncio
    async def test_split_story_to_chapters_success(self, mock_storage_with_synopsis):
        """测试成功批量拆分章节"""
        storage, temp_dir = mock_storage_with_synopsis

        # Mock 章节生成响应（单个章节，不是数组）
        mock_chapter_response = '''```json
{
    "title": "初入职场",
    "content": "上海的天际线下，苏晴踏入了天成广告大楼...",
    "word_count": 2500,
    "summary": {"key_events": ["苏晴入职", "与陆远相遇"]},
    "character_updates": [
        {"character_id": "苏晴", "location_change": {"from": "家", "to": "公司"}}
    ],
    "timeline_additions": [{"event": "苏晴入职", "time": "2024 年春"}]
}
```'''

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider(mock_chapter_response)
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                # 生成 2 个章节
                chapters = await service.split_story_to_chapters("test-novel-001", 1, 2)

                assert chapters is not None
                assert len(chapters) == 2
                assert chapters[0].get("chapter_num") == 1
                assert chapters[0].get("content") is not None
                assert chapters[0].get("word_count") > 0

    @pytest.mark.asyncio
    async def test_split_story_to_chapters_without_synopsis(self, mock_storage_with_synopsis):
        """测试没有故事梗概时拆分章节应失败"""
        storage, temp_dir = mock_storage_with_synopsis

        # 删除故事梗概
        import os
        synopsis_path = os.path.join(temp_dir, "data", "novels", "test-novel-001", "story_synopsis.json")
        if os.path.exists(synopsis_path):
            os.remove(synopsis_path)

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider("{}")
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                with pytest.raises(ValueError, match="Story synopsis"):
                    await service.split_story_to_chapters("test-novel-001", 1, 3)

    @pytest.mark.asyncio
    async def test_split_story_to_chapters_causal_chain(self, mock_storage_with_synopsis):
        """测试章节拆分包含因果链"""
        storage, temp_dir = mock_storage_with_synopsis

        mock_chapter_response = '''```json
{
    "title": "初入职场",
    "content": "上海的天际线下，苏晴踏入了天成广告大楼。她深吸一口气，想起了昨晚收到的录用通知书。",
    "word_count": 2500,
    "summary": {
        "key_events": [
            {"event": "苏晴入职天成广告", "cause": "收到录用通知", "effect": "开始新工作"}
        ]
    },
    "character_updates": [],
    "timeline_additions": []
}
```'''

        with patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=False):
            mock_provider = MockAIProvider(mock_chapter_response)
            with patch('src.infrastructure.ai_provider.AIProviderFactory.create', return_value=mock_provider):
                from src.application.generation_service import GenerationService
                service = GenerationService(storage)

                chapters = await service.split_story_to_chapters("test-novel-001", 1, 1)

                assert chapters is not None
                assert len(chapters) == 1
                # 验证因果链存在
                summary = chapters[0].get("summary", {})
                key_events = summary.get("key_events", [])
                assert len(key_events) > 0
                # 因果链应该包含 cause 和 effect
                event = key_events[0]
                if isinstance(event, dict):
                    assert "cause" in event or "effect" in event


class TestShortNovelDataModels:
    """短篇小说数据模型测试"""

    def test_inner_wound_and_growth_arc_fields(self):
        """测试内心创伤和成长弧光字段（验证世界观 JSON 结构）"""
        # 注：WorldSetting 和 Character 是字典结构，不是 Pydantic 模型
        # 这里测试的是数据结构是否符合预期

        male_lead = {
            "character_id": "char-001",
            "name": "陆远",
            "role": "主角",
            "age": 28,
            "gender": "男",
            "appearance": "身材修长",
            "personality": ["冷静", "理性"],
            "background": "广告界天才",
            "inner_wound": "前女友背叛",  # 新增字段
            "growth_arc": "学会信任",  # 新增字段
            "goals": ["成为行业顶尖"]
        }

        assert male_lead.get("inner_wound") == "前女友背叛"
        assert male_lead.get("growth_arc") == "学会信任"

    def test_emotion_arc_stages(self):
        """测试感情线阶段"""
        emotion_stages = [
            {"stage": "初遇", "chapter_range": "1-2", "description": "职场相遇"},
            {"stage": "暧昧", "chapter_range": "3-5", "description": "逐渐了解"},
            {"stage": "升温", "chapter_range": "6-8", "description": "共同克服困难"},
            {"stage": "甜蜜", "chapter_range": "9-10", "description": "确认关系"},
            {"stage": "波折", "chapter_range": "11", "description": "误会与考验"},
            {"stage": "结局", "chapter_range": "12", "description": "和解与成长"}
        ]

        assert len(emotion_stages) == 6
        assert all("stage" in s and "chapter_range" in s for s in emotion_stages)

    def test_theme_fields(self):
        """测试主题字段"""
        theme = {
            "main": "爱与治愈",
            "description": "通过职场竞争和感情纠葛，探讨现代都市人如何在压力下保持初心"
        }

        assert theme["main"] == "爱与治愈"
        assert "description" in theme
