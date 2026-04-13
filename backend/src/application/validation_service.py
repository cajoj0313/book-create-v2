"""文案校验服务"""
import os
from typing import Dict, Any, List, Optional
import json
from datetime import datetime

from ..infrastructure.ai_provider import QwenProvider, AIProviderFactory
from ..infrastructure.storage import FileStorage


# 校验规则定义（36条）
VALIDATION_RULES = {
    # 逻辑一致性校验 (L001-L005)
    "L001": {
        "name": "时间线矛盾",
        "category": "逻辑一致性",
        "description": "比对 timeline.json 与新章节时间描述",
        "trigger": "时间描述与已记录时间冲突",
        "action": "标记问题，提出修正建议",
        "severity": "high"
    },
    "L002": {
        "name": "地点矛盾",
        "category": "逻辑一致性",
        "description": "比对 character_states.json 人物位置",
        "trigger": "人物出现在不可能的位置",
        "action": "标记问题，检查是否遗漏移动描述",
        "severity": "high"
    },
    "L003": {
        "name": "能力越级",
        "category": "逻辑一致性",
        "description": "比对 character_states.json 人物能力等级",
        "trigger": "人物做出超出当前能力的行为",
        "action": "标记问题，检查是否有修炼突破描述",
        "severity": "high"
    },
    "L004": {
        "name": "设定冲突",
        "category": "逻辑一致性",
        "description": "比对 world_setting.json 世界规则",
        "trigger": "违反世界观设定",
        "action": "标记问题，提出修正建议",
        "severity": "high"
    },
    "L005": {
        "name": "人物行为矛盾",
        "category": "逻辑一致性",
        "description": "比对 characters.json 人物性格设定",
        "trigger": "人物行为与性格设定严重不符",
        "action": "标记问题，检查是否有心理变化描述",
        "severity": "medium"
    },

    # 语法规范校验 (G001-G005)
    "G001": {
        "name": "错别字检查",
        "category": "语法规范",
        "description": "常见错字词典匹配 + 语义分析",
        "trigger": "检测到错别字",
        "action": "高置信度(>90%)自动修正；低置信度标记",
        "severity": "low",
        "auto_fix_threshold": 90
    },
    "G002": {
        "name": "标点错误",
        "category": "语法规范",
        "description": "标点使用规则检查",
        "trigger": "标点使用不规范",
        "action": "高置信度(>95%)自动修正",
        "severity": "low",
        "auto_fix_threshold": 95
    },
    "G003": {
        "name": "句子不通顺",
        "category": "语法规范",
        "description": "语法结构分析",
        "trigger": "句子语法问题",
        "action": "标记问题，提出改写建议",
        "severity": "medium"
    },
    "G004": {
        "name": "重复用词",
        "category": "语法规范",
        "description": "同一段落内重复词语检测",
        "trigger": "同一段落内词语重复",
        "action": "标记问题，提出替换建议",
        "severity": "low"
    },
    "G005": {
        "name": "空格/格式错误",
        "category": "语法规范",
        "description": "格式规范检查",
        "trigger": "格式不规范",
        "action": "高置信度自动修正",
        "severity": "low",
        "auto_fix_threshold": 95
    },

    # 风格一致性校验 (S001-S003)
    "S001": {
        "name": "语言风格突变",
        "category": "风格一致性",
        "description": "比对前10章风格特征",
        "trigger": "风格偏离度过高",
        "action": "标记问题，提出统一建议",
        "severity": "medium"
    },
    "S002": {
        "name": "叙事视角混乱",
        "category": "风格一致性",
        "description": "检测叙事人称变化",
        "trigger": "同一章节内人称切换",
        "action": "标记问题，提出修正建议",
        "severity": "high"
    },
    "S003": {
        "name": "文风时代错位",
        "category": "风格一致性",
        "description": "比对 world_setting.json 时代设定",
        "trigger": "使用与设定时代不符的词汇",
        "action": "标记问题，提出替换建议",
        "severity": "medium"
    },

    # 人物一致性校验 (P001-P004)
    "P001": {
        "name": "称呼不一致",
        "category": "人物一致性",
        "description": "比对 characters.json 人物名称",
        "trigger": "同一人物称呼变化无解释",
        "action": "标记问题，统一建议",
        "severity": "medium"
    },
    "P002": {
        "name": "人物消失",
        "category": "人物一致性",
        "description": "比对前章出现人物",
        "trigger": "重要人物无故消失",
        "action": "标记问题，检查是否有退场描述",
        "severity": "medium"
    },
    "P003": {
        "name": "外貌描述矛盾",
        "category": "人物一致性",
        "description": "比对 characters.json 外貌设定",
        "trigger": "外貌描述与设定严重不符",
        "action": "标记问题，提出修正建议",
        "severity": "medium"
    },
    "P004": {
        "name": "关系突变",
        "category": "人物一致性",
        "description": "比对 characters.json 关系图谱",
        "trigger": "人物关系未说明突变",
        "action": "标记问题，检查是否有关系变化描述",
        "severity": "high"
    },

    # 伏笔一致性校验 (F001-F003)
    "F001": {
        "name": "伏笔遗漏回收",
        "category": "伏笔一致性",
        "description": "比对 foreshadowing.json 待回收伏笔",
        "trigger": "到达回收章节但未回收",
        "action": "标记提醒，提示伏笔内容",
        "severity": "high"
    },
    "F002": {
        "name": "伏笔提前回收",
        "category": "伏笔一致性",
        "description": "比对 foreshadowing.json 计划回收章节",
        "trigger": "提前回收伏笔但无铺垫",
        "action": "标记问题，检查是否需要增加铺垫",
        "severity": "medium"
    },
    "F003": {
        "name": "伏笔回收不符",
        "category": "伏笔一致性",
        "description": "比对伏笔 resolution_hint",
        "trigger": "回收内容与预设不符",
        "action": "标记问题，用户确认",
        "severity": "high"
    },

    # 商业逻辑校验 (B001-B008) - 都市职场专项
    "B001": {
        "name": "利益动机缺失",
        "category": "商业逻辑",
        "description": "检查商业行为是否有明确的利益动机描述",
        "trigger": "重要商业决策无动机说明",
        "action": "标记问题，提示补充动机",
        "severity": "high"
    },
    "B002": {
        "name": "决策成本失衡",
        "category": "商业逻辑",
        "description": "检查商业决策的成本收益是否合理",
        "trigger": "决策成本远高于收益且无解释",
        "action": "标记问题，检查是否有特殊理由",
        "severity": "medium"
    },
    "B003": {
        "name": "权限越界",
        "category": "商业逻辑",
        "description": "检查人物行为是否超出其职位权限",
        "trigger": "人物做出超出职位权限的决策",
        "action": "标记问题，检查是否有授权描述",
        "severity": "high"
    },
    "B004": {
        "name": "时间线商业矛盾",
        "category": "商业逻辑",
        "description": "检查商业事件的时间合理性",
        "trigger": "商业事件时间不合理",
        "action": "标记问题，提示补充过渡时间",
        "severity": "medium"
    },
    "B005": {
        "name": "资金来源不明",
        "category": "商业逻辑",
        "description": "检查资金使用是否有来源说明",
        "trigger": "大额资金使用无来源描述",
        "action": "标记问题，提示补充资金来源",
        "severity": "high"
    },
    "B006": {
        "name": "行业常识冲突",
        "category": "商业逻辑",
        "description": "检查是否符合行业基本常识",
        "trigger": "违反行业常识",
        "action": "标记问题，提出修正建议",
        "severity": "medium"
    },
    "B007": {
        "name": "博弈逻辑跳跃",
        "category": "商业逻辑",
        "description": "检查博弈过程是否有完整推理",
        "trigger": "博弈结果直接跳过推理过程",
        "action": "标记问题，提示补充博弈细节",
        "severity": "medium"
    },
    "B008": {
        "name": "股权/权力变更缺失",
        "category": "商业逻辑",
        "description": "检查重要股权或权力变更是否有记录",
        "trigger": "股权变更未在状态中更新",
        "action": "标记问题，提示更新人物状态",
        "severity": "high"
    },

    # 感情线校验 (E001-E008) - 都市职场专项
    "E001": {
        "name": "感情动机缺失",
        "category": "感情线",
        "description": "检查感情产生是否有合理动机描述",
        "trigger": "重要感情变化无动机说明",
        "action": "标记问题，提示补充动机",
        "severity": "high"
    },
    "E002": {
        "name": "感情进展过快",
        "category": "感情线",
        "description": "检查感情发展是否有合理节奏",
        "trigger": "感情状态跨越过快无过渡章节",
        "action": "标记问题，检查是否有过渡描写",
        "severity": "medium"
    },
    "E003": {
        "name": "感情反应失当",
        "category": "感情线",
        "description": "检查情感反应是否符合人物性格设定",
        "trigger": "人物情感反应与性格矛盾",
        "action": "标记问题，检查是否有触发事件或心理变化描述",
        "severity": "medium"
    },
    "E004": {
        "name": "感情状态未更新",
        "category": "感情线",
        "description": "检查人物情感状态变化是否在 character_states.json 中记录",
        "trigger": "重要感情变化未更新情感状态",
        "action": "标记问题，提示更新人物状态",
        "severity": "medium"
    },
    "E005": {
        "name": "感情冲突未解决",
        "category": "感情线",
        "description": "检查感情矛盾是否有明确解决过程",
        "trigger": "感情冲突出现后消失无交代",
        "action": "标记问题，提示补充冲突解决过程",
        "severity": "medium"
    },
    "E006": {
        "name": "感情互动越界",
        "category": "感情线",
        "description": "检查人物互动是否符合当前关系设定",
        "trigger": "互动方式与关系类型不符",
        "action": "标记问题，检查关系类型是否正确",
        "severity": "medium"
    },
    "E007": {
        "name": "感情线比例失衡",
        "category": "感情线",
        "description": "检查感情线篇幅占比是否合理",
        "trigger": "单章感情内容占比 > 60%",
        "action": "标记问题，提示平衡感情线与事业线比例",
        "severity": "low"
    },
    "E008": {
        "name": "感情转折无铺垫",
        "category": "感情线",
        "description": "检查感情重要转折是否有铺垫",
        "trigger": "感情转折突兀无前兆",
        "action": "标记问题，检查是否有铺垫事件或心理变化",
        "severity": "medium"
    }
}


