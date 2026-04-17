"""
Repository 层单元测试
"""
import pytest
import asyncio
from datetime import datetime

# conftest.py 已添加 backend 到路径，直接从 infrastructure 导入
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.future import select

from infrastructure.database import Base
from infrastructure.database.models import Novel, WorldSetting, Outline, Chapter
from infrastructure.database.repositories import (
    NovelRepository, WorldSettingRepository, OutlineRepository,
    ChapterRepository
)


# 测试数据库 URL（使用 SQLite 内存数据库）
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def session():
    """创建测试会话"""
    # 创建引擎
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    # 创建表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 创建会话
    session_maker = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )

    async with session_maker() as session:
        yield session

    # 清理
    await engine.dispose()


@pytest.fixture
def novel_id():
    """测试用 Novel ID"""
    return "test-novel-001"


@pytest.fixture
async def novel(session, novel_id):
    """创建测试小说"""
    novel = Novel(
        novel_id=novel_id,
        title="测试小说",
        genre="都市言情",
        target_chapters=12,
        status="planning",
        current_phase="world_building"
    )
    session.add(novel)
    await session.commit()
    return novel


class TestNovelRepository:
    """NovelRepository 测试类"""

    async def test_create_novel(self, session, novel_id):
        """测试创建小说"""
        repo = NovelRepository(session)

        novel = Novel(
            novel_id=novel_id,
            title="新测试小说",
            genre="玄幻奇幻",
            target_chapters=20
        )

        result = await repo.create(novel)
        await session.commit()

        assert result.novel_id == novel_id
        assert result.title == "新测试小说"
        assert result.genre == "玄幻奇幻"

    async def test_get_novel(self, session, novel, novel_id):
        """测试获取小说"""
        repo = NovelRepository(session)

        result = await repo.get(novel_id)

        assert result is not None
        assert result.novel_id == novel_id
        assert result.title == "测试小说"

    async def test_get_novel_not_found(self, session):
        """测试获取不存在的小说"""
        repo = NovelRepository(session)

        result = await repo.get("non-existent-id")

        assert result is None

    async def test_list_novels(self, session, novel):
        """测试获取小说列表"""
        repo = NovelRepository(session)

        # 创建更多测试数据
        for i in range(5):
            await repo.create(Novel(
                novel_id=f"test-novel-{i:03d}",
                title=f"测试小说{i}",
                genre="都市言情"
            ))
        await session.commit()

        results = await repo.list(limit=10)

        assert len(results) == 6  # 包括 fixture 创建的 1 本

    async def test_update_novel(self, session, novel, novel_id):
        """测试更新小说"""
        repo = NovelRepository(session)

        novel.title = "更新后的标题"
        novel.status = "writing"

        result = await repo.update(novel)
        await session.commit()

        assert result.title == "更新后的标题"
        assert result.status == "writing"

    async def test_delete_novel(self, session, novel, novel_id):
        """测试删除小说"""
        repo = NovelRepository(session)

        result = await repo.delete(novel_id)
        await session.commit()

        assert result is True

        # 验证已删除
        deleted = await repo.get(novel_id)
        assert deleted is None

    async def test_count_novels(self, session, novel):
        """测试统计小说数量"""
        repo = NovelRepository(session)

        # 创建更多测试数据
        for i in range(5):
            await repo.create(Novel(
                novel_id=f"test-novel-{i:03d}",
                title=f"测试小说{i}"
            ))
        await session.commit()

        count = await repo.count()

        assert count == 6  # 包括 fixture 创建的 1 本


