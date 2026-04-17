"""AI 生成相关 API"""
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..infrastructure.storage import FileStorage
from ..application.generation_service import GenerationService
from ..application.validation_service import ValidationService

router = APIRouter()


class GenerateWorldSettingRequest(BaseModel):
    """生成世界观请求"""
    novel_id: str
    user_description: str = ""  # 随机生成时可忽略
    random_generate: bool = False  # 是否随机生成
    genre: str = "都市职场"  # 小说类型（MVP 固定为都市职场）
    male_lead_type: str = "random"  # 男主类型
    female_lead_type: str = "random"  # 女主类型


class WorldSettingResponse(BaseModel):
    """世界观响应"""
    novel_id: str
    version: int
    background: dict
    power_system: dict
    core_conflict: dict
    special_elements: list


class GenerateOutlineRequest(BaseModel):
    """生成大纲请求（短篇小说 MVP 版）"""
    novel_id: str
    target_chapters: int = 12  # 短篇小说默认 12 章（10-15 章可选）
    story_preference: str = "平衡发展"
    pacing_preference: str = "中等节奏"


class OutlineResponse(BaseModel):
    """大纲响应"""
    novel_id: str
    version: int
    volumes: list
    chapters: list
    character_growth_curve: list
    foreshadowing_plan: list


@router.post("/world-setting", response_model=dict)
async def generate_world_setting(request: GenerateWorldSettingRequest):
    """生成世界观设定

    Args:
        request: 包含novel_id和用户描述

    Returns:
        生成的世界观数据
    """
    storage = FileStorage("data/novels")

    # 检查小说是否存在
    meta = storage.load_json(request.novel_id, "meta.json")
    if not meta:
        raise HTTPException(status_code=404, detail="Novel not found")

    try:
        service = GenerationService(storage)
        world_setting = await service.generate_world_setting(
            request.novel_id,
            request.user_description
        )

        if not world_setting:
            raise HTTPException(
                status_code=500,
                detail="Failed to parse AI response as JSON"
            )

        return world_setting

    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/world-setting/stream")
async def stream_generate_world_setting(request: GenerateWorldSettingRequest):
    """流式生成世界观设定（SSE）

    Args:
        request: 包含novel_id、用户描述、随机生成参数

    Returns:
        SSE流式响应
    """
    storage = FileStorage("data/novels")

    # 检查小说是否存在
    meta = storage.load_json(request.novel_id, "meta.json")
    if not meta:
        raise HTTPException(status_code=404, detail="Novel not found")

    async def generate_stream():
        """生成SSE流"""
        try:
            service = GenerationService(storage)

            # 先发送开始标记
            yield "event: start\ndata: {\"status\": \"generating\"}\n\n"

            # 流式生成内容
            full_content = ""
            async for chunk in service.stream_generate_world_setting(
                request.novel_id,
                request.user_description,
                request.random_generate,
                request.genre,
                request.male_lead_type,
                request.female_lead_type
            ):
                full_content += chunk
                # 发送内容片段
                yield f"event: chunk\ndata: {json_escape(chunk)}\n\n"

            # 解析并保存结果
            world_setting = service._parse_json_result(full_content)
            if world_setting:
                world_setting["novel_id"] = request.novel_id
                world_setting["version"] = 1
                storage.save_json(request.novel_id, "world_setting.json", world_setting)

                # 更新meta状态
                meta["current_phase"] = "outline_generation"
                meta["updated_at"] = service._get_current_time()
                storage.save_json(request.novel_id, "meta.json", meta)

                # 发送完成标记
                yield "event: complete\ndata: {\"status\": \"saved\"}\n\n"
            else:
                # 发送解析错误
                yield "event: error\ndata: {\"error\": \"Failed to parse JSON\"}\n\n"

        except Exception as e:
            yield f"event: error\ndata: {{\"error\": \"{str(e)}\"}}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


def json_escape(text: str) -> str:
    """JSON字符串转义"""
    import json
    return json.dumps(text)[1:-1]  # 移除引号


# ==================== 大纲生成 API ====================

