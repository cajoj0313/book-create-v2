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
        user_description: str = "",
        random_generate: bool = False,
        genre: str = "都市职场",
        male_lead_type: str = "random",
        female_lead_type: str = "random"
    ) -> AsyncGenerator[str, None]:
        """流式生成世界观设定

        Args:
            novel_id: 小说ID
            user_description: 用户简短描述（随机生成时可忽略）
            random_generate: 是否随机生成
            genre: 小说类型（随机生成时使用，MVP 固定为"都市职场"）
            male_lead_type: 男主类型（random/霸道总裁/暖男医生/腹黑律师/创业精英）
            female_lead_type: 女主类型（random/职场新人/小透明/白富美）

        Yields:
            str: 生成的内容片段
        """
        if random_generate:
            prompt = self._build_random_world_setting_prompt(genre, male_lead_type, female_lead_type)
        else:
            prompt = self._build_world_setting_prompt(user_description)

        async for chunk in self.ai_provider.stream_generate(prompt):
            yield chunk

    def _build_world_setting_prompt(self, user_description: str) -> str:
        """构建都市言情小说世界观生成 Prompt

        Args:
            user_description: 用户简短描述

        Returns:
            str: 完整 Prompt
        """
        prompt = f"""
# 任务：生成都市言情小说世界观设定

## 用户输入
{user_description}

## 小说类型
都市言情（专注于都市爱情故事，职场背景）

## 输出要求
请生成完整的都市言情小说世界观设定，输出为 JSON 格式，包含以下字段：

### genre（小说类型）
- 固定值: "都市言情"

### background（背景设定）
- city: 城市名称（如上海、北京、深圳、杭州）
- workplace: 工作场所类型（如大型企业、创业公司、律师事务所、医院、设计公司）
- workplace_name: 具体公司/机构名称（虚构名称）

### male_lead（男主设定）⭐ 自由创意生成
- name: 姓名（现代风格，如林晨、陆远、张皓）
- identity: 自由定义的身份类型（可以是任何职业/身份，不限预设类型）
- age: 年龄（28-35岁）
- appearance: 外貌描述（不超过30字，如"冷峻英俊，眉眼深邃"）
- personality: 性格特点数组（3-5个，如["强势", "护短", "深情", "傲娇"]）
- wealth: 财富背景（自由定义）
- occupation: 具体职业

### female_lead（女主设定）⭐ 自由创意生成
- name: 姓名（现代风格，如苏晴、林婉、陈瑶）
- identity: 自由定义的身份类型（可以是任何职业/身份，不限预设类型）
- age: 年龄（22-26岁）
- appearance: 外貌描述（不超过30字，如"清秀甜美，气质温婉"）
- personality: 性格特点数组（3-5个，如["善良", "坚韧", "独立", "有些迷糊"]）
- background: 家庭背景（自由定义）
- occupation: 具体职业

### emotion_arc（感情线弧度）⭐ 自由创意设计
- stages: 感情阶段数组，请自由创意设计感情发展的完整路径（至少包含8个阶段）
- 建议：感情发展应有因果关系，从初遇到结局形成完整弧度

### main_conflict（主线冲突）⭐ 自由创意设计
- type: 自由定义的冲突类型（不限预设类型）
- description: 冲突描述（不超过50字）

### supporting_chars（配角列表）
至少包含 2 个配角，每个包含：
- role: 角色类型（如"情敌"、"闺蜜"、"兄弟"、"上司"、"前女友"）
- name: 姓名
- identity: 身份描述（不超过20字）
- relation_to_lead: 与男主/女主的关系

## 约束条件（必须遵守）
1. 男主必须有能力、有魅力、有感情弧度变化
2. 女主必须有独立性格、不是单纯依附男主
3. 感情线必须有完整的"误会→暧昧→甜蜜→波折→和解"弧度
4. 冲突必须能通过感情发展解决，不能是无解矛盾
5. 职场背景要真实可信，符合现代都市生活
6. 配角要服务于感情线发展

## 输出格式
输出严格遵循 JSON 结构，不要添加任何额外文字说明。
只输出JSON对象，不要包含markdown代码块标记。

## 写作风格指南（强制遵守）

### 人物设定风格
1. 男主姓名：现代感，2-3字，有气质
2. 女主姓名：现代感，2-3字，有柔美感
3. 外貌描述：简洁具体（≤30字），有画面感
4. 性格描述：用具体词汇而非抽象概念（如"护短"而非"有责任感"）

### 情感弧度要求
1. 每个阶段要明确，不能跳过关键阶段
2. 阶段要有因果关系（如"误会"导致"暧昧"的试探）
3. 波折要有明确原因（情敌/误会/家庭）
4. 结局要甜蜜圆满

## 示例对比（强制参考）⭐

### ✅ 好示例：男主设定
- name: "陆远"
- appearance: "冷峻英俊，眉眼深邃"（20字，简洁具体）
- personality: ["强势", "护短", "深情", "傲娇"]（具体词汇）

【分析】
- 外貌：20 字，简洁有画面感 ✅
- 性格：用"护短"而非"有责任感"，具体 ✅

### ❌ 坏示例：男主设定
- name: "陆远轩辰浩宇"
- appearance: "身材高大威猛，面容英俊潇洒，眼神深邃迷人，气质冷峻非凡，皮肤白皙如玉，五官精致完美"
- personality: ["有责任感", "有担当", "有能力", "有魅力", "有魄力"]

【分析】
- 姓名：过长，不符合现代感 ❌
- 外貌：超过 30 字，信息堆砌 ❌
- 性格：抽象概念，不具体 ❌

## 输出前自检（强制执行）

1. 【男主设定】姓名是否现代感？外貌是否简洁具体（≤30字）？
2. 【女主设定】性格是否有独立性？不是单纯依附男主？
3. 【感情弧度】是否包含全部8个阶段？顺序是否正确？
4. 【冲突设计】冲突是否可通过感情发展解决？
5. 【配角功能】配角是否服务于感情线发展？
6. 【职场背景】是否符合现代都市生活逻辑？

请确保以上检查全部通过后再输出。
"""
        return prompt

    def _build_random_world_setting_prompt(self, genre: str = "都市言情", male_lead_type: str = "random", female_lead_type: str = "random") -> str:
        """构建随机生成都市言情小说世界观 Prompt

        Args:
            genre: 小说类型，固定为"都市言情"
            male_lead_type: 男主类型（random 或具体类型，具体类型时强制使用）
            female_lead_type: 女主类型（random 或具体类型，具体类型时强制使用）

        Returns:
            str: 完整 Prompt
        """
        # 构建男主类型提示
        male_lead_hint = ""
        if male_lead_type != "random":
            male_lead_hint = f"""

⚠️ 【强制要求】男主类型已指定为 "{male_lead_type}"，必须使用此类型！"""

        # 构建女主类型提示
        female_lead_hint = ""
        if female_lead_type != "random":
            female_lead_hint = f"""

⚠️ 【强制要求】女主类型已指定为 "{female_lead_type}"，必须使用此类型！"""

        prompt = f"""
# 任务：随机生成都市言情小说世界观设定

## 小说类型
{genre}

{male_lead_hint}
{female_lead_hint}

## 输出要求
请自由创意生成一个完整的都市言情小说世界观设定。

### genre（小说类型）
- 固定值: "都市言情"

### background（背景设定）⭐ 自由创意生成
请自由创意生成背景设定：
- city: 自由选择现代都市城市（可以是国内外任何城市）
- workplace: 自由定义职场环境类型（可以是任何行业/机构类型）
- workplace_name: 虚构公司/机构名称

### male_lead（男主设定）⭐ 自由创意生成
请自由创意生成男主设定：
- name: 现代风格姓名（2-3字）
- identity: 自由定义的身份类型（可以是任何职业/身份，不限预设类型）
- age: 28-35岁
- appearance: 外貌描述（≤30字，简洁具体）
- personality: 性格特点数组（3-5个，用具体词汇而非抽象概念）
- wealth: 财富背景（自由定义）
- occupation: 具体职业

### female_lead（女主设定）⭐ 自由创意生成
请自由创意生成女主设定：
- name: 现代风格姓名（2-3字）
- identity: 自由定义的身份类型（可以是任何职业/身份，不限预设类型）
- age: 22-26岁
- appearance: 外貌描述（≤30字，简洁具体）
- personality: 性格特点数组（3-5个，用具体词汇而非抽象概念）
- background: 家庭背景（自由定义）
- occupation: 具体职业

### emotion_arc（感情线弧度）⭐ 自由创意生成
请自由创意设计感情线：
- stages: 感情阶段数组，请自由设计感情发展的完整路径（至少包含8个阶段）
- type: 自由定义的感情线类型（不限预设类型）

### main_conflict（主线冲突）⭐ 自由创意生成
请自由创意设计主线冲突：
- type: 自由定义的冲突类型（不限预设类型）
- description: 冲突描述（≤50字）

### supporting_chars（配角列表）⭐ 自由创意生成
自由创意生成 2-3 个配角：
- role: 自由定义的角色类型
- name: 姓名
- identity: 身份描述（≤20字）
- relation_to_lead: 与男主/女主关系

## 约束条件（必须遵守）
1. 男主必须有魅力、有能力、有感情变化
2. 女主必须有独立性格，不是依附男主
3. 感情线必须完整（包含从初遇到结局的完整路径）
4. 冲突必须可通过感情发展解决
5. 职场背景真实可信

## 输出格式
输出严格遵循 JSON 结构，不要添加任何额外文字说明。
只输出JSON对象，不要包含markdown代码块标记。

## 输出前自检（强制执行）

1. 【男主设定】姓名是否现代？外貌是否简洁（≤30字）？
2. 【女主设定】性格是否独立？
3. 【感情弧度】是否包含完整的感情发展路径？
4. 【冲突设计】冲突是否可解决？
5. 【配角功能】配角是否服务于感情线？
6. 【职场背景】是否符合都市生活？

请确保以上检查全部通过后再输出。
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

            # 更新meta状态（都市言情简化版，移除伏笔状态初始化）
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
        """构建都市言情小说大纲 Prompt（感情节奏表）

        Args:
            world_setting: 世界观设定（都市言情模板）
            characters: 人物库（可选）
            target_chapters: 目标章节数
            story_preference: 故事走向偏好
            pacing_preference: 节奏偏好

        Returns:
            str: 完整 Prompt
        """
        world_setting_str = json.dumps(world_setting, ensure_ascii=False, indent=2)
        characters_str = ""
        if characters:
            characters_str = json.dumps(characters, ensure_ascii=False, indent=2)

        # 计算每个感情阶段的章节数
        # 标准都市言情：50章 = 8阶段，每阶段约6章
        stage_chapters = target_chapters // 8

        prompt = f"""
