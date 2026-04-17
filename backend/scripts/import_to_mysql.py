#!/usr/bin/env python3
"""
导入数据工具 - 将导出的 JSON 数据导入到 MySQL 数据库

使用方式：
1. 先运行 export_json_data.py 导出数据
2. 确保 MySQL 数据库已初始化
3. 运行此脚本导入数据

python scripts/import_to_mysql.py
"""
import json
import asyncio
import uuid
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

# 需要项目路径在 sys.path 中
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.future import select
from infrastructure.database.models import (
    Novel, WorldSetting, Outline, OutlineVolume, OutlineChapter,
    Chapter, StorySynopsis, Character
)
from config.database import get_database_url


def load_export_data(export_file: str = "exported_data.json") -> List[Dict[str, Any]]:
    """加载导出的数据"""
    export_path = Path(export_file)
    if not export_path.exists():
        print(f"❌ 导出文件不存在：{export_path}")
        return []

    with open(export_path, "r", encoding="utf-8") as f:
        return json.load(f)


async def import_novel(session: AsyncSession, novel_data: Dict[str, Any]) -> bool:
    """导入单本小说数据"""
    meta = novel_data.get("meta", {})
    novel_id = meta.get("novel_id")

    if not novel_id:
        print(f"⚠️  跳过：缺少 novel_id")
        return False

    print(f"📖 导入：{novel_id} - {meta.get('title', 'Unknown')}")

    try:
        # 1. 导入小说元信息
        novel = Novel(
            novel_id=novel_id,
            title=meta.get("title", ""),
            genre=meta.get("genre", "都市职场"),
            theme=meta.get("theme", []),
            target_chapters=meta.get("target_chapters", 12),
            status=meta.get("status", "planning"),
            current_phase=meta.get("current_phase", "world_building"),
            completed_chapters=meta.get("completed_chapters", 0),
            word_count=meta.get("word_count", 0)
        )
        session.add(novel)

        # 2. 导入世界观设定
        world_setting = novel_data.get("world_setting")
        if world_setting:
            ws = WorldSetting(
                novel_id=novel_id,
                version=world_setting.get("version", 1),
                background=world_setting.get("background", {}),
                male_lead=world_setting.get("male_lead", {}),
                female_lead=world_setting.get("female_lead", {}),
                emotion_arc=world_setting.get("emotion_arc", {}),
                theme=world_setting.get("theme", {}),
                main_conflict=world_setting.get("main_conflict", {}),
                supporting_chars=world_setting.get("supporting_chars", []),
                power_system=world_setting.get("power_system", {}),
                special_elements=world_setting.get("special_elements", [])
            )
            session.add(ws)

        # 3. 导入大纲
        outline = novel_data.get("outline")
        if outline:
            ol = Outline(
                novel_id=novel_id,
                version=outline.get("version", 1),
                genre=outline.get("genre"),
                main_conflict=outline.get("main_conflict", {}),
                character_growth_curve=outline.get("character_growth_curve", []),
                foreshadowing_plan=outline.get("foreshadowing_plan", [])
            )
            session.add(ol)
            await session.flush()  # 获取 outline ID

            # 3.1 导入大纲卷
            volumes = outline.get("volumes", [])
            for vol in volumes:
                vol_id = vol.get("volume_id") or str(uuid.uuid4())
                ov = OutlineVolume(
                    novel_id=novel_id,
                    outline_id=ol.id,
                    volume_id=vol_id,
                    name=vol.get("name", ""),
                    chapters_range_start=vol.get("chapters_range", {}).get("start"),
                    chapters_range_end=vol.get("chapters_range", {}).get("end"),
                    theme=vol.get("theme", ""),
                    arc_summary=vol.get("arc_summary", ""),
                    sort_order=vol.get("sort_order", 0)
                )
                session.add(ov)

            # 3.2 导入大纲章节
            chapters = outline.get("chapters", [])
            for ch in chapters:
                oc = OutlineChapter(
                    novel_id=novel_id,
                    outline_id=ol.id,
                    chapter_num=ch.get("chapter_num", 0),
                    title=ch.get("title", ""),
                    volume_id=ch.get("volume_id"),
                    key_events=ch.get("key_events", []),
                    turning_points=ch.get("turning_points", []),
                    character_growth=ch.get("character_growth", []),
                    foreshadowing=ch.get("foreshadowing", []),
                    emotion_stage=ch.get("emotion_stage"),
                    emotion_progress=ch.get("emotion_progress", {}),
                    sort_order=ch.get("sort_order", 0)
                )
                session.add(oc)

        # 4. 导入故事梗概
        story_synopsis = novel_data.get("story_synopsis")
        if story_synopsis:
            ss = StorySynopsis(
                novel_id=novel_id,
                story_content=story_synopsis.get("story_content", ""),
                key_plot_points=story_synopsis.get("key_plot_points", []),
                character_arc=story_synopsis.get("character_arc", {})
            )
            session.add(ss)

        # 5. 导入人物库
        characters = novel_data.get("characters", [])
        for char in characters:
            char_id = char.get("character_id") or str(uuid.uuid4())
            c = Character(
                novel_id=novel_id,
                character_id=char_id,
                name=char.get("name", ""),
                role=char.get("role", ""),
                character_type=char.get("character_type"),
                age=char.get("age"),
                gender=char.get("gender"),
                appearance=char.get("appearance", ""),
                personality=char.get("personality", []),
                background=char.get("background", ""),
                inner_wound=char.get("inner_wound", ""),
                growth_arc=char.get("growth_arc", ""),
                abilities=char.get("abilities", {}),
                goals=char.get("goals", []),
                emotional_arc=char.get("emotional_arc", {}),
                relationships=char.get("relationships", []),
                current_state=char.get("current_state", {})
            )
            session.add(c)

        # 6. 导入章节正文
        chapters = novel_data.get("chapters", [])
        for ch in chapters:
            c = Chapter(
                novel_id=novel_id,
                chapter_num=ch.get("chapter_num", 0),
                title=ch.get("title", ""),
                version=ch.get("version", 1),
                content=ch.get("content", ""),
                word_count=ch.get("word_count", 0),
                summary=ch.get("summary", {}),
                character_updates=ch.get("character_updates", []),
                foreshadowing_updates=ch.get("foreshadowing_updates", []),
                timeline_additions=ch.get("timeline_additions", []),
                validation_status=ch.get("validation_status", {})
            )
            session.add(c)

        return True

    except Exception as e:
        print(f"❌ 导入失败 {novel_id}: {e}")
        await session.rollback()
        return False


