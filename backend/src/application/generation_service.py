"""AI 生成服务"""
import os
from typing import Dict, Any, Optional, AsyncGenerator
import json

from ..infrastructure.ai_provider import QwenProvider, AIProviderFactory
from ..infrastructure.storage import FileStorage


class GenerationService:
    """AI 内容生成服务"""

    def __init__(self, storage: FileStorage):
        self.storage = storage
        # 从环境变量获取API密钥
        api_key = os.getenv("DASHSCOPE_API_KEY", "")
        if not api_key:
            raise ValueError("DASHSCOPE_API_KEY environment variable is required")
        self.ai_provider = AIProviderFactory.create("dashscope", {
            "api_key": api_key,
            "model": "qwen-plus"
        })

    async def generate_world_setting(
        self,
        novel_id: str,
        user_description: str
    ) -> Dict[str, Any]:
        """生成世界观设定

        Args:
            novel_id: 小说ID
            user_description: 用户简短描述

        Returns:
            Dict: 世界观设定数据
        """
        # 构建Prompt
        prompt = self._build_world_setting_prompt(user_description)

        # 调用AI生成
        result = await self.ai_provider.generate(prompt)

        # 解析JSON结果
        world_setting = self._parse_json_result(result)

        if world_setting:
            # 添加novel_id和version
            world_setting["novel_id"] = novel_id
            world_setting["version"] = 1

            # 保存到文件
            self.storage.save_json(novel_id, "world_setting.json", world_setting)

            # 更新meta状态
            meta = self.storage.load_json(novel_id, "meta.json")
            if meta:
                meta["current_phase"] = "outline_generation"
                meta["updated_at"] = self._get_current_time()
                self.storage.save_json(novel_id, "meta.json", meta)

        return world_setting

    async def stream_generate_world_setting(
        self,
        novel_id: str,
        user_description: str
    ) -> AsyncGenerator[str, None]:
        """流式生成世界观设定

        Args:
            novel_id: 小说ID
            user_description: 用户简短描述

        Yields:
            str: 生成的内容片段
        """
        prompt = self._build_world_setting_prompt(user_description)

        async for chunk in self.ai_provider.stream_generate(prompt):
            yield chunk

    def _build_world_setting_prompt(self, user_description: str) -> str:
        """构建世界观生成Prompt

        Args:
            user_description: 用户简短描述

        Returns:
            str: 完整Prompt
        """
        prompt = f"""
# 任务：生成小说世界观

## 用户输入
{user_description}

## 输出要求
请生成完整的世界观设定，输出为 JSON 格式，包含以下字段：

### background（背景设定）
- era: 时代类型（古代架空/现代/未来/异世界）
- era_name: 具体时代名称
- geography: 地理设定，包含：
  - world_name: 世界名称
  - regions: 至少3个主要地区，每个包含 name, description
- society: 社会设定，包含：
  - power_structure: 权力结构描述
  - social_classes: 社会阶层列表（至少3层）
  - key_institutions: 关键机构（至少2个）

### power_system（能力体系）
- name: 体系名称
- levels: 能力等级列表（至少4级），每个包含 name, rank, description
- key_rules: 规则列表（至少3条核心规则）

### core_conflict（核心冲突）
- main_conflict: 主线冲突，包含 type, description, antagonist
- sub_conflicts: 子冲突列表（至少2个）

### special_elements（特殊元素）
至少包含2个特殊元素（法宝、资源、组织等）

## 约束条件
1. 所有设定必须自洽，不能存在内部矛盾
2. 能力体系必须有明确的等级和晋升规则
3. 核心冲突必须能支撑至少50章的故事发展
4. 如果是都市职场题材，power_system应为职场等级体系

## 输出格式
输出严格遵循 JSON 结构，不要添加任何额外文字说明。
只输出JSON对象，不要包含markdown代码块标记。
"""
        return prompt

    def _parse_json_result(self, result: str) -> Optional[Dict[str, Any]]:
        """解析AI返回的JSON结果

        Args:
            result: AI返回的字符串

        Returns:
            Dict: 解析后的JSON数据，解析失败返回None
        """
        try:
            # 尝试直接解析
            return json.loads(result)
        except json.JSONDecodeError:
            # 尝试提取JSON块
            if "```json" in result:
                start = result.find("```json") + 7
                end = result.find("```", start)
                if end > start:
                    json_str = result[start:end].strip()
                    try:
                        return json.loads(json_str)
                    except json.JSONDecodeError:
                        pass

            # 尝试提取花括号内容
            start = result.find("{")
            end = result.rfind("}") + 1
            if start >= 0 and end > start:
                json_str = result[start:end]
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    pass

            return None

    def _get_current_time(self) -> str:
        """获取当前时间字符串"""
        from datetime import datetime
        return datetime.utcnow().isoformat()

    # ==================== 大纲生成 ====================

    async def generate_outline(
        self,
        novel_id: str,
        target_chapters: int = 50,
        story_preference: str = "平衡发展",
        pacing_preference: str = "中等节奏"
    ) -> Dict[str, Any]:
        """生成小说大纲

        Args:
            novel_id: 小说ID
            target_chapters: 目标章节数
            story_preference: 故事走向偏好
            pacing_preference: 节奏偏好

        Returns:
            Dict: 大纲数据
        """
        # 加载世界观作为上下文
        world_setting = self.storage.load_json(novel_id, "world_setting.json")
        if not world_setting:
            raise ValueError("World setting not found. Please generate world setting first.")

        # 加载人物库（可选）
        characters = self.storage.load_json(novel_id, "characters.json")

        # 构建Prompt
        prompt = self._build_outline_prompt(
            world_setting,
            characters,
            target_chapters,
            story_preference,
            pacing_preference
        )

        # 调用AI生成
        result = await self.ai_provider.generate(prompt)

        # 解析JSON结果
        outline = self._parse_json_result(result)

        if outline:
            # 添加novel_id和version
            outline["novel_id"] = novel_id
            outline["version"] = 1

            # 保存到文件
            self.storage.save_json(novel_id, "outline.json", outline)

            # 初始化伏笔状态文件
            self._init_foreshadowing_state(novel_id, outline)

            # 更新meta状态
            meta = self.storage.load_json(novel_id, "meta.json")
            if meta:
                meta["current_phase"] = "chapter_writing"
                meta["updated_at"] = self._get_current_time()
                self.storage.save_json(novel_id, "meta.json", meta)

        return outline

    async def stream_generate_outline(
        self,
        novel_id: str,
        target_chapters: int = 50,
        story_preference: str = "平衡发展",
        pacing_preference: str = "中等节奏"
    ) -> AsyncGenerator[str, None]:
        """流式生成小说大纲

        Args:
            novel_id: 小说ID
            target_chapters: 目标章节数
            story_preference: 故事走向偏好
            pacing_preference: 节奏偏好

        Yields:
            str: 生成的内容片段
        """
        # 加载世界观作为上下文
        world_setting = self.storage.load_json(novel_id, "world_setting.json")
        if not world_setting:
            raise ValueError("World setting not found. Please generate world setting first.")

        # 加载人物库（可选）
        characters = self.storage.load_json(novel_id, "characters.json")

        prompt = self._build_outline_prompt(
            world_setting,
            characters,
            target_chapters,
            story_preference,
            pacing_preference
        )

        async for chunk in self.ai_provider.stream_generate(prompt):
            yield chunk

    def _build_outline_prompt(
        self,
        world_setting: Dict[str, Any],
        characters: Optional[Dict[str, Any]],
        target_chapters: int,
        story_preference: str,
        pacing_preference: str
    ) -> str:
        """构建大纲生成Prompt

        Args:
            world_setting: 世界观设定
            characters: 人物库（可选）
            target_chapters: 目标章节数
            story_preference: 故事走向偏好
            pacing_preference: 节奏偏好

        Returns:
            str: 完整Prompt
        """
        world_setting_str = json.dumps(world_setting, ensure_ascii=False, indent=2)
        characters_str = ""
        if characters:
            characters_str = json.dumps(characters, ensure_ascii=False, indent=2)

        prompt = f"""
# 任务：生成小说大纲

## 输入上下文

### 世界观设定
{world_setting_str}

### 人物库
{characters_str if characters_str else "（暂无人物设定）"}

### 用户期望
- 目标章节数: {target_chapters}
- 故事走向偏好: {story_preference}
- 节奏偏好: {pacing_preference}

## 输出要求
请生成完整的大纲，输出为 JSON 格式，包含以下字段：

### volumes（卷划分）
根据章节总数划分卷，每卷包含：
- volume_id: 卷ID（如 "vol-001"）
- name: 卷名称（如 "第一卷：少年崛起"）
- chapters_range: 章节范围，包含 start, end
- theme: 主题
- arc_summary: 故事弧线概述

### chapters（章节规划）
为前20章生成详细规划（后续章节可简化），每章包含：
- chapter_num: 章节号
- title: 章节标题
- volume_id: 所属卷ID
- key_events: 核心事件列表（每章至少2个）
- turning_points: 转折点列表（重要章节必须包含），每个包含 event, type, impact
- character_growth: 人物成长变化，每个包含 character_id, change
- foreshadowing: 需要埋下的伏笔，每个包含 id, hint, recycle_chapter

### character_growth_curve（人物成长曲线）
定义主要人物在各阶段的变化，每个包含：
- chapter_range: 章节范围（如 "1-10"）
- character_id: 人物ID
- growth: 成长描述

### foreshadowing_plan（伏笔计划）
列出主要伏笔及其回收时机，每个包含：
- id: 伏笔ID（如 "fs-001"）
- hint: 伏笔提示
- recycle_chapter: 计划回收章节
- status: 状态（默认 "pending"）

## 约束条件
1. 禁止与世界观设定冲突
2. 每卷必须有明确的主题和故事弧线
3. 伏笔回收时机必须在合理范围内（不超过50章间隔）
4. 主线冲突必须在大纲中逐步推进
5. 章节标题要吸引人，能引起读者兴趣

## 输出格式
输出严格遵循 JSON 结构，不要添加任何额外文字说明。
只输出JSON对象，不要包含markdown代码块标记。
"""
        return prompt

    def _init_foreshadowing_state(self, novel_id: str, outline: Dict[str, Any]):
        """初始化伏笔状态文件

        Args:
            novel_id: 小说ID
            outline: 大纲数据
        """
        foreshadowing_plan = outline.get("foreshadowing_plan", [])
        foreshadowings = []

        for fp in foreshadowing_plan:
            foreshadowings.append({
                "id": fp.get("id", ""),
                "hint": fp.get("hint", ""),
                "planted_chapter": None,  # 尚未埋下
                "planned_recycle_chapter": fp.get("recycle_chapter", 0),
                "recycle_chapter": None,
                "status": "planned",  # 已计划但未埋下
                "significance": "medium"
            })

        state_data = {
            "novel_id": novel_id,
            "foreshadowings": foreshadowings,
            "statistics": {
                "total_planted": 0,
                "recycled": 0,
                "pending": len(foreshadowings)
            }
        }

        self.storage.save_json(novel_id, "state/foreshadowing.json", state_data)

    # ==================== 章节续写 ====================

    async def generate_chapter(
        self,
        novel_id: str,
        chapter_num: int,
        user_special_request: Optional[str] = None
    ) -> Dict[str, Any]:
        """生成章节内容

        Args:
            novel_id: 小说ID
            chapter_num: 章节号
            user_special_request: 用户特别要求（可选）

        Returns:
            Dict: 章节数据
        """
        # 加载所有上下文
        context = self._load_chapter_context(novel_id, chapter_num)

        # 构建Prompt
        prompt = self._build_chapter_prompt(context, chapter_num, user_special_request)

        # 调用AI生成
        result = await self.ai_provider.generate(prompt)

        # 解析JSON结果
        chapter = self._parse_json_result(result)

        if chapter:
            # 补充必要字段
            chapter["novel_id"] = novel_id
            chapter["chapter_num"] = chapter_num
            chapter["version"] = 1
            chapter["created_at"] = self._get_current_time()
            chapter["word_count"] = self._calculate_word_count(chapter.get("content", ""))

            # 从大纲获取标题
            outline = context.get("outline", {})
            for ch in outline.get("chapters", []):
                if ch.get("chapter_num") == chapter_num:
                    chapter["title"] = ch.get("title", f"第{chapter_num}章")
                    break

            # 保存章节
            self.storage.save_json(
                novel_id,
                f"chapters/chapter_{chapter_num:03d}.json",
                chapter
            )

            # 更新状态追踪
            self._update_states_after_chapter(novel_id, chapter_num, chapter)

            # 更新meta
            self._update_meta_after_chapter(novel_id, chapter_num, chapter.get("word_count", 0))

        return chapter

    async def stream_generate_chapter(
        self,
        novel_id: str,
        chapter_num: int,
        user_special_request: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """流式生成章节内容

        Args:
            novel_id: 小说ID
            chapter_num: 章节号
            user_special_request: 用户特别要求（可选）

        Yields:
            str: 生成的内容片段
        """
        # 加载所有上下文
        context = self._load_chapter_context(novel_id, chapter_num)

        # 构建Prompt
        prompt = self._build_chapter_prompt(context, chapter_num, user_special_request)

        async for chunk in self.ai_provider.stream_generate(prompt):
            yield chunk

    def _load_chapter_context(self, novel_id: str, chapter_num: int) -> Dict[str, Any]:
        """加载章节生成所需的所有上下文

        Args:
            novel_id: 小说ID
            chapter_num: 章节号

        Returns:
            Dict: 上下文数据
        """
        context = {}

        # 1. 世界观设定
        context["world_setting"] = self.storage.load_json(novel_id, "world_setting.json")

        # 2. 人物库
        context["characters"] = self.storage.load_json(novel_id, "characters.json")

        # 3. 大纲（当前章节）
        outline = self.storage.load_json(novel_id, "outline.json")
        context["outline"] = outline
        if outline:
            for ch in outline.get("chapters", []):
                if ch.get("chapter_num") == chapter_num:
                    context["current_chapter_outline"] = ch
                    break

        # 4. 时间线状态
        context["timeline"] = self.storage.load_json(novel_id, "state/timeline.json")

        # 5. 人物当前状态
        context["character_states"] = self.storage.load_json(novel_id, "state/character_states.json")

        # 6. 伏笔状态
        context["foreshadowing"] = self.storage.load_json(novel_id, "state/foreshadowing.json")

        # 7. 上一章内容（如有）
        if chapter_num > 1:
            context["previous_chapter"] = self.storage.load_json(
                novel_id,
                f"chapters/chapter_{chapter_num - 1:03d}.json"
            )

        return context

    def _build_chapter_prompt(
        self,
        context: Dict[str, Any],
        chapter_num: int,
        user_special_request: Optional[str] = None
    ) -> str:
        """构建章节续写Prompt

        Args:
            context: 上下文数据
            chapter_num: 章节号
            user_special_request: 用户特别要求

        Returns:
            str: 完整Prompt
        """
        # 序列化上下文
        world_setting_str = json.dumps(context.get("world_setting", {}), ensure_ascii=False, indent=2)
        characters_str = json.dumps(context.get("characters", {}), ensure_ascii=False, indent=2)
        current_outline_str = json.dumps(context.get("current_chapter_outline", {}), ensure_ascii=False, indent=2)
        timeline_str = json.dumps(context.get("timeline", {}), ensure_ascii=False, indent=2)
        character_states_str = json.dumps(context.get("character_states", {}), ensure_ascii=False, indent=2)
        foreshadowing_str = json.dumps(context.get("foreshadowing", {}), ensure_ascii=False, indent=2)

        previous_chapter_str = ""
        prev_chapter = context.get("previous_chapter")
        if prev_chapter:
            # 只取摘要和最后500字作为参考
            prev_summary = prev_chapter.get("summary", {})
            prev_content_preview = prev_chapter.get("content", "")[-500:] if prev_chapter.get("content") else ""
            previous_chapter_str = json.dumps({
                "summary": prev_summary,
                "content_preview": prev_content_preview,
                "word_count": prev_chapter.get("word_count", 0)
            }, ensure_ascii=False, indent=2)

        user_request_str = user_special_request if user_special_request else "无特别要求"

        prompt = f"""
# 任务：续写小说章节

## 输入上下文（必须校验一致性）

### 世界观设定
{world_setting_str}

### 人物库
{characters_str}

### 当前章节大纲
{current_outline_str}

### 时间线状态
{timeline_str}

### 人物当前状态
{character_states_str}

### 伏笔状态
{foreshadowing_str}

### 上一章内容（如有）
{previous_chapter_str if previous_chapter_str else "这是第一章，无上一章内容"}

### 用户特别要求
{user_request_str}

## 输出要求
请续写第 {chapter_num} 章，输出为 JSON 格式，包含以下字段：

### content（正文内容）
- 完整的叙事内容，约3000-5000字
- 必须符合章节大纲中的 key_events
- 语言风格与已有章节一致（如有）
- 情节连贯，叙事流畅

### summary（章节摘要）
- key_events: 本章核心事件列表（至少2个）
- emotional_tone: 本章情感基调

### character_updates（人物状态更新）
本章中发生变化的人物，每个包含：
- character_id: 人物ID
- location_change: 位置变化（如有），包含 from_location, to_location
- emotional_change: 情绪变化（如有），包含 from_emotion, to_emotion
- ability_change: 能力变化（如有）
- relationship_changes: 关系变化列表（如有）

### timeline_additions（时间线新增）
本章新增的时间节点事件，每个包含：
- event: 事件描述
- time: 时间点描述

### foreshadowing_updates（伏笔状态更新）
本章埋下或回收的伏笔，每个包含：
- id: 伏笔ID
- action: 操作类型（planted/recycled）
- detail: 详细描述

## 约束条件（红线规则，必须遵守）
1. 禁止与时间线状态矛盾（时间必须连续）
2. 禁止与人物位置状态矛盾（人物位置变化必须有描述）
3. 禁止与人物能力等级矛盾（能力表现不能越级）
4. 禁止与世界观设定矛盾
5. 必须覆盖大纲中的所有 key_events
6. 伏笔操作必须与 foreshadowing.json 一致
7. 禁止改变已有人物的设定和性格

## 写作风格指南
- 叙事视角: 第三人称
- 语言风格: 符合小说题材（都市职场/武侠/玄幻等）
- 情感基调: 根据章节大纲的情节决定

## 输出格式
输出严格遵循 JSON 结构，不要添加任何额外文字说明。
只输出JSON对象，不要包含markdown代码块标记。
"""
        return prompt

    def _update_states_after_chapter(
        self,
        novel_id: str,
        chapter_num: int,
        chapter: Dict[str, Any]
    ):
        """章节生成后更新状态追踪

        Args:
            novel_id: 小说ID
            chapter_num: 章节号
            chapter: 章节数据
        """
        # 1. 更新时间线
        self._update_timeline(novel_id, chapter_num, chapter)

        # 2. 更新人物状态
        self._update_character_states(novel_id, chapter_num, chapter)

        # 3. 更新伏笔状态
        self._update_foreshadowing_state(novel_id, chapter_num, chapter)

    def _update_timeline(
        self,
        novel_id: str,
        chapter_num: int,
        chapter: Dict[str, Any]
    ):
        """更新时间线状态

        Args:
            novel_id: 小说ID
            chapter_num: 章节号
            chapter: 章节数据
        """
        timeline = self.storage.load_json(novel_id, "state/timeline.json") or {
            "novel_id": novel_id,
            "events": [],
            "time_scale": {"unit": "天", "current_time": "", "total_duration": ""}
        }

        # 获取当前最大order
        max_order = max([e.get("order", 0) for e in timeline.get("events", [])], default=0)

        # 添加新时间线事件
        timeline_additions = chapter.get("timeline_additions", [])
        for event in timeline_additions:
            timeline["events"].append({
                "order": max_order + 1,
                "chapter": chapter_num,
                "time": event.get("time", ""),
                "event": event.get("event", ""),
                "participants": [],
                "location": "",
                "significance": "medium"
            })
            max_order += 1

        # 更新当前时间
        if timeline_additions:
            last_event = timeline_additions[-1]
            timeline["time_scale"]["current_time"] = last_event.get("time", "")

        timeline["last_updated"] = self._get_current_time()
        self.storage.save_json(novel_id, "state/timeline.json", timeline)

    def _update_character_states(
        self,
        novel_id: str,
        chapter_num: int,
        chapter: Dict[str, Any]
    ):
        """更新人物状态

        Args:
            novel_id: 小说ID
            chapter_num: 章节号
            chapter: 章节数据
        """
        character_states = self.storage.load_json(novel_id, "state/character_states.json") or {
            "novel_id": novel_id,
            "last_updated_chapter": 0,
            "states": []
        }

        character_updates = chapter.get("character_updates", [])

        for update in character_updates:
            char_id = update.get("character_id")

            # 查找现有状态
            existing_state = None
            for state in character_states.get("states", []):
                if state.get("character_id") == char_id:
                    existing_state = state
                    break

            if existing_state:
                # 更新现有状态
                if update.get("location_change"):
                    existing_state["current_location"] = update["location_change"].get("to_location", "")

                if update.get("emotional_change"):
                    existing_state["emotional_state"] = update["emotional_change"].get("to_emotion", "")

                if update.get("ability_change"):
                    existing_state["cultivation_level"] = update["ability_change"].get("new_level", "")
            else:
                # 创建新状态
                new_state = {
                    "character_id": char_id,
                    "current_location": update.get("location_change", {}).get("to_location", "") if update.get("location_change") else "",
                    "emotional_state": update.get("emotional_change", {}).get("to_emotion", "") if update.get("emotional_change") else "",
                    "cultivation_level": "",
                    "physical_health": "健康",
                    "relationships_current": []
                }
                character_states["states"].append(new_state)

        character_states["last_updated_chapter"] = chapter_num
        self.storage.save_json(novel_id, "state/character_states.json", character_states)

    def _update_foreshadowing_state(
        self,
        novel_id: str,
        chapter_num: int,
        chapter: Dict[str, Any]
    ):
        """更新伏笔状态

        Args:
            novel_id: 小说ID
            chapter_num: 章节号
            chapter: 章节数据
        """
        foreshadowing = self.storage.load_json(novel_id, "state/foreshadowing.json") or {
            "novel_id": novel_id,
            "foreshadowings": [],
            "statistics": {"total_planted": 0, "recycled": 0, "pending": 0}
        }

        foreshadowing_updates = chapter.get("foreshadowing_updates", [])

        for update in foreshadowing_updates:
            fs_id = update.get("id")
            action = update.get("action")

            for fs in foreshadowing.get("foreshadowings", []):
                if fs.get("id") == fs_id:
                    if action == "planted":
                        fs["planted_chapter"] = chapter_num
                        fs["status"] = "planted"
                        foreshadowing["statistics"]["total_planted"] += 1
                    elif action == "recycled":
                        fs["recycle_chapter"] = chapter_num
                        fs["status"] = "recycled"
                        foreshadowing["statistics"]["recycled"] += 1
                        foreshadowing["statistics"]["pending"] -= 1
                    break

        self.storage.save_json(novel_id, "state/foreshadowing.json", foreshadowing)

    def _update_meta_after_chapter(
        self,
        novel_id: str,
        chapter_num: int,
        word_count: int
    ):
        """更新元信息

        Args:
            novel_id: 小说ID
            chapter_num: 章节号
            word_count: 本章字数
        """
        meta = self.storage.load_json(novel_id, "meta.json")
        if meta:
            meta["completed_chapters"] = chapter_num
            meta["word_count"] = meta.get("word_count", 0) + word_count
            meta["updated_at"] = self._get_current_time()
            self.storage.save_json(novel_id, "meta.json", meta)

    def _calculate_word_count(self, content: str) -> int:
        """计算字数（中文）

        Args:
            content: 正文内容

        Returns:
            int: 字数
        """
        if not content:
            return 0
        # 移除空白字符计算
        return len(content.replace("\n", "").replace(" ", "").replace("\t", ""))

    def get_chapter_context_for_validation(
        self,
        novel_id: str,
        chapter_num: int
    ) -> Dict[str, Any]:
        """获取章节校验所需的上下文（供校验服务使用）

        Args:
            novel_id: 小说ID
            chapter_num: 章节号

        Returns:
            Dict: 校验上下文
        """
        return self._load_chapter_context(novel_id, chapter_num)