# 任务：生成都市言情小说大纲（感情节奏表）

## 输入上下文

### 世界观设定
{world_setting_str}

### 人物库
{characters_str if characters_str else "（暂无人物设定，请从世界观设定中获取男主/女主信息）"}

### 用户期望
- 目标章节数: {target_chapters}
- 故事走向偏好: {story_preference}
- 节奏偏好: {pacing_preference}

## 输出要求
请生成完整的感情节奏表大纲，输出为 JSON 格式，包含以下字段：

### genre（小说类型）
- 固定值: "都市言情"

### emotion_arc（感情节奏表）⭐ 自由创意设计
感情节奏表，将目标章节数按 6 个感情阶段划分（参考框架）：

| 阶段 | 章节范围参考 | 感情阶段参考 | 说明 |
|------|----------|----------|----------|
| stage_1 | 1-{stage_chapters}章 | 初遇阶段 | 主角首次相遇，建立关系起点 |
| stage_2 | {stage_chapters+1}-{stage_chapters*2}章 | 暧昧阶段 | 感情萌芽，试探与互动 |
| stage_3 | {stage_chapters*2+1}-{stage_chapters*3}章 | 升温阶段 | 感情加深，关键时刻 |
| stage_4 | {stage_chapters*3+1}-{stage_chapters*4}章 | 甜蜜阶段 | 关系确立，甜蜜互动 |
| stage_5 | {stage_chapters*4+1}-{stage_chapters*6}章 | 波折阶段 | 遇到阻碍，感情考验 |
| stage_6 | {stage_chapters*6+1}-{target_chapters}章 | 结局阶段 | 解决问题，圆满收尾 |

