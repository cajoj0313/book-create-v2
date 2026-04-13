"""文案校验服务（都市言情简化版）"""
import os
from typing import Dict, Any, List, Optional
import json
from datetime import datetime

from ..infrastructure.ai_provider import QwenProvider, AIProviderFactory
from ..infrastructure.storage import FileStorage


# 校验规则定义（都市言情简化版：5条基础规则）
VALIDATION_RULES = {
    # 语法规范校验 (G001-G002)
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

    # 感情线校验 (E001-E002) - 都市言情核心
    "E001": {
        "name": "感情节奏检查",
        "category": "感情线",
        "description": "检查感情阶段是否符合节奏表",
        "trigger": "感情阶段跳跃或不符合大纲设定",
        "action": "标记问题，提示当前感情阶段",
        "severity": "high"
    },
    "E002": {
        "name": "爽点密度检查",
        "category": "感情线",
        "description": "检查爽点密度是否符合要求",
        "trigger": "每5章少于1个爽点",
        "action": "标记问题，提示增加爽点",
        "severity": "medium"
    },

    # 人物一致性校验 (P001)
    "P001": {
        "name": "人物称呼一致",
        "category": "人物一致性",
        "description": "检查男主/女主称呼是否固定",
        "trigger": "同一人物称呼变化",
        "action": "标记问题，统一称呼",
        "severity": "medium"
    }
}

# 规则分类（简化版）
RULE_CATEGORIES = {
    "G": {"name": "语法规范", "color": "indigo", "rules": ["G001", "G002"]},
    "E": {"name": "感情线", "color": "rose", "rules": ["E001", "E002"]},
    "P": {"name": "人物一致性", "color": "purple", "rules": ["P001"]}
}


