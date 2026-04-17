"""
Repository 层 - 数据访问层

提供对数据库的 CRUD 操作，封装 SQLAlchemy 细节
"""
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from infrastructure.database.models import Novel, WorldSetting, Outline, OutlineVolume, OutlineChapter, Chapter, StorySynopsis, Character


class NovelRepository:
    """小说 Repository"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, novel_id: str) -> Optional[Novel]:
        """根据 ID 获取小说"""
        result = await self.session.execute(
            select(Novel).where(Novel.novel_id == novel_id)
        )
        return result.scalar_one_or_none()

    async def list(self, limit: int = 100, offset: int = 0) -> List[Novel]:
        """获取小说列表"""
        result = await self.session.execute(
            select(Novel).order_by(Novel.created_at.desc()).limit(limit).offset(offset)
        )
        return list(result.scalars().all())

    async def create(self, novel: Novel) -> Novel:
        """创建小说"""
        self.session.add(novel)
        await self.session.flush()  # 获取生成的 ID
        return novel

    async def update(self, novel: Novel) -> Novel:
        """更新小说"""
        await self.session.merge(novel)
        return novel

    async def delete(self, novel_id: str) -> bool:
        """删除小说"""
        await self.session.execute(delete(Novel).where(Novel.novel_id == novel_id))
        return True

    async def count(self) -> int:
        """获取小说总数"""
        from sqlalchemy import func
        result = await self.session.execute(select(func.count()).select_from(Novel))
        return result.scalar() or 0


class WorldSettingRepository:
    """世界观设定 Repository"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_novel(self, novel_id: str) -> Optional[WorldSetting]:
        """根据小说 ID 获取世界观"""
        result = await self.session.execute(
            select(WorldSetting).where(WorldSetting.novel_id == novel_id)
        )
        return result.scalar_one_or_none()

    async def create(self, setting: WorldSetting) -> WorldSetting:
        """创建世界观"""
        self.session.add(setting)
        await self.session.flush()
        return setting

    async def update(self, setting: WorldSetting) -> WorldSetting:
        """更新世界观"""
        await self.session.merge(setting)
        return setting

    async def delete(self, novel_id: str) -> bool:
        """删除世界观"""
        await self.session.execute(delete(WorldSetting).where(WorldSetting.novel_id == novel_id))
        return True


class OutlineRepository:
    """大纲 Repository"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_novel(self, novel_id: str) -> Optional[Outline]:
        """根据小说 ID 获取大纲"""
        result = await self.session.execute(
            select(Outline).where(Outline.novel_id == novel_id)
        )
        return result.scalar_one_or_none()

    async def create(self, outline: Outline) -> Outline:
        """创建大纲"""
        self.session.add(outline)
        await self.session.flush()
        return outline

    async def update(self, outline: Outline) -> Outline:
        """更新大纲"""
        await self.session.merge(outline)
        return outline

    async def delete(self, novel_id: str) -> bool:
        """删除大纲"""
        await self.session.execute(delete(Outline).where(Outline.novel_id == novel_id))
        return True


class OutlineVolumeRepository:
    """大纲卷 Repository"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_outline(self, outline_id: int) -> List[OutlineVolume]:
        """根据大纲 ID 获取所有卷"""
        result = await self.session.execute(
            select(OutlineVolume)
            .where(OutlineVolume.outline_id == outline_id)
            .order_by(OutlineVolume.sort_order)
        )
        return list(result.scalars().all())

    async def create(self, volume: OutlineVolume) -> OutlineVolume:
        """创建大纲卷"""
        self.session.add(volume)
        await self.session.flush()
        return volume

    async def update(self, volume: OutlineVolume) -> OutlineVolume:
        """更新大纲卷"""
        await self.session.merge(volume)
        return volume

    async def delete_by_outline(self, outline_id: int) -> bool:
        """根据大纲 ID 删除所有卷"""
        await self.session.execute(delete(OutlineVolume).where(OutlineVolume.outline_id == outline_id))
        return True