⚠️ 以上表格仅为参考框架，请自由创意设计每个阶段的具体内容：

每个阶段包含：
- range: 章节范围（如"1-6"）
- stage: 自由定义的感情阶段名称
- emotion: 自由定义的情绪状态描述
- description: 自由创意撰写该阶段的感情发展概述（≤100字）

### sweet_points（爽点计划）⭐ 自由创意设计
请自由创意设计关键爽点，建议每 5 章安排 1 个爽点：

每个爽点包含：
- chapter: 章节号
- type: 自由定义的爽点类型
- detail: 自由创意撰写详细描述（≤50字）
- emotion_level: 感情强度等级（1-10）

### chapters（章节规划）
为前 20 章生成详细规划，每章包含：
- chapter_num: 章节号
- title: 章节标题（≤15字，有画面感）
- emotion_stage: 本章感情阶段（对应 emotion_arc）
- key_events: 核心事件列表（每章 1-2 个，≤20字）
- emotion_progress: 感情进展描述（≤30字）
- sweet_point: 是否为爽点章节（true/false）

### main_conflict（主线冲突详情）
从世界观中获取冲突信息并扩展：
- type: 冲突类型
- description: 冲突描述
- resolve_chapter: 冲突解决章节（在 stage_5 或 stage_6）

## 约束条件（红线规则，必须遵守）
1. 感情节奏必须包含完整的感情发展路径（至少 6 个阶段）
2. 爽点密度：建议每 5 竂至少 1 个爽点
3. 章节标题必须有画面感（如"雨夜相遇"而非"第一章"）
4. 感情进展必须有因果关系，不能跳跃式进展
5. 波折必须有明确原因
6. 结局必须圆满
7. 每章感情阶段必须明确标注