@router.post("/outline", response_model=dict)
async def generate_outline(request: GenerateOutlineRequest):
    """生成小说大纲

    Args:
        request: 包含novel_id和生成参数

    Returns:
        生成的大纲数据
    """
    storage = FileStorage("data/novels")

    # 检查小说是否存在
    meta = storage.load_json(request.novel_id, "meta.json")
    if not meta:
        raise HTTPException(status_code=404, detail="Novel not found")

    # 检查世界观是否存在
    world_setting = storage.load_json(request.novel_id, "world_setting.json")
    if not world_setting:
        raise HTTPException(
            status_code=400,
            detail="World setting not found. Please generate world setting first."
        )

    try:
        service = GenerationService(storage)
        outline = await service.generate_outline(
            request.novel_id,
            request.target_chapters,
            request.story_preference,
            request.pacing_preference
        )

        if not outline:
            raise HTTPException(
                status_code=500,
                detail="Failed to parse AI response as JSON"
            )

        return outline

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/outline/stream")
async def stream_generate_outline(request: GenerateOutlineRequest):
    """流式生成小说大纲（SSE）

    Args:
        request: 包含novel_id和生成参数

    Returns:
        SSE流式响应
    """
    storage = FileStorage("data/novels")

    # 检查小说是否存在
    meta = storage.load_json(request.novel_id, "meta.json")
    if not meta:
        raise HTTPException(status_code=404, detail="Novel not found")

    # 检查世界观是否存在
    world_setting = storage.load_json(request.novel_id, "world_setting.json")
    if not world_setting:
        raise HTTPException(
            status_code=400,
            detail="World setting not found. Please generate world setting first."
        )

    async def generate_stream():
        """生成SSE流"""
        try:
            service = GenerationService(storage)

            # 先发送开始标记
            yield "event: start\ndata: {\"status\": \"generating\"}\n\n"

            # 流式生成内容
            full_content = ""
            async for chunk in service.stream_generate_outline(
                request.novel_id,
                request.target_chapters,
                request.story_preference,
                request.pacing_preference
            ):
                full_content += chunk
                # 发送内容片段
                yield f"event: chunk\ndata: {json_escape(chunk)}\n\n"

            # 解析并保存结果
            outline = service._parse_json_result(full_content)
            if outline:
                outline["novel_id"] = request.novel_id
                outline["version"] = 1
                storage.save_json(request.novel_id, "outline.json", outline)

                # 初始化伏笔状态
                service._init_foreshadowing_state(request.novel_id, outline)

                # 更新meta状态
                meta["current_phase"] = "chapter_writing"
                meta["updated_at"] = service._get_current_time()
                storage.save_json(request.novel_id, "meta.json", meta)

                # 发送完成标记
                yield "event: complete\ndata: {\"status\": \"saved\"}\n\n"
            else:
                # 发送解析错误
                yield "event: error\ndata: {\"error\": \"Failed to parse JSON\"}\n\n"

        except ValueError as e:
            yield f"event: error\ndata: {{\"error\": \"{str(e)}\"}}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {{\"error\": \"{str(e)}\"}}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


# ==================== 章节续写 API ====================

# ==================== 故事梗概生成 API（短篇小说 MVP） ====================

class GenerateStorySynopsisRequest(BaseModel):
    """生成故事梗概请求"""
    novel_id: str


class StorySynopsisResponse(BaseModel):
    """故事梗概响应"""
    novel_id: str
    story_content: str
    key_plot_points: list
    character_arc: dict


@router.post("/synopsis", response_model=dict)
async def generate_story_synopsis(request: GenerateStorySynopsisRequest):
    """生成故事梗概（短篇小说 MVP 版）

    Args:
        request: 包含 novel_id

    Returns:
        生成的故事梗概数据
    """
    storage = FileStorage("data/novels")

    # 检查小说是否存在
    meta = storage.load_json(request.novel_id, "meta.json")
    if not meta:
        raise HTTPException(status_code=404, detail="Novel not found")

    # 检查世界观是否存在
    world_setting = storage.load_json(request.novel_id, "world_setting.json")
    if not world_setting:
        raise HTTPException(
            status_code=400,
            detail="World setting not found. Please generate world setting first."
        )

    # 检查大纲是否存在
    outline = storage.load_json(request.novel_id, "outline.json")
    if not outline:
        raise HTTPException(
            status_code=400,
            detail="Outline not found. Please generate outline first."
        )

    try:
        service = GenerationService(storage)
        synopsis = await service.generate_story_synopsis(request.novel_id)

        if not synopsis:
            raise HTTPException(
                status_code=500,
                detail="Failed to parse AI response as JSON"
            )

        return synopsis

    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/synopsis/stream")