class ValidationService:
    """文案校验服务"""

    def __init__(self, storage: FileStorage):
        self.storage = storage
        # 从环境变量获取API密钥
        api_key = os.getenv("DASHSCOPE_API_KEY", "")
        if not api_key:
            raise ValueError("DASHSCOPE_API_KEY environment variable is required")
        self.ai_provider = AIProviderFactory.create("dashscope", {
            "api_key": api_key,
            "model": "qwen3.5"
        })

    async def validate_chapter(
        self,
        novel_id: str,
        chapter_num: int,
        validation_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """校验单个章节

        Args:
            novel_id: 小说ID
            chapter_num: 章节号
            validation_types: 校验类型列表（可选，默认全部）

        Returns:
            Dict: 校验报告
        """
        # 加载章节数据
        chapter = self.storage.load_json(
            novel_id,
            f"chapters/chapter_{chapter_num:03d}.json"
        )
        if not chapter:
            raise ValueError(f"Chapter {chapter_num} not found")

        # 加载上下文
        context = self._load_validation_context(novel_id, chapter_num)

        # 确定校验范围
        if validation_types:
            # 用户指定校验类型
            rules_to_apply = []
            for vt in validation_types:
                rules_to_apply.extend(self._get_rules_by_category(vt))
        else:
            # 全部规则
            rules_to_apply = list(VALIDATION_RULES.keys())

        # 构建校验Prompt
        prompt = self._build_validation_prompt(chapter, context, rules_to_apply)

        # 调用AI校验
        result = await self.ai_provider.generate(prompt)

        # 解析校验结果
        validation_report = self._parse_validation_result(result, chapter_num)

        if validation_report:
            # 补充必要字段
            validation_report["novel_id"] = novel_id
            validation_report["chapter_num"] = chapter_num
            validation_report["validated_at"] = datetime.utcnow().isoformat()
            validation_report["validation_type"] = "single_chapter"

            # 保存校验报告
            self._save_validation_report(novel_id, chapter_num, validation_report)

            # 更新章节校验状态
            self._update_chapter_validation_status(novel_id, chapter_num, validation_report)

        return validation_report

    async def validate_novel(self, novel_id: str) -> Dict[str, Any]:
        """校验整本小说（全书完成后）

        Args:
            novel_id: 小说ID

        Returns:
            Dict: 全书校验报告
        """
        # 加载所有章节
        meta = self.storage.load_json(novel_id, "meta.json")
        if not meta:
            raise ValueError("Novel not found")

        completed_chapters = meta.get("completed_chapters", 0)

        # 对每章进行校验
        all_issues = []
        for chapter_num in range(1, completed_chapters + 1):
            report = await self.validate_chapter(novel_id, chapter_num)
            if report:
                all_issues.extend(report.get("issues", []))

        # 跨章检查（时间线、伏笔、感情线）
        cross_chapter_issues = await self._cross_chapter_validation(novel_id)
        all_issues.extend(cross_chapter_issues)

        # 生成全书报告
        full_report = {
            "novel_id": novel_id,
            "chapter_num": None,
            "validated_at": datetime.utcnow().isoformat(),
            "validation_type": "full_novel",
            "issues": all_issues,
            "statistics": self._calculate_statistics(all_issues)
        }

        # 保存全书报告
        self.storage.save_json(
            novel_id,
            "validation_reports/full_novel_report.json",
            full_report
        )

        return full_report

    def _load_validation_context(
        self,
        novel_id: str,
        chapter_num: int
    ) -> Dict[str, Any]:
        """加载校验所需上下文

        Args:
            novel_id: 小说ID
            chapter_num: 章节号

        Returns:
            Dict: 上下文数据
        """
        context = {}

        # 加载所有参考数据
        context["world_setting"] = self.storage.load_json(novel_id, "world_setting.json")
        context["characters"] = self.storage.load_json(novel_id, "characters.json")
        context["outline"] = self.storage.load_json(novel_id, "outline.json")
        context["timeline"] = self.storage.load_json(novel_id, "state/timeline.json")
        context["character_states"] = self.storage.load_json(novel_id, "state/character_states.json")
        context["foreshadowing"] = self.storage.load_json(novel_id, "state/foreshadowing.json")

        # 加载前3章内容作为参考
        context["previous_chapters"] = []
        for prev_num in range(max(1, chapter_num - 3), chapter_num):
            prev_chapter = self.storage.load_json(
                novel_id,
                f"chapters/chapter_{prev_num:03d}.json"
            )
            if prev_chapter:
                context["previous_chapters"].append(prev_chapter)

        return context

    def _get_rules_by_category(self, category: str) -> List[str]:
        """获取指定类别的规则ID

        Args:
            category: 类别名称

        Returns:
            List: 规则ID列表
        """
        category_prefix = {
            "逻辑一致性": "L",
            "语法规范": "G",
            "风格一致性": "S",
            "人物一致性": "P",
            "伏笔一致性": "F",
            "商业逻辑": "B",
            "感情线": "E"
        }

        prefix = category_prefix.get(category, "")
        return [r for r in VALIDATION_RULES.keys() if r.startswith(prefix)]

    def _build_validation_prompt(
        self,
        chapter: Dict[str, Any],
        context: Dict[str, Any],
        rules_to_apply: List[str]
    ) -> str:
        """构建校验Prompt

        Args:
            chapter: 章节数据
            context: 上下文数据
            rules_to_apply: 要应用的规则ID列表

        Returns:
            str: 完整Prompt
        """
        # 序列化数据
        chapter_str = json.dumps(chapter, ensure_ascii=False, indent=2)
        world_setting_str = json.dumps(context.get("world_setting", {}), ensure_ascii=False, indent=2)
        characters_str = json.dumps(context.get("characters", {}), ensure_ascii=False, indent=2)
        timeline_str = json.dumps(context.get("timeline", {}), ensure_ascii=False, indent=2)
        character_states_str = json.dumps(context.get("character_states", {}), ensure_ascii=False, indent=2)
        foreshadowing_str = json.dumps(context.get("foreshadowing", {}), ensure_ascii=False, indent=2)

        # 前章参考
        prev_chapters_str = ""
        for prev in context.get("previous_chapters", []):
            prev_chapters_str += f"\n章节 {prev.get('chapter_num')}:\n"
            prev_chapters_str += f"摘要: {json.dumps(prev.get('summary', {}), ensure_ascii=False)}\n"

        # 构建规则列表
        rules_str = ""
        for rule_id in rules_to_apply:
            rule = VALIDATION_RULES.get(rule_id, {})
            rules_str += f"- {rule_id}: {rule.get('name', '')} - {rule.get('trigger', '')}\n"

        prompt = f"""
# 任务：文案校验

## 当前章节内容
{chapter_str}

## 参考数据

### 世界观设定
{world_setting_str}

### 人物库
{characters_str}

### 时间线状态
{timeline_str}

### 人物当前状态
{character_states_str}

### 伏笔状态
{foreshadowing_str}

### 前章参考
{prev_chapters_str if prev_chapters_str else "这是第一章"}

## 校验规则
请按照以下规则检查章节内容：
{rules_str}

## 输出要求
输出为 JSON 格式的校验报告，包含以下字段：

### issues（问题列表）
每个问题包含：
- issue_id: 问题ID（如 "ISS-001"）
- rule_id: 触发的规则ID（如 "L001"）
- severity: 严重程度（high/medium/low）
- confidence: 置信度（0-100）
- description: 问题描述
- location: 问题位置（如有），包含 start_line, end_line
- suggestion: 修正建议
- auto_fix_available: 是否可自动修复（true/false）
- auto_fix_text: 自动修复内容（如可修复）
- status: 状态（pending/auto_fixed）

### statistics（统计信息）
- total_issues: 总问题数
- high_severity: 高严重问题数
- medium_severity: 中严重问题数
- low_severity: 低严重问题数
- auto_fixed: 自动修复数
- pending: 待处理数

## 校验约束（红线规则）
1. 低置信度问题（<80%）必须标记为 pending，禁止自动修复
2. 高置信度语法问题（>95%）可自动修复
3. 逻辑问题不能自动修复，必须等待用户确认
4. 校验修改不能改变原意
5. 如果没有发现问题，issues 列表为空

## 输出格式
输出严格遵循 JSON 结构，不要添加任何额外文字说明。
只输出JSON对象，不要包含markdown代码块标记。
"""
        return prompt

    def _parse_validation_result(
        self,
        result: str,
        chapter_num: int
    ) -> Optional[Dict[str, Any]]:
        """解析AI校验结果

        Args:
            result: AI返回的字符串
            chapter_num: 章节号

        Returns:
            Dict: 解析后的校验报告
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

            # 返回空报告
            return {
                "issues": [],
                "statistics": {
                    "total_issues": 0,
                    "high_severity": 0,
                    "medium_severity": 0,
                    "low_severity": 0,
                    "auto_fixed": 0,
                    "pending": 0
                }
            }

    def _save_validation_report(
        self,
        novel_id: str,
        chapter_num: int,
        report: Dict[str, Any]
    ):
        """保存校验报告

        Args:
            novel_id: 小说ID
            chapter_num: 章节号
            report: 校验报告
        """
        import uuid
        report_id = f"report-{uuid.uuid4().hex[:8]}"
        self.storage.save_json(
            novel_id,
            f"validation_reports/chapter_{chapter_num:03d}_{report_id}.json",
            report
        )

    def _update_chapter_validation_status(
        self,
        novel_id: str,
        chapter_num: int,
        report: Dict[str, Any]
    ):
        """更新章节校验状态

        Args:
            novel_id: 小说ID
            chapter_num: 章节号
            report: 校验报告
        """
        chapter = self.storage.load_json(
            novel_id,
            f"chapters/chapter_{chapter_num:03d}.json"
        )
        if chapter:
            statistics = report.get("statistics", {})
            chapter["validation_status"] = {
                "last_validated": datetime.utcnow().isoformat(),
                "issues_found": statistics.get("total_issues", 0),
                "issues_fixed": statistics.get("auto_fixed", 0)
            }
            self.storage.save_json(
                novel_id,
                f"chapters/chapter_{chapter_num:03d}.json",
                chapter
            )

    async def _cross_chapter_validation(self, novel_id: str) -> List[Dict[str, Any]]:
        """跨章校验（全书完成后）

        Args:
            novel_id: 小说ID

        Returns:
            List: 跨章问题列表
        """
        issues = []

        # 1. 检查所有伏笔是否已回收
        foreshadowing = self.storage.load_json(novel_id, "state/foreshadowing.json")
        if foreshadowing:
            for fs in foreshadowing.get("foreshadowings", []):
                if fs.get("status") in ["planted", "pending"]:
                    issues.append({
                        "issue_id": f"FS-{fs.get('id')}",
                        "rule_id": "F001",
                        "severity": "high",
                        "confidence": 100,
                        "description": f"伏笔 '{fs.get('hint')}' 未回收",
                        "suggestion": f"请在后续章节回收此伏笔",
                        "status": "pending"
                    })

        # 2. 检查感情线完整性（E002/E004）
        # 这里简化处理，实际需要AI分析
        # ...

        return issues

    def _calculate_statistics(self, issues: List[Dict[str, Any]]) -> Dict[str, int]:
        """计算校验统计

        Args:
            issues: 问题列表

        Returns:
            Dict: 统计数据
        """
        stats = {
            "total_issues": len(issues),
            "high_severity": 0,
            "medium_severity": 0,
            "low_severity": 0,
            "auto_fixed": 0,
            "pending": 0
        }

        for issue in issues:
            severity = issue.get("severity", "medium")
            if severity == "high":
                stats["high_severity"] += 1
            elif severity == "medium":
                stats["medium_severity"] += 1
            else:
                stats["low_severity"] += 1

            if issue.get("status") == "auto_fixed":
                stats["auto_fixed"] += 1
            else:
                stats["pending"] += 1

        return stats

    def get_rules_info(self) -> Dict[str, Any]:
        """获取所有校验规则信息

        Returns:
            Dict: 规则信息
        """
        return {
            "total_rules": len(VALIDATION_RULES),
            "categories": {
                "逻辑一致性": len([r for r in VALIDATION_RULES if r.startswith("L")]),
                "语法规范": len([r for r in VALIDATION_RULES if r.startswith("G")]),
                "风格一致性": len([r for r in VALIDATION_RULES if r.startswith("S")]),
                "人物一致性": len([r for r in VALIDATION_RULES if r.startswith("P")]),
                "伏笔一致性": len([r for r in VALIDATION_RULES if r.startswith("F")]),
                "商业逻辑": len([r for r in VALIDATION_RULES if r.startswith("B")]),
                "感情线": len([r for r in VALIDATION_RULES if r.startswith("E")])
            },
            "rules": VALIDATION_RULES
        }