## 输出格式
输出严格遵循 JSON 结构，不要添加任何额外文字说明。
只输出JSON对象，不要包含markdown代码块标记。

## 章节标题示例（仅供参考）
- 初遇阶段：雨夜相遇、电梯惊魂、咖啡厅误会
- 暧昧阶段：深夜加班、意外拥抱、共进晚餐
- 表白阶段：月光告白、医院守护、醉酒真心
- 甜蜜阶段：周末约会、海边度假、生日惊喜
- 波折阶段：情敌出现、误会加深、家庭阻力
- 和解阶段：真相大白、机场挽留、求婚时刻

## 章节标题示例对比（强制参考）⭐

### ✅ 好示例：章节标题
- 第1章："雨夜相遇"（4字，有画面感）
- 第5章："深夜加班"（4字，有场景）
- 第15章："月光告白"（4字，有氛围）

【分析】
- 每个标题 ≤15 字 ✅
- 有具体画面/场景 ✅
- 感情阶段可见 ✅

### ❌ 坏示例：章节标题
- 第1章："第一章：男主女主第一次见面产生误会"
- 第5章："第五章：两人因为工作原因加班到深夜"
- 第15章："第十五章：男主在月光下向女主表白"

【分析】
- 标题过长（>15字） ❌
- 无画面感，只是事件描述 ❌
- 格式重复 ❌

## 输出前自检（强制执行）

