#!/usr/bin/env python3
"""
导出数据工具 - 将文件系统存储的 JSON 数据导出为标准格式

用于迁移到 MySQL 数据库前的数据备份
"""
import json
import asyncio
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

# 数据目录
DATA_DIR = Path(__file__).parent.parent / "data" / "novels"


def load_json_file(file_path: Path) -> Dict[str, Any] | None:
    """加载 JSON 文件"""
    if not file_path.exists():
        return None
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def export_novel(novel_dir: Path) -> Dict[str, Any] | None:
    """导出单本小说的所有数据"""
    novel_id = novel_dir.name

    # 1. 元信息
    meta = load_json_file(novel_dir / "meta.json")
    if not meta:
        print(f"⚠️  跳过 {novel_id}: 缺少 meta.json")
        return None

    result = {
        "meta": meta,
        "world_setting": None,
        "outline": None,
        "story_synopsis": None,
        "characters": [],
        "chapters": [],
        "state": {
            "timeline": None,
            "character_states": None,
            "foreshadowing": None
        }
    }

    # 2. 世界观设定
    world_setting = load_json_file(novel_dir / "world_setting.json")
    if world_setting:
        result["world_setting"] = world_setting

    # 3. 大纲
    outline = load_json_file(novel_dir / "outline.json")
    if outline:
        result["outline"] = outline

    # 4. 故事梗概
    story_synopsis = load_json_file(novel_dir / "story_synopsis.json")
    if story_synopsis:
        result["story_synopsis"] = story_synopsis

    # 5. 人物库
    characters_file = novel_dir / "characters.json"
    if characters_file.exists():
        with open(characters_file, "r", encoding="utf-8") as f:
            chars_data = json.load(f)
            result["characters"] = chars_data.get("characters", [])

    # 6. 章节
    chapters_dir = novel_dir / "chapters"
    if chapters_dir.exists():
        for chapter_file in sorted(chapters_dir.glob("chapter_*.json")):
            chapter = load_json_file(chapter_file)
            if chapter:
                result["chapters"].append(chapter)

    # 7. 状态追踪
    state_dir = novel_dir / "state"
    if state_dir.exists():
        for state_file in ["timeline.json", "character_states.json", "foreshadowing.json"]:
            state = load_json_file(state_dir / state_file)
            if state:
                key = state_file.replace(".json", "")
                result["state"][key] = state

    return result


def export_all_novels() -> List[Dict[str, Any]]:
    """导出所有小说数据"""
    if not DATA_DIR.exists():
        print(f"❌ 数据目录不存在：{DATA_DIR}")
        return []

    novels = []
    for novel_dir in sorted(DATA_DIR.iterdir()):
        if novel_dir.is_dir() and novel_dir.name.startswith("novel-"):
            print(f"📖 导出：{novel_dir.name}")
            novel_data = export_novel(novel_dir)
            if novel_data:
                novels.append(novel_data)

    return novels


def save_export_data(data: List[Dict[str, Any]], output_file: str = "exported_data.json"):
    """保存导出数据"""
    output_path = Path(output_file)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ 已保存到：{output_path}")


def main():
    """主函数"""
    print("🔍 开始导出数据...")
    start_time = datetime.now()

    # 导出所有数据
    novels = export_all_novels()

    if not novels:
        print("⚠️  没有可导出的数据")
        return

    # 保存数据
    output_file = DATA_DIR.parent / "exported_data.json"
    save_export_data(novels, str(output_file))

    # 统计信息
    elapsed = (datetime.now() - start_time).total_seconds()
    print(f"\n📊 导出统计:")
    print(f"   小说数量：{len(novels)}")
    print(f"   耗时：{elapsed:.2f}秒")

    # 详细统计
    total_chapters = sum(len(n["chapters"]) for n in novels)
    total_characters = sum(len(n["characters"]) for n in novels)
    has_world_setting = sum(1 for n in novels if n["world_setting"])
    has_outline = sum(1 for n in novels if n["outline"])
    has_synopsis = sum(1 for n in novels if n["story_synopsis"])

    print(f"   世界观设定：{has_world_setting}/{len(novels)}")
    print(f"   大纲：{has_outline}/{len(novels)}")
    print(f"   故事梗概：{has_synopsis}/{len(novels)}")
    print(f"   章节总数：{total_chapters}")
    print(f"   人物总数：{total_characters}")


if __name__ == "__main__":
    main()