async def stream_generate_story_synopsis(request: GenerateStorySynopsisRequest):
    """流式生成故事梗概（SSE）

    Args:
        request: 包含 novel_id

    Returns:
        SSE 流式响应
    """
    storage = FileStorage("data/novels")

    # 检查小说是否存在
    meta = storage.load_json(request.novel_id, "meta.json")
    if not meta:
        raise HTTPException(status_code=404, detail="Novel not found")

    # 检查世界观是否存在
    world_setting = storage.load_json(request.novel_id, "world_setting.json")
    if not world_setting:
        raise HTTPException(
            status_code=400,
            detail="World setting not found. Please generate world setting first."
        )

    # 检查大纲是否存在
    outline = storage.load_json(request.novel_id, "outline.json")
    if not outline:
        raise HTTPException(
            status_code=400,
            detail="Outline not found. Please generate outline first."
        )

    async def generate_stream():
        """生成 SSE 流"""
        try:
            service = GenerationService(storage)

            # 先发送开始标记
            yield "event: start\ndata: {\"status\": \"generating\"}\n\n"

            # 流式生成内容
            full_content = ""
            async for chunk in service.stream_generate_story_synopsis(request.novel_id):
                full_content += chunk
                # 发送内容片段
                yield f"event: chunk\ndata: {json_escape(chunk)}\n\n"

            # 解析并保存结果
            synopsis = service._parse_json_result(full_content)
            if synopsis:
                synopsis["novel_id"] = request.novel_id
                storage.save_json(request.novel_id, "story_synopsis.json", synopsis)

                # 更新 meta 状态
                meta["current_phase"] = "chapter_splitting"
                meta["updated_at"] = service._get_current_time()
                storage.save_json(request.novel_id, "meta.json", meta)

                # 发送完成标记
                yield "event: complete\ndata: {\"status\": \"saved\"}\n\n"
            else:
                # 发送解析错误
                yield "event: error\ndata: {\"error\": \"Failed to parse JSON\"}\n\n"

        except Exception as e:
            yield f"event: error\ndata: {{\"error\": \"{str(e)}\"}}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


# ==================== 章节批量拆分 API（短篇小说 MVP） ====================

class SplitChaptersRequest(BaseModel):
    """批量拆分章节请求"""
    novel_id: str
    start_chapter: int = 1
    batch_size: int = 5  # 3/5/10 章可选


class SplitChaptersResponse(BaseModel):
    """批量拆分章节响应"""
    novel_id: str
    chapters: list


@router.post("/split-chapters", response_model=dict)
async def split_chapters(request: SplitChaptersRequest):
    """批量拆分故事梗概为章节

    Args:
        request: 包含 novel_id、起始章节号、批量大小

    Returns:
        生成的章节列表
    """
    storage = FileStorage("data/novels")

    # 检查小说是否存在
    meta = storage.load_json(request.novel_id, "meta.json")
    if not meta:
        raise HTTPException(status_code=404, detail="Novel not found")

    # 检查大纲是否存在
    outline = storage.load_json(request.novel_id, "outline.json")
    if not outline:
        raise HTTPException(
            status_code=400,
            detail="Outline not found. Please generate outline first."
        )

    # 检查故事梗概是否存在
    synopsis = storage.load_json(request.novel_id, "story_synopsis.json")
    if not synopsis:
        raise HTTPException(
            status_code=400,
            detail="Story synopsis not found. Please generate story synopsis first."
        )

    try:
        service = GenerationService(storage)
        chapters = await service.split_story_to_chapters(
            request.novel_id,
            request.start_chapter,
            request.batch_size
        )

        return {"novel_id": request.novel_id, "chapters": chapters}

    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/split-chapters/stream")
async def stream_split_chapters(request: SplitChaptersRequest):
    """流式批量拆分章节（SSE）

    Args:
        request: 包含 novel_id、起始章节号、批量大小

    Returns:
        SSE 流式响应
    """
    storage = FileStorage("data/novels")

    # 检查小说是否存在
    meta = storage.load_json(request.novel_id, "meta.json")
    if not meta:
        raise HTTPException(status_code=404, detail="Novel not found")

    # 检查大纲是否存在
    outline = storage.load_json(request.novel_id, "outline.json")
    if not outline:
        raise HTTPException(
            status_code=400,
            detail="Outline not found. Please generate outline first."
        )

    # 检查故事梗概是否存在
    synopsis = storage.load_json(request.novel_id, "story_synopsis.json")
    if not synopsis:
        raise HTTPException(
            status_code=400,
            detail="Story synopsis not found. Please generate story synopsis first."
        )

    async def generate_stream():
        """生成 SSE 流"""
        try:
            service = GenerationService(storage)

            # 先发送开始标记
            yield "event: start\ndata: {\"status\": \"generating\", \"batch_size\": " + str(request.batch_size) + "}\n\n"

            # 流式批量生成
            async for chunk in service.stream_generate_batch_chapters(
                request.novel_id,
                request.start_chapter,
                request.batch_size
            ):
                yield chunk

        except Exception as e:
            yield f"event: error\ndata: {{\"error\": \"{str(e)}\"}}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