1. 【感情节奏】是否包含完整的感情发展路径？每个阶段章节数是否合理？
2. 【爽点密度】是否每 5 竂至少 1 个爽点？
3. 【章节标题】是否全部有画面感（≤15字）？
4. 【感情进展】是否有因果关系？不能跳跃式进展
5. 【波折原因】是否有明确的波折触发原因？
6. 【结局设置】是否为圆满结局？
7. 【感情标注】每章是否标注了感情阶段？

请确保以上检查全部通过后再输出。
"""
        return prompt

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

            # 更新meta（都市言情简化版，移除状态追踪）
            self._update_meta_after_chapter(novel_id, chapter_num, chapter.get("word_count", 0))

        return chapter

    async def stream_generate_chapter(
        self,
        novel_id: str,
        chapter_num: int,
        user_special_request: Optional[str] = None,
        outline_context: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[str, None]:
        """流式生成章节内容

        Args:
            novel_id: 小说ID
            chapter_num: 章节号
            user_special_request: 用户特别要求（可选）
            outline_context: 大纲上下文（前端传递，可选）

        Yields:
            str: 生成的内容片段
        """
        # 加载所有上下文
        context = self._load_chapter_context(novel_id, chapter_num)

        # 构建Prompt（传递 outline_context）
        prompt = self._build_chapter_prompt(
            context,
            chapter_num,
            user_special_request,
            outline_context  # 传递大纲上下文给 _build_chapter_prompt
        )

        async for chunk in self.ai_provider.stream_generate(prompt):
            yield chunk

    def _load_chapter_context(self, novel_id: str, chapter_num: int) -> Dict[str, Any]:
        """加载章节生成所需的上下文（都市言情简化版）

        Args:
            novel_id: 小说ID
            chapter_num: 章节号

        Returns:
            Dict: 上下文数据
        """
        context = {}

        # 1. 世界观设定（男主/女主/感情线）
        context["world_setting"] = self.storage.load_json(novel_id, "world_setting.json")

        # 2. 人物库
        context["characters"] = self.storage.load_json(novel_id, "characters.json")

        # 3. 大纲（感情节奏表 + 当前章节）
        outline = self.storage.load_json(novel_id, "outline.json")
        context["outline"] = outline
        if outline:
            for ch in outline.get("chapters", []):
                if ch.get("chapter_num") == chapter_num:
                    context["current_chapter_outline"] = ch
                    break

        # 4. 上一章内容（如有）
        if chapter_num > 1:
            context["previous_chapter"] = self.storage.load_json(
                novel_id,
                f"chapters/chapter_{chapter_num - 1:03d}.json"
            )

        # 都市言情简化版：移除时间线/人物状态/伏笔加载

        return context

    def _build_chapter_prompt(
        self,
        context: Dict[str, Any],
        chapter_num: int,
        user_special_request: Optional[str] = None,
        outline_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """构建都市言情小说章节续写 Prompt（聚焦感情线和爽点）

        Args:
            context: 上下文数据
            chapter_num: 章节号
            user_special_request: 用户特别要求
            outline_context: 大纲上下文（前端传递，包含当前章节的大纲信息）

        Returns:
            str: 完整 Prompt
        """
        # 处理大纲上下文（前端传递的 outline_context 优先）
        # outline_context 格式：{title, key_events, emotion_stage, emotion_progress}
        if outline_context:
            # 前端传递的大纲上下文，直接使用
            current_outline = outline_context
            context["current_chapter_outline"] = outline_context
        else:
            # 从 context 中获取当前章节大纲
            current_outline = context.get("current_chapter_outline", {})

        # 序列化上下文
        world_setting_str = json.dumps(context.get("world_setting", {}), ensure_ascii=False, indent=2)
        characters_str = json.dumps(context.get("characters", {}), ensure_ascii=False, indent=2)
        current_outline_str = json.dumps(current_outline, ensure_ascii=False, indent=2)

        # 获取感情阶段和爽点信息
        emotion_stage = current_outline.get("emotion_stage", "未知阶段")
        is_sweet_point = current_outline.get("sweet_point", False)

        # 构建大纲注入部分（强制参考）⭐
        outline_injection = ""
        if outline_context:
            # 格式化核心事件列表
            key_events = outline_context.get("key_events", [])
            events_formatted = ""
            if key_events:
                for i, event in enumerate(key_events, 1):
                    events_formatted += f"  {i}. {event}\n"
            else:
                events_formatted = "  （未设定）\n"

            outline_injection = f"""
