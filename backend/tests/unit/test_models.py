"""数据模型单元测试"""
import pytest
from datetime import datetime

from src.domain.models.novel import NovelMeta, Novel, NovelStatus, NovelPhase
from src.domain.models.world_setting import (
    WorldSetting, Background, Geography, Region,
    Society, PowerSystem, PowerLevel, CoreConflict, Conflict
)
from src.domain.models.character import (
    Character, Abilities, CharacterRole, Relationship, RelationshipType
)
from src.domain.models.chapter import Chapter, ChapterSummary
from src.domain.models.outline import Outline, Volume, ChaptersRange, ChapterOutline


class TestNovelMeta:
    """小说元信息模型测试"""

    def test_create_novel_meta(self):
        """测试创建小说元信息"""
        meta = NovelMeta(
            novel_id="novel-001",
            title="剑破苍穹",
            genre="武侠修仙"
        )

        assert meta.novel_id == "novel-001"
        assert meta.title == "剑破苍穹"
        assert meta.genre == "武侠修仙"
        assert meta.status == NovelStatus.PLANNING
        assert meta.current_phase == NovelPhase.WORLD_BUILDING
        assert meta.target_chapters == 200
        assert meta.completed_chapters == 0
        assert meta.word_count == 0

    def test_novel_meta_defaults(self):
        """测试默认值"""
        meta = NovelMeta(novel_id="novel-002", title="测试小说")

        assert meta.genre == "都市职场"
        assert meta.theme == []
        assert meta.status == NovelStatus.PLANNING

    def test_novel_meta_validation(self):
        """测试数据验证"""
        # target_chapters 必须大于等于 1
        with pytest.raises(ValueError):
            NovelMeta(novel_id="novel-003", title="测试", target_chapters=0)

        # completed_chapters 不能为负
        with pytest.raises(ValueError):
            NovelMeta(novel_id="novel-004", title="测试", completed_chapters=-1)


class TestNovel:
    """小说完整数据模型测试"""

    def test_create_novel(self):
        """测试创建小说"""
        meta = NovelMeta(novel_id="novel-001", title="剑破苍穹")
        novel = Novel(meta=meta)

        assert novel.meta.novel_id == "novel-001"
        assert novel.world_setting is None
        assert novel.characters is None
        assert novel.outline is None

    def test_is_ready_for_chapter_writing(self):
        """测试是否准备好写章节"""
        meta = NovelMeta(
            novel_id="novel-001",
            title="剑破苍穹",
            current_phase=NovelPhase.CHAPTER_WRITING
        )
        novel = Novel(
            meta=meta,
            world_setting={"test": "data"},
            characters={"test": "data"},
            outline={"test": "data"}
        )

        assert novel.is_ready_for_chapter_writing() is True

        # 缺少世界观时不可以
        novel.world_setting = None
        assert novel.is_ready_for_chapter_writing() is False


class TestWorldSetting:
    """世界观模型测试"""

    def test_create_world_setting(self):
        """测试创建世界观"""
        setting = WorldSetting(
            novel_id="novel-001",
            version=1,
            background=Background(
                era="古代架空",
                era_name="大周王朝",
                geography=Geography(
                    world_name="九州大陆",
                    regions=[Region(name="中原", description="繁华富庶")]
                ),
                society=Society(
                    power_structure="皇权统治",
                    social_classes=["贵族", "平民"],
                    key_institutions=["朝廷"]
                )
            ),
            power_system=PowerSystem(
                name="灵气修炼体系",
                levels=[PowerLevel(name="筑基", rank=1, description="初入修炼")],
                key_rules=["灵气需从天地汲取"]
            ),
            core_conflict=CoreConflict(
                main_conflict=Conflict(
                    type="复仇",
                    description="主角家族被灭",
                    antagonist="神秘宗门"
                ),
                sub_conflicts=[]
            )
        )

        assert setting.novel_id == "novel-001"
        assert setting.version == 1
        assert setting.background.era == "古代架空"
        assert setting.power_system.name == "灵气修炼体系"


class TestCharacter:
    """人物模型测试"""

    def test_create_character(self):
        """测试创建人物"""
        character = Character(
            character_id="char-001",
            name="林剑锋",
            role=CharacterRole.PROTAGONIST,
            age=18,
            gender="男",
            appearance="身材修长，剑眉星目",
            personality=["坚韧", "冷静"],
            background="世家子弟",
            abilities=Abilities(
                cultivation_level="筑基初期",
                skills=["剑法", "轻功"],
                special_ability="天剑传承"
            ),
            goals=["复仇", "成为强者"],
            relationships=[
                Relationship(
                    target_id="char-002",
                    type=RelationshipType.LOVE,
                    status="深厚"
                )
            ]
        )

        assert character.character_id == "char-001"
        assert character.name == "林剑锋"
        assert character.role == CharacterRole.PROTAGONIST
        assert character.age == 18
        assert character.abilities.cultivation_level == "筑基初期"


class TestChapter:
    """章节模型测试"""

    def test_create_chapter(self):
        """测试创建章节"""
        chapter = Chapter(
            novel_id="novel-001",
            chapter_num=1,
            title="灭门之夜",
            version=1,
            content="夜色如墨...",
            word_count=3500,
            summary=ChapterSummary(
                key_events=["事件1", "事件2"],
                emotional_tone="悲壮"
            )
        )

        assert chapter.novel_id == "novel-001"
        assert chapter.chapter_num == 1
        assert chapter.title == "灭门之夜"
        assert chapter.word_count == 3500

    def test_calculate_word_count(self):
        """测试计算字数"""
        chapter = Chapter(
            novel_id="novel-001",
            chapter_num=1,
            title="测试",
            content="这是测试内容"
        )

        count = chapter.calculate_word_count()
        assert count == 6  # "这是测试内容"


class TestOutline:
    """大纲模型测试"""

    def test_create_outline(self):
        """测试创建大纲"""
        outline = Outline(
            novel_id="novel-001",
            version=1,
            volumes=[
                Volume(
                    volume_id="vol-001",
                    name="第一卷：少年崛起",
                    chapters_range=ChaptersRange(start=1, end=50),
                    theme="成长与复仇之路开始",
                    arc_summary="主角从家族灭门中幸存"
                )
            ],
            chapters=[
                ChapterOutline(
                    chapter_num=1,
                    title="灭门之夜",
                    volume_id="vol-001",
                    key_events=["家族灭门", "主角逃脱"]
                )
            ]
        )

        assert outline.novel_id == "novel-001"
        assert len(outline.volumes) == 1
        assert outline.volumes[0].name == "第一卷：少年崛起"

    def test_get_chapter_outline(self):
        """测试获取章节大纲"""
        outline = Outline(
            novel_id="novel-001",
            chapters=[
                ChapterOutline(chapter_num=1, title="第一章", volume_id="vol-001"),
                ChapterOutline(chapter_num=2, title="第二章", volume_id="vol-001")
            ]
        )

        ch1 = outline.get_current_chapter_outline(1)
        assert ch1 is not None
        assert ch1.title == "第一章"

        ch3 = outline.get_current_chapter_outline(3)
        assert ch3 is None