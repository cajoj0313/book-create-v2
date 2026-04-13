"""小说管理 API"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

router = APIRouter()


class CreateNovelRequest(BaseModel):
    """创建小说请求"""
    title: str
    genre: str = "都市职场"
    target_chapters: int = 200


class NovelResponse(BaseModel):
    """小说响应"""
    novel_id: str
    title: str
    genre: str
    status: str
    completed_chapters: int
    word_count: int


@router.post("/", response_model=dict)
async def create_novel(request: CreateNovelRequest):
    """创建新小说"""
    from ..infrastructure.storage import FileStorage
    import uuid
    from datetime import datetime

    novel_id = f"novel-{uuid.uuid4().hex[:8]}"
    storage = FileStorage("data/novels")
    storage.create_novel_dir(novel_id)

    meta = {
        "novel_id": novel_id,
        "title": request.title,
        "genre": request.genre,
        "theme": [],
        "target_chapters": request.target_chapters,
        "status": "planning",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "current_phase": "world_building",
        "completed_chapters": 0,
        "word_count": 0
    }

    storage.save_json(novel_id, "meta.json", meta)

    return {"success": True, "data": NovelResponse(
        novel_id=novel_id,
        title=request.title,
        genre=request.genre,
        status="planning",
        completed_chapters=0,
        word_count=0
    )}


@router.get("/", response_model=dict)
async def list_novels():
    """获取小说列表"""
    from ..infrastructure.storage import FileStorage

    storage = FileStorage("data/novels")
    novel_ids = storage.list_novels()

    novels = []
    for novel_id in novel_ids:
        meta = storage.load_json(novel_id, "meta.json")
        if meta:
            novels.append(NovelResponse(
                novel_id=meta["novel_id"],
                title=meta["title"],
                genre=meta["genre"],
                status=meta["status"],
                completed_chapters=meta["completed_chapters"],
                word_count=meta["word_count"]
            ))

    return {"success": True, "data": novels}


@router.get("/{novel_id}", response_model=dict)
async def get_novel(novel_id: str):
    """获取小说详情"""
    from ..infrastructure.storage import FileStorage

    storage = FileStorage("data/novels")
    meta = storage.load_json(novel_id, "meta.json")

    if not meta:
        raise HTTPException(status_code=404, detail="Novel not found")

    # 加载所有数据
    world_setting = storage.load_json(novel_id, "world_setting.json")
    characters = storage.load_json(novel_id, "characters.json")
    outline = storage.load_json(novel_id, "outline.json")

    return {
        "success": True,
        "data": {
            "meta": meta,
            "world_setting": world_setting,
            "characters": characters,
            "outline": outline
        }
    }


@router.delete("/{novel_id}")
async def delete_novel(novel_id: str):
    """删除小说"""
    from ..infrastructure.storage import FileStorage

    storage = FileStorage("data/novels")

    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    storage.delete_novel(novel_id)
    return {"success": True, "data": {"message": "Novel deleted", "novel_id": novel_id}}


# ==================== 小说元信息 ====================

@router.put("/{novel_id}")
async def update_novel(novel_id: str, data: dict):
    """更新小说元信息"""
    from ..infrastructure.storage import FileStorage
    from datetime import datetime

    storage = FileStorage("data/novels")
    meta = storage.load_json(novel_id, "meta.json")

    if not meta:
        raise HTTPException(status_code=404, detail="Novel not found")

    # 更新允许的字段
    updatable_fields = ["title", "genre", "theme", "target_chapters", "status"]
    for field in updatable_fields:
        if field in data:
            meta[field] = data[field]

    meta["updated_at"] = datetime.utcnow().isoformat()
    storage.save_json(novel_id, "meta.json", meta)

    return {"success": True, "data": meta}


# ==================== 世界观 ====================

@router.get("/{novel_id}/world-setting/")
async def get_world_setting(novel_id: str):
    """获取世界观设定"""
    from ..infrastructure.storage import FileStorage

    storage = FileStorage("data/novels")
    world_setting = storage.load_json(novel_id, "world_setting.json")

    if not world_setting:
        raise HTTPException(status_code=404, detail="World setting not found")

    return {"success": True, "data": world_setting}


@router.put("/{novel_id}/world-setting")
async def update_world_setting(novel_id: str, data: dict):
    """更新世界观设定"""
    from ..infrastructure.storage import FileStorage
    from datetime import datetime

    storage = FileStorage("data/novels")

    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    # 更新版本号
    existing = storage.load_json(novel_id, "world_setting.json")
    version = (existing.get("version", 0) if existing else 0) + 1
    data["version"] = version
    data["novel_id"] = novel_id

    storage.save_json(novel_id, "world_setting.json", data)

    # 更新 meta
    meta = storage.load_json(novel_id, "meta.json")
    meta["updated_at"] = datetime.utcnow().isoformat()
    storage.save_json(novel_id, "meta.json", meta)

    return {"success": True, "data": data}


# ==================== 人物 ====================

@router.get("/{novel_id}/characters/")
async def get_characters(novel_id: str):
    """获取人物库"""
    from ..infrastructure.storage import FileStorage

    storage = FileStorage("data/novels")
    characters = storage.load_json(novel_id, "characters.json")

    if not characters:
        return {"success": True, "data": {"novel_id": novel_id, "version": 1, "characters": []}}

    return {"success": True, "data": characters}


class CreateCharacterRequest(BaseModel):
    """创建人物请求"""
    name: str
    role: str = "次要配角"
    age: int = 20
    gender: str = "男"
    appearance: str = ""
    personality: List[str] = []
    background: str = ""
    abilities: dict = {}
    goals: List[str] = []


@router.post("/{novel_id}/characters/")
async def create_character(novel_id: str, request: CreateCharacterRequest):
    """创建人物"""
    from ..infrastructure.storage import FileStorage
    from datetime import datetime
    import uuid

    storage = FileStorage("data/novels")

    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    # 加载现有人物库
    characters_data = storage.load_json(novel_id, "characters.json")
    if not characters_data:
        characters_data = {"novel_id": novel_id, "version": 1, "characters": [], "relationship_graph": {"edges": []}}

    # 创建新人物
    character_id = f"char-{uuid.uuid4().hex[:8]}"
    new_character = {
        "character_id": character_id,
        "name": request.name,
        "role": request.role,
        "age": request.age,
        "gender": request.gender,
        "appearance": request.appearance,
        "personality": request.personality,
        "background": request.background,
        "abilities": request.abilities,
        "goals": request.goals,
        "relationships": []
    }

    characters_data["characters"].append(new_character)
    characters_data["version"] = characters_data.get("version", 1) + 1
    storage.save_json(novel_id, "characters.json", characters_data)

    # 更新 meta
    meta = storage.load_json(novel_id, "meta.json")
    meta["updated_at"] = datetime.utcnow().isoformat()
    storage.save_json(novel_id, "meta.json", meta)

    return {"success": True, "data": new_character}


@router.put("/{novel_id}/characters/{character_id}/")
async def update_character(novel_id: str, character_id: str, data: dict):
    """更新人物"""
    from ..infrastructure.storage import FileStorage
    from datetime import datetime

    storage = FileStorage("data/novels")

    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    characters_data = storage.load_json(novel_id, "characters.json")
    if not characters_data:
        raise HTTPException(status_code=404, detail="Character not found")

    # 查找并更新人物
    for i, char in enumerate(characters_data["characters"]):
        if char["character_id"] == character_id:
            # 更新允许的字段
            updatable_fields = ["name", "role", "age", "gender", "appearance",
                               "personality", "background", "abilities", "goals", "relationships"]
            for field in updatable_fields:
                if field in data:
                    characters_data["characters"][i][field] = data[field]

            characters_data["version"] = characters_data.get("version", 1) + 1
            storage.save_json(novel_id, "characters.json", characters_data)

            # 更新 meta
            meta = storage.load_json(novel_id, "meta.json")
            meta["updated_at"] = datetime.utcnow().isoformat()
            storage.save_json(novel_id, "meta.json", meta)

            return {"success": True, "data": characters_data["characters"][i]}

    raise HTTPException(status_code=404, detail="Character not found")


@router.delete("/{novel_id}/characters/{character_id}/")
async def delete_character(novel_id: str, character_id: str):
    """删除人物"""
    from ..infrastructure.storage import FileStorage
    from datetime import datetime

    storage = FileStorage("data/novels")

    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    characters_data = storage.load_json(novel_id, "characters.json")
    if not characters_data:
        raise HTTPException(status_code=404, detail="Character not found")

    # 查找并删除人物
    for i, char in enumerate(characters_data["characters"]):
        if char["character_id"] == character_id:
            deleted_char = characters_data["characters"].pop(i)

            # 同时删除相关关系
            characters_data["relationship_graph"]["edges"] = [
                edge for edge in characters_data["relationship_graph"]["edges"]
                if edge["from"] != character_id and edge["to"] != character_id
            ]

            characters_data["version"] = characters_data.get("version", 1) + 1
            storage.save_json(novel_id, "characters.json", characters_data)

            # 更新 meta
            meta = storage.load_json(novel_id, "meta.json")
            meta["updated_at"] = datetime.utcnow().isoformat()
            storage.save_json(novel_id, "meta.json", meta)

            return {"success": True, "data": {"message": "Character deleted", "character_id": character_id}}

    raise HTTPException(status_code=404, detail="Character not found")


# ==================== 大纲 ====================

@router.get("/{novel_id}/outline")
async def get_outline(novel_id: str):
    """获取大纲"""
    from ..infrastructure.storage import FileStorage

    storage = FileStorage("data/novels")
    outline = storage.load_json(novel_id, "outline.json")

    if not outline:
        raise HTTPException(status_code=404, detail="Outline not found")

    return {"success": True, "data": outline}


@router.put("/{novel_id}/outline")
async def update_outline(novel_id: str, data: dict):
    """更新大纲"""
    from ..infrastructure.storage import FileStorage
    from datetime import datetime

    storage = FileStorage("data/novels")

    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    existing = storage.load_json(novel_id, "outline.json")
    version = (existing.get("version", 0) if existing else 0) + 1
    data["version"] = version
    data["novel_id"] = novel_id

    storage.save_json(novel_id, "outline.json", data)

    meta = storage.load_json(novel_id, "meta.json")
    meta["updated_at"] = datetime.utcnow().isoformat()
    storage.save_json(novel_id, "meta.json", meta)

    return {"success": True, "data": data}


# ==================== 章节 ====================

@router.get("/{novel_id}/chapters")
async def get_chapter_list(novel_id: str):
    """获取章节列表"""
    from ..infrastructure.storage import FileStorage
    import glob

    storage = FileStorage("data/novels")

    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    chapters_dir = storage.data_dir / novel_id / "chapters"
    chapters = []

    if chapters_dir.exists():
        for f in sorted(chapters_dir.glob("chapter_*.json")):
            chapter = storage.load_json(novel_id, f"chapters/{f.name}")
            if chapter:
                chapters.append(chapter)

    return {"success": True, "data": chapters}


@router.get("/{novel_id}/chapters/{chapter_num}")
async def get_chapter(novel_id: str, chapter_num: int):
    """获取单个章节"""
    from ..infrastructure.storage import FileStorage

    storage = FileStorage("data/novels")
    chapter = storage.load_json(novel_id, f"chapters/chapter_{chapter_num:03d}.json")

    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    return {"success": True, "data": chapter}


@router.put("/{novel_id}/chapters/{chapter_num}/")
async def update_chapter(novel_id: str, chapter_num: int, data: dict):
    """更新章节"""
    from ..infrastructure.storage import FileStorage
    from datetime import datetime

    storage = FileStorage("data/novels")

    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    existing = storage.load_json(novel_id, f"chapters/chapter_{chapter_num:03d}.json")
    version = (existing.get("version", 0) if existing else 0) + 1

    chapter_data = {
        "novel_id": novel_id,
        "chapter_num": chapter_num,
        "version": version,
        "content": data.get("content", ""),
        "word_count": len(data.get("content", "").replace("\n", "").replace(" ", "")),
        "updated_at": datetime.utcnow().isoformat(),
        **{k: v for k, v in data.items() if k not in ["content", "novel_id", "chapter_num"]}
    }

    if existing:
        chapter_data["created_at"] = existing.get("created_at", datetime.utcnow().isoformat())
        chapter_data["title"] = existing.get("title", f"第{chapter_num}章")
    else:
        chapter_data["created_at"] = datetime.utcnow().isoformat()
        chapter_data["title"] = f"第{chapter_num}章"

    storage.save_json(novel_id, f"chapters/chapter_{chapter_num:03d}.json", chapter_data)

    # 更新 meta
    meta = storage.load_json(novel_id, "meta.json")
    meta["completed_chapters"] = max(meta.get("completed_chapters", 0), chapter_num)
    meta["word_count"] = meta.get("word_count", 0) + chapter_data["word_count"]
    meta["updated_at"] = datetime.utcnow().isoformat()
    storage.save_json(novel_id, "meta.json", meta)

    return {"success": True, "data": chapter_data}


@router.delete("/{novel_id}/chapters/{chapter_num}/")
async def delete_chapter(novel_id: str, chapter_num: int):
    """删除章节"""
    from ..infrastructure.storage import FileStorage
    from datetime import datetime
    import os

    storage = FileStorage("data/novels")

    if not storage.load_json(novel_id, "meta.json"):
        raise HTTPException(status_code=404, detail="Novel not found")

    chapter_file = storage.data_dir / novel_id / "chapters" / f"chapter_{chapter_num:03d}.json"
    if not chapter_file.exists():
        raise HTTPException(status_code=404, detail="Chapter not found")

    # 删除章节文件
    os.remove(chapter_file)

    # 更新 meta
    meta = storage.load_json(novel_id, "meta.json")
    meta["updated_at"] = datetime.utcnow().isoformat()
    # 重新计算已完成章节数
    chapters_dir = storage.data_dir / novel_id / "chapters"
    if chapters_dir.exists():
        chapter_files = list(chapters_dir.glob("chapter_*.json"))
        meta["completed_chapters"] = len(chapter_files)
    else:
        meta["completed_chapters"] = 0
    storage.save_json(novel_id, "meta.json", meta)

    return {"success": True, "data": {"message": "Chapter deleted", "chapter_num": chapter_num}}