## 当前章节大纲（强制参考）⭐

### 章节标题
{outline_context.get('title', '未设定')}

### 核心事件（必须覆盖60%以上）
{events_formatted}
### 感情阶段
{outline_context.get('emotion_stage', '未设定')}

### 感情进度描述
{outline_context.get('emotion_progress', '未设定')}

【红线】生成内容必须体现上述事件和感情阶段设定。
"""

        previous_chapter_str = ""
        prev_chapter = context.get("previous_chapter")
        if prev_chapter:
            # 只取摘要和最后500字作为参考
            prev_summary = prev_chapter.get("summary", {})
            prev_content_preview = prev_chapter.get("content", "")[-500:] if prev_chapter.get("content") else ""
            previous_chapter_str = json.dumps({
                "summary": prev_summary,
                "content_preview": prev_content_preview,
                "emotion_stage": prev_chapter.get("emotion_stage", ""),
                "word_count": prev_chapter.get("word_count", 0)
            }, ensure_ascii=False, indent=2)

        user_request_str = user_special_request if user_special_request else "无特别要求，按大纲生成即可"

        # 判断爽点类型提示
        sweet_point_hint = ""
        if is_sweet_point:
            sweet_point_hint = """
⚠️ 【本章是爽点章节】必须包含明确的爽点场景！

爽点场景要求：
1. 必须有强烈的情感冲击（心动/心动/甜蜜/心动/心动）
2. 必须有具体的互动描写（对话+动作+神态）
3. 爽点场景篇幅占比不低于30%

爽点类型参考：
- 偶遇救场：男主替女主解围，女主心动
- 表白/亲吻：男主表白或亲吻女主，感情突破
- 约会/甜蜜：约会场景，甜蜜互动
- 挽留/解释：波折后挽留，感情加深
- 求婚/结局：求婚场景，大团圆
"""

        prompt = f"""
# 任务：续写都市言情小说章节

## 输入上下文

### 世界观设定（男主/女主/感情线）
{world_setting_str}

### 人物库
{characters_str}

### 当前章节大纲（感情节奏表）
{current_outline_str}

**当前感情阶段**: {emotion_stage}

{sweet_point_hint}

{outline_injection}

### 上一章内容（如有）
{previous_chapter_str if previous_chapter_str else "这是第一章，无上一章内容"}

### 用户特别要求
{user_request_str}

## 输出要求
请续写第 {chapter_num} 章，输出为 JSON 格式，包含以下字段：

### content（正文内容）⭐ 核心
- 完整的叙事内容，约 2000-3000 字
- 必须聚焦感情线发展
- 必须符合当前感情阶段（{emotion_stage}）
- 必须有男主和女主的互动场景
- 语言风格：现代都市言情风格

### 感情线描写要求（强制遵守）
1. **感情阶段明确**：本章必须属于"{emotion_stage}"阶段
2. **感情进展**：必须有感情变化描写（心动/心动/心动/心动）
3. **互动场景**：男主和女主必须有对话或互动场景
4. **情感描写**：用动作/神态/心理表现，禁止直接说"她心动了"

{f"5. **爽点场景**：本章是爽点章节，必须有明确的爽点场景（篇幅≥30%）" if is_sweet_point else ""}

### summary（章节摘要）
- key_events: 本章核心事件列表（1-2个）
- emotion_stage: 本章感情阶段
- emotion_progress: 感情进展描述（≤30字）
- sweet_point: 是否为爽点章节
- emotional_tone: 本章情感基调