class TestWorldSettingRepository:
    """WorldSettingRepository 测试类"""

    async def test_create_world_setting(self, session, novel, novel_id):
        """测试创建世界观"""
        repo = WorldSettingRepository(session)

        ws = WorldSetting(
            novel_id=novel_id,
            version=1,
            background={"city": "上海", "workplace": "科技公司"},
            male_lead={"name": "陆远", "age": 30},
            female_lead={"name": "苏晴", "age": 24}
        )

        result = await repo.create(ws)
        await session.commit()

        assert result.novel_id == novel_id
        assert result.version == 1

    async def test_get_by_novel(self, session, novel, novel_id):
        """测试根据小说 ID 获取世界观"""
        repo = WorldSettingRepository(session)

        ws = WorldSetting(
            novel_id=novel_id,
            version=1,
            background={"city": "上海"}
        )
        await repo.create(ws)
        await session.commit()

        result = await repo.get_by_novel(novel_id)

        assert result is not None
        assert result.novel_id == novel_id
        assert result.background["city"] == "上海"

    async def test_get_by_novel_not_found(self, session, novel_id):
        """测试获取不存在的世界观"""
        repo = WorldSettingRepository(session)

        result = await repo.get_by_novel(novel_id)

        assert result is None

    async def test_update_world_setting(self, session, novel, novel_id):
        """测试更新世界观"""
        repo = WorldSettingRepository(session)

        ws = WorldSetting(
            novel_id=novel_id,
            version=1,
            background={"city": "上海"}
        )
        await repo.create(ws)
        await session.commit()

        ws.background = {"city": "北京"}
        ws.version = 2

        result = await repo.update(ws)
        await session.commit()

        assert result.background["city"] == "北京"
        assert result.version == 2

    async def test_delete_world_setting(self, session, novel, novel_id):
        """测试删除世界观"""
        repo = WorldSettingRepository(session)

        ws = WorldSetting(novel_id=novel_id, version=1)
        await repo.create(ws)
        await session.commit()

        result = await repo.delete(novel_id)
        await session.commit()

        assert result is True

        deleted = await repo.get_by_novel(novel_id)
        assert deleted is None


class TestOutlineRepository:
    """OutlineRepository 测试类"""

    async def test_create_outline(self, session, novel, novel_id):
        """测试创建大纲"""
        repo = OutlineRepository(session)

        ol = Outline(
            novel_id=novel_id,
            version=1,
            genre="都市言情",
            main_conflict={"type": "误会"}
        )

        result = await repo.create(ol)
        await session.commit()

        assert result.novel_id == novel_id
        assert result.genre == "都市言情"

    async def test_get_by_novel(self, session, novel, novel_id):
        """测试根据小说 ID 获取大纲"""
        repo = OutlineRepository(session)

        ol = Outline(novel_id=novel_id, version=1)
        await repo.create(ol)
        await session.commit()

        result = await repo.get_by_novel(novel_id)

        assert result is not None
        assert result.novel_id == novel_id

    async def test_update_outline(self, session, novel, novel_id):
        """测试更新大纲"""
        repo = OutlineRepository(session)

        ol = Outline(novel_id=novel_id, version=1)
        await repo.create(ol)
        await session.commit()

        ol.version = 2
        ol.genre = "玄幻奇幻"

        result = await repo.update(ol)
        await session.commit()

        assert result.version == 2
        assert result.genre == "玄幻奇幻"


class TestChapterRepository:
    """ChapterRepository 测试类"""

    async def test_create_chapter(self, session, novel, novel_id):
        """测试创建章节"""
        repo = ChapterRepository(session)

        chapter = Chapter(
            novel_id=novel_id,
            chapter_num=1,
            title="第一章：初遇",
            content="正文内容...",
            word_count=100
        )

        result = await repo.create(chapter)
        await session.commit()

        assert result.novel_id == novel_id
        assert result.chapter_num == 1
        assert result.word_count == 100

    async def test_get_chapter(self, session, novel, novel_id):
        """测试获取章节"""
        repo = ChapterRepository(session)

        chapter = Chapter(
            novel_id=novel_id,
            chapter_num=1,
            title="第一章"
        )
        await repo.create(chapter)
        await session.commit()

        result = await repo.get(novel_id, 1)

        assert result is not None
        assert result.chapter_num == 1
        assert result.title == "第一章"

    async def test_get_chapter_not_found(self, session, novel_id):
        """测试获取不存在的章节"""
        repo = ChapterRepository(session)

        result = await repo.get(novel_id, 999)

        assert result is None

    async def test_list_by_novel(self, session, novel, novel_id):
        """测试获取小说的所有章节"""
        repo = ChapterRepository(session)

        # 创建多个章节
        for i in range(1, 6):
            await repo.create(Chapter(
                novel_id=novel_id,
                chapter_num=i,
                title=f"第{i}章"
            ))
        await session.commit()

        results = await repo.list_by_novel(novel_id)

        assert len(results) == 5
        assert results[0].chapter_num == 1
        assert results[4].chapter_num == 5

    async def test_delete_chapter(self, session, novel, novel_id):
        """测试删除章节"""
        repo = ChapterRepository(session)

        chapter = Chapter(novel_id=novel_id, chapter_num=1)
        await repo.create(chapter)
        await session.commit()

        result = await repo.delete(novel_id, 1)
        await session.commit()

        assert result is True

        deleted = await repo.get(novel_id, 1)
        assert deleted is None


# 运行测试
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