# ==================== 章节续写 API ====================

class GenerateChapterRequest(BaseModel):
    """生成章节请求"""
    novel_id: str
    chapter_num: int
    user_special_request: Optional[str] = None
    outline_context: Optional[dict] = None  # 大纲上下文（前端传递）


class ChapterResponse(BaseModel):
    """章节响应"""
    novel_id: str
    chapter_num: int
    title: str
    version: int
    content: str
    word_count: int
    summary: dict
    character_updates: list
    foreshadowing_updates: list
    timeline_additions: list


@router.post("/chapter", response_model=dict)
async def generate_chapter(request: GenerateChapterRequest):
    """生成章节内容

    Args:
        request: 包含novel_id、章节号和用户特别要求

    Returns:
        生成的章节数据
    """
    storage = FileStorage("data/novels")

    # 检查小说是否存在
    meta = storage.load_json(request.novel_id, "meta.json")
    if not meta:
        raise HTTPException(status_code=404, detail="Novel not found")

    # 检查大纲是否存在
    outline = storage.load_json(request.novel_id, "outline.json")
    if not outline:
        raise HTTPException(
            status_code=400,
            detail="Outline not found. Please generate outline first."
        )

    try:
        service = GenerationService(storage)
        chapter = await service.generate_chapter(
            request.novel_id,
            request.chapter_num,
            request.user_special_request
        )

        if not chapter:
            raise HTTPException(
                status_code=500,
                detail="Failed to parse AI response as JSON"
            )

        return chapter

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/chapter/stream")
async def stream_generate_chapter(request: GenerateChapterRequest):
    """流式生成章节内容（SSE）

    Args:
        request: 包含novel_id、章节号和用户特别要求

    Returns:
        SSE流式响应
    """
    storage = FileStorage("data/novels")

    # 检查小说是否存在
    meta = storage.load_json(request.novel_id, "meta.json")
    if not meta:
        raise HTTPException(status_code=404, detail="Novel not found")

    # 检查大纲是否存在
    outline = storage.load_json(request.novel_id, "outline.json")
    if not outline:
        raise HTTPException(
            status_code=400,
            detail="Outline not found. Please generate outline first."
        )

    async def generate_stream():
        """生成SSE流"""
        try:
            service = GenerationService(storage)

            # 先发送开始标记
            yield "event: start\ndata: {\"status\": \"generating\", \"chapter\": " + str(request.chapter_num) + "}\n\n"

            # 流式生成内容
            full_content = ""
            async for chunk in service.stream_generate_chapter(
                request.novel_id,
                request.chapter_num,
                request.user_special_request,
                request.outline_context
            ):
                full_content += chunk
                # 发送内容片段
                yield f"event: chunk\ndata: {json_escape(chunk)}\n\n"

            # 解析并保存结果
            chapter = service._parse_json_result(full_content)
            if chapter:
                # 补充必要字段
                chapter["novel_id"] = request.novel_id
                chapter["chapter_num"] = request.chapter_num
                chapter["version"] = 1
                chapter["created_at"] = service._get_current_time()
                chapter["word_count"] = service._calculate_word_count(chapter.get("content", ""))

                # 从大纲获取标题
                for ch in outline.get("chapters", []):
                    if ch.get("chapter_num") == request.chapter_num:
                        chapter["title"] = ch.get("title", f"第{request.chapter_num}章")
                        break

                # 保存章节
                storage.save_json(
                    request.novel_id,
                    f"chapters/chapter_{request.chapter_num:03d}.json",
                    chapter
                )

                # 更新状态追踪
                service._update_states_after_chapter(request.novel_id, request.chapter_num, chapter)

                # 更新meta
                service._update_meta_after_chapter(
                    request.novel_id,
                    request.chapter_num,
                    chapter.get("word_count", 0)
                )

                # 发送完成标记
                yield "event: complete\ndata: {\"status\": \"saved\", \"chapter\": " + str(request.chapter_num) + "}\n\n"
            else:
                # 发送解析错误
                yield "event: error\ndata: {\"error\": \"Failed to parse JSON\"}\n\n"

        except ValueError as e:
            yield f"event: error\ndata: {{\"error\": \"{str(e)}\"}}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {{\"error\": \"{str(e)}\"}}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/chapter/{novel_id}/{chapter_num}")