### chapter_info（章节信息）
- chapter_num: 章节号
- title: 章节标题（≤15字，有画面感）
- emotion_stage: 感情阶段
- word_count: 字数（自动计算）

## 约束条件（红线规则，必须遵守）
1. **感情线优先**：每章必须有感情进展描写，不能只写职场/日常
2. **互动必须有**：男主和女主必须有对话或互动场景
3. **感情连续**：感情变化必须有因果关系，不能跳跃式进展
4. **爽点必写**：爽点章节必须有明确的爽点场景（篇幅≥30%）
5. **风格统一**：现代都市言情风格，禁止文言/网络用语混用
6. **称呼一致**：男主/女主称呼固定，不能随意变化

## 写作风格指南（都市言情专属）

### 对话+动作描写（强制遵守）
每段对话必须配有动作或神态描写：

示例格式：
```
"你怎么来了？"她有些惊讶，手里的文件差点掉落。
"路过，顺便来看看。"他靠在门边，目光在她身上停留了一秒。
```

禁止格式（连续对话无动作）：
```
"你怎么来了？"
"路过，顺便来看看。"
"哦，那你好忙。"
"嗯，刚下班。"
```

### 感情描写规则
1. 心动描写：用心跳加速、脸红、不敢直视等表现
2. 甜蜜描写：用牵手、拥抱、亲吻等具体动作表现
3. 暧昧描写：用试探、暗示、眼神交流等表现
4. 禁止直接描述：不说"她心动了"，说"她的心跳莫名加快了"

### 场景描写规则
1. 职场场景：不超过 50 字的环境描写
2. 约会场景：不超过 100 字的环境描写
3. 重点场景（爽点）：可详细描写，营造氛围

### 段落结构规则
1. 段落长度：100-200 字
2. 段落过渡：每段开头有衔接词（转眼间/随后/与此同时）
3. 段落节奏：感情描写为主，职场描写为辅

## 示例对比（强制参考）⭐⭐⭐ 最重要

### ✅ 好示例：段落描写

她抬头看他，心跳莫名加快了。办公室里只剩下他们两个人，空调的嗡嗡声在安静中格外清晰。

"文件整理好了？"他问，目光在她脸上停留了一秒。

"嗯，都在桌上。"她把文件夹递过去，手指碰到他的手背，触感冰凉。

【分析】
- 信息密度：每句 1-2 信息点 ✅
- 句子长度：15-25 字 ✅
- 对话+动作：每句对话配动作描写 ✅
- 情感描写：用"心跳加快"表现心动，不直接说 ✅

### ❌ 坏示例：段落描写

她整理完文件后心跳加速地走到他面前，将文件夹递给他后手指碰到他的手背感到冰凉的触感，办公室只剩下他们两个人空调嗡嗡声格外清晰，她抬头看他心跳莫名加快了他问文件整理好了吗目光在她脸上停留了一秒她嗯都在桌上把文件夹递过去。

【分析】
- 信息密度：一句话 6 个信息点 ❌
- 句子长度：超过 80 字 ❌
- 对话+动作：对话无动作描写 ❌
- 情感描写：直接说"心跳加速"，缺乏文学性 ❌

## 输出格式
输出严格遵循 JSON 结构，不要添加任何额外文字说明。
只输出JSON对象，不要包含markdown代码块标记。

## 输出前自检（强制执行）

1. 【感情阶段】是否明确标注了感情阶段？
2. 【感情进展】是否有感情变化描写？
3. 【互动场景】是否有男主女主的对话/互动？
4. 【对话+动作】每段对话是否配有动作描写？
5. 【感情描写】是否用动作表现而非直接描述？
6. 【爽点场景】（如为爽点章节）是否有明确的爽点场景？
7. 【称呼一致】男主女主称呼是否固定？
8. 【段落过渡】每段开头是否有衔接词？

请确保以上检查全部通过后再输出。
"""
        return prompt

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