async def import_all_data(data: List[Dict[str, Any]]):
    """导入所有数据"""
    # 创建数据库引擎和会话
    engine = create_async_engine(
        get_database_url(),
        echo=False,
        pool_pre_ping=True
    )

    session_maker = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )

    success_count = 0
    fail_count = 0

    async with session_maker() as session:
        for novel_data in data:
            try:
                success = await import_novel(session, novel_data)
                if success:
                    success_count += 1
                else:
                    fail_count += 1
            except Exception as e:
                print(f"❌ 导入错误：{e}")
                fail_count += 1
                await session.rollback()

        # 统一提交
        if success_count > 0:
            try:
                await session.commit()
                print(f"\n✅ 提交成功")
            except Exception as e:
                print(f"❌ 提交失败：{e}")
                await session.rollback()

    await engine.dispose()

    return success_count, fail_count


def main():
    """主函数"""
    print("🔍 开始导入数据到 MySQL...")
    start_time = datetime.now()

    # 1. 加载导出数据
    export_file = Path(__file__).parent.parent / "data" / "exported_data.json"
    data = load_export_data(str(export_file))

    if not data:
        print("⚠️  没有可导入的数据")
        print("提示：请先运行 export_json_data.py 导出数据")
        return

    print(f"📦 待导入小说：{len(data)} 本")

    # 2. 导入数据
    success_count, fail_count = asyncio.run(import_all_data(data))

    # 3. 统计信息
    elapsed = (datetime.now() - start_time).total_seconds()
    print(f"\n📊 导入统计:")
    print(f"   成功：{success_count} 本")
    print(f"   失败：{fail_count} 本")
    print(f"   耗时：{elapsed:.2f}秒")

    if fail_count > 0:
        print(f"\n⚠️  有 {fail_count} 本小说导入失败，请检查错误信息")


if __name__ == "__main__":
    main()