async def get_chapter(novel_id: str, chapter_num: int):
    """获取章节内容

    Args:
        novel_id: 小说ID
        chapter_num: 章节号

    Returns:
        章节数据
    """
    storage = FileStorage("data/novels")

    chapter = storage.load_json(novel_id, f"chapters/chapter_{chapter_num:03d}.json")
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    return chapter


# ==================== 文案校验 API ====================

class ValidateChapterRequest(BaseModel):
    """校验章节请求"""
    novel_id: str
    chapter_num: int
    validation_types: Optional[List[str]] = None  # 可选：指定校验类型


class ValidationReportResponse(BaseModel):
    """校验报告响应"""
    novel_id: str
    chapter_num: Optional[int]
    validated_at: str
    validation_type: str
    issues: list
    statistics: dict


@router.post("/validate/chapter", response_model=dict)
async def validate_chapter(request: ValidateChapterRequest):
    """校验单个章节

    Args:
        request: 包含novel_id、章节号和可选校验类型

    Returns:
        校验报告
    """
    storage = FileStorage("data/novels")

    # 检查小说是否存在
    meta = storage.load_json(request.novel_id, "meta.json")
    if not meta:
        raise HTTPException(status_code=404, detail="Novel not found")

    # 检查章节是否存在
    chapter = storage.load_json(
        request.novel_id,
        f"chapters/chapter_{request.chapter_num:03d}.json"
    )
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    try:
        service = ValidationService(storage)
        report = await service.validate_chapter(
            request.novel_id,
            request.chapter_num,
            request.validation_types
        )

        return report

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/validate/novel/{novel_id}", response_model=dict)
async def validate_novel(novel_id: str):
    """校验整本小说

    Args:
        novel_id: 小说ID

    Returns:
        全书校验报告
    """
    storage = FileStorage("data/novels")

    # 检查小说是否存在
    meta = storage.load_json(novel_id, "meta.json")
    if not meta:
        raise HTTPException(status_code=404, detail="Novel not found")

    try:
        service = ValidationService(storage)
        report = await service.validate_novel(novel_id)

        return report

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/validate/rules")
async def get_validation_rules():
    """获取所有校验规则信息

    Returns:
        规则信息（36条规则的详细说明）
    """
    from ..application.validation_service import VALIDATION_RULES

    return {
        "total_rules": len(VALIDATION_RULES),
        "categories": {
            "逻辑一致性 (L001-L005)": 5,
            "语法规范 (G001-G005)": 5,
            "风格一致性 (S001-S003)": 3,
            "人物一致性 (P001-P004)": 4,
            "伏笔一致性 (F001-F003)": 3,
            "商业逻辑 (B001-B008)": 8,
            "感情线 (E001-E008)": 8
        },
        "rules": VALIDATION_RULES
    }


@router.get("/validate/report/{novel_id}/{chapter_num}")
async def get_validation_report(novel_id: str, chapter_num: int):
    """获取章节校验报告

    Args:
        novel_id: 小说ID
        chapter_num: 章节号

    Returns:
        校验报告
    """
    storage = FileStorage("data/novels")

    # 查找最新校验报告
    import glob
    from pathlib import Path

    report_dir = Path(f"data/novels/{novel_id}/validation_reports")
    if not report_dir.exists():
        raise HTTPException(status_code=404, detail="No validation reports found")

    # 查找该章节的报告
    pattern = f"chapter_{chapter_num:03d}_*.json"
    report_files = list(report_dir.glob(pattern))

    if not report_files:
        raise HTTPException(status_code=404, detail="No validation report for this chapter")

    # 返回最新报告
    latest_report = max(report_files, key=lambda f: f.stat().st_mtime)
    report = storage.load_json(novel_id, f"validation_reports/{latest_report.name}")

    return report