class OutlineChapterRepository:
    """大纲章节 Repository"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_outline(self, outline_id: int) -> List[OutlineChapter]:
        """根据大纲 ID 获取所有章节"""
        result = await self.session.execute(
            select(OutlineChapter)
            .where(OutlineChapter.outline_id == outline_id)
            .order_by(OutlineChapter.chapter_num)
        )
        return list(result.scalars().all())

    async def create(self, chapter: OutlineChapter) -> OutlineChapter:
        """创建大纲章节"""
        self.session.add(chapter)
        await self.session.flush()
        return chapter

    async def update(self, chapter: OutlineChapter) -> OutlineChapter:
        """更新大纲章节"""
        await self.session.merge(chapter)
        return chapter

    async def delete_by_outline(self, outline_id: int) -> bool:
        """根据大纲 ID 删除所有章节"""
        await self.session.execute(delete(OutlineChapter).where(OutlineChapter.outline_id == outline_id))
        return True


class ChapterRepository:
    """章节 Repository"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, novel_id: str, chapter_num: int) -> Optional[Chapter]:
        """获取章节"""
        result = await self.session.execute(
            select(Chapter).where(
                Chapter.novel_id == novel_id,
                Chapter.chapter_num == chapter_num
            )
        )
        return result.scalar_one_or_none()

    async def list_by_novel(self, novel_id: str) -> List[Chapter]:
        """获取小说的所有章节"""
        result = await self.session.execute(
            select(Chapter)
            .where(Chapter.novel_id == novel_id)
            .order_by(Chapter.chapter_num)
        )
        return list(result.scalars().all())

    async def create(self, chapter: Chapter) -> Chapter:
        """创建章节"""
        self.session.add(chapter)
        await self.session.flush()
        return chapter

    async def update(self, chapter: Chapter) -> Chapter:
        """更新章节"""
        await self.session.merge(chapter)
        return chapter

    async def delete(self, novel_id: str, chapter_num: int) -> bool:
        """删除章节"""
        await self.session.execute(
            delete(Chapter).where(
                Chapter.novel_id == novel_id,
                Chapter.chapter_num == chapter_num
            )
        )
        return True

    async def delete_by_novel(self, novel_id: str) -> bool:
        """删除小说的所有章节"""
        await self.session.execute(delete(Chapter).where(Chapter.novel_id == novel_id))
        return True


class StorySynopsisRepository:
    """故事梗概 Repository"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_novel(self, novel_id: str) -> Optional[StorySynopsis]:
        """根据小说 ID 获取故事梗概"""
        result = await self.session.execute(
            select(StorySynopsis).where(StorySynopsis.novel_id == novel_id)
        )
        return result.scalar_one_or_none()

    async def create(self, synopsis: StorySynopsis) -> StorySynopsis:
        """创建故事梗概"""
        self.session.add(synopsis)
        await self.session.flush()
        return synopsis

    async def update(self, synopsis: StorySynopsis) -> StorySynopsis:
        """更新故事梗概"""
        await self.session.merge(synopsis)
        return synopsis

    async def delete(self, novel_id: str) -> bool:
        """删除故事梗概"""
        await self.session.execute(delete(StorySynopsis).where(StorySynopsis.novel_id == novel_id))
        return True


class CharacterRepository:
    """人物 Repository"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_novel(self, novel_id: str) -> List[Character]:
        """获取小说的所有人物"""
        result = await self.session.execute(
            select(Character)
            .where(Character.novel_id == novel_id)
            .order_by(Character.character_id)
        )
        return list(result.scalars().all())

    async def get(self, character_id: str) -> Optional[Character]:
        """根据人物 ID 获取人物"""
        result = await self.session.execute(
            select(Character).where(Character.character_id == character_id)
        )
        return result.scalar_one_or_none()

    async def create(self, character: Character) -> Character:
        """创建人物"""
        self.session.add(character)
        await self.session.flush()
        return character

    async def update(self, character: Character) -> Character:
        """更新人物"""
        await self.session.merge(character)
        return character

    async def delete(self, character_id: str) -> bool:
        """删除人物"""
        await self.session.execute(delete(Character).where(Character.character_id == character_id))
        return True

    async def delete_by_novel(self, novel_id: str) -> bool:
        """删除小说的所有人物"""
        await self.session.execute(delete(Character).where(Character.novel_id == novel_id))
        return True