class ValidationService:
    """文案校验服务（都市言情简化版）"""

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

        # 加载上下文（都市言情简化版）
        context = self._load_validation_context(novel_id, chapter_num)

        # 确定校验范围
        if validation_types:
            rules_to_apply = []
            for vt in validation_types:
                rules_to_apply.extend(self._get_rules_by_category(vt))
        else:
            rules_to_apply = list(VALIDATION_RULES.keys())

        # 构建校验Prompt
        prompt = self._build_validation_prompt(chapter, context, rules_to_apply)

        # 调用AI校验
        result = await self.ai_provider.generate(prompt)

        # 解析校验结果
        validation_report = self._parse_validation_result(result, chapter_num)

        if validation_report:
            validation_report["novel_id"] = novel_id
            validation_report["chapter_num"] = chapter_num
            validation_report["validated_at"] = datetime.utcnow().isoformat()
            validation_report["validation_type"] = "single_chapter"

            # 保存校验报告
            self._save_validation_report(novel_id, chapter_num, validation_report)

        return validation_report

    async def validate_novel(self, novel_id: str) -> Dict[str, Any]:
        """校验整本小说

        Args:
            novel_id: 小说ID

        Returns:
            Dict: 全书校验报告
        """
        meta = self.storage.load_json(novel_id, "meta.json")
        if not meta:
            raise ValueError("Novel not found")

        completed_chapters = meta.get("completed_chapters", 0)

        all_issues = []
        for chapter_num in range(1, completed_chapters + 1):
            report = await self.validate_chapter(novel_id, chapter_num)
            if report:
                all_issues.extend(report.get("issues", []))

        full_report = {
            "novel_id": novel_id,
            "chapter_num": None,
            "validated_at": datetime.utcnow().isoformat(),
            "validation_type": "full_novel",
            "issues": all_issues,
            "statistics": self._calculate_statistics(all_issues)
        }

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
        """加载校验所需上下文（都市言情简化版）"""

        context = {}

        # 加载核心数据（都市言情简化版：移除时间线/伏笔）
        context["world_setting"] = self.storage.load_json(novel_id, "world_setting.json")
        context["characters"] = self.storage.load_json(novel_id, "characters.json")
        context["outline"] = self.storage.load_json(novel_id, "outline.json")

        # 加载前1章内容作为参考
        if chapter_num > 1:
            prev_chapter = self.storage.load_json(
                novel_id,
                f"chapters/chapter_{chapter_num - 1:03d}.json"
            )
            if prev_chapter:
                context["previous_chapter"] = prev_chapter

        return context

    def _get_rules_by_category(self, category: str) -> List[str]:
        """获取指定类别的规则ID"""

        category_prefix = {
            "语法规范": "G",
            "感情线": "E",
            "人物一致性": "P"
        }

        prefix = category_prefix.get(category, "")
        return [r for r in VALIDATION_RULES.keys() if r.startswith(prefix)]

    def _build_validation_prompt(
        self,
        chapter: Dict[str, Any],
        context: Dict[str, Any],
        rules_to_apply: List[str]
    ) -> str:
        """构建校验Prompt（都市言情简化版）"""

        chapter_str = json.dumps(chapter, ensure_ascii=False, indent=2)
        world_setting_str = json.dumps(context.get("world_setting", {}), ensure_ascii=False, indent=2)
        outline_str = json.dumps(context.get("outline", {}), ensure_ascii=False, indent=2)

        prev_chapter_str = ""
        prev_chapter = context.get("previous_chapter")
        if prev_chapter:
            prev_chapter_str = json.dumps({
                "chapter_num": prev_chapter.get("chapter_num"),
                "emotion_stage": prev_chapter.get("emotion_stage", ""),
                "summary": prev_chapter.get("summary", {})
            }, ensure_ascii=False, indent=2)

        rules_str = ""
        for rule_id in rules_to_apply:
            rule = VALIDATION_RULES.get(rule_id, {})
            rules_str += f"- {rule_id}: {rule.get('name', '')} - {rule.get('trigger', '')}\n"

        prompt = f"""
# 任务：文案校验（都市言情简化版）

## 当前章节内容
{chapter_str}

## 参考数据

### 世界观设定（男主/女主/感情线）
{world_setting_str}

### 大纲（感情节奏表）
{outline_str}

### 前章参考
{prev_chapter_str if prev_chapter_str else "这是第一章"}

## 校验规则（5条基础规则）
请按照以下规则检查章节内容：
{rules_str}

## 输出要求
输出为 JSON 格式的校验报告，包含：

### issues（问题列表）
每个问题包含：
- issue_id: 问题ID
- rule_id: 触发的规则ID
- severity: 严重程度（high/medium/low）
- confidence: 置信度（0-100）
- description: 问题描述
- suggestion: 修正建议
- auto_fix_available: 是否可自动修复
- auto_fix_text: 自动修复内容（如可修复）
- status: 状态（pending/auto_fixed）

### statistics（统计信息）
- total_issues: 总问题数
- high_severity: 高严重问题数
- medium_severity: 中严重问题数
- low_severity: 低严重问题数
- auto_fixed: 自动修复数
- pending: 待处理数

## 校验约束
1. 低置信度问题（<80%）必须标记为 pending
2. 高置信度语法问题（>95%）可自动修复
3. 如果没有发现问题，issues 列表为空

## 输出格式
只输出JSON对象，不要包含markdown代码块标记。
"""
        return prompt

    def _parse_validation_result(
        self,
        result: str,
        chapter_num: int
    ) -> Optional[Dict[str, Any]]:
        """解析AI校验结果"""

        try:
            return json.loads(result)
        except json.JSONDecodeError:
            if "```json" in result:
                start = result.find("```json") + 7
                end = result.find("```", start)
                if end > start:
                    json_str = result[start:end].strip()
                    try:
                        return json.loads(json_str)
                    except json.JSONDecodeError:
                        pass

            start = result.find("{")
            end = result.rfind("}") + 1
            if start >= 0 and end > start:
                json_str = result[start:end]
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    pass

            return None

    def _save_validation_report(
        self,
        novel_id: str,
        chapter_num: int,
        report: Dict[str, Any]
    ):
        """保存校验报告"""

        self.storage.save_json(
            novel_id,
            f"validation_reports/chapter_{chapter_num:03d}_report.json",
            report
        )

    def _calculate_statistics(self, issues: List[Dict[str, Any]]) -> Dict[str, int]:
        """计算统计信息"""

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
        """获取所有规则信息"""

        return {
            "rules": VALIDATION_RULES,
            "categories": RULE_CATEGORIES,
            "total_count": len(VALIDATION_RULES)
        }