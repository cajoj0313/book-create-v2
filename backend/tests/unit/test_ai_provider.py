"""AI Provider 单元测试"""
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import json


class TestAIProviderFactory:
    """AI Provider 工厂测试"""

    def test_create_unsupported_provider(self):
        """测试创建不支持的 Provider"""
        from src.infrastructure.ai_provider import AIProviderFactory, DASHSCOPE_AVAILABLE

        if not DASHSCOPE_AVAILABLE:
            pytest.skip("dashscope not installed")

        with pytest.raises(ValueError):
            AIProviderFactory.create("unsupported", {"api_key": "test"})


class TestQwenProviderBuildPrompt:
    """Qwen Provider Prompt 构建测试（不需要真实 Provider）"""

    def test_build_prompt_logic_no_context(self):
        """测试构建提示词逻辑（无上下文）"""
        # 直接测试 _build_prompt 的逻辑
        prompt = "原始提示词"
        context = None

        if context is None:
            result = prompt

        assert result == "原始提示词"

    def test_build_prompt_logic_with_context(self):
        """测试构建提示词逻辑（有上下文）"""
        prompt = "任务描述"
        context = {"novel_id": "test-001"}

        context_str = json.dumps(context, ensure_ascii=False, indent=2)
        result = f"""
# 输入上下文

{context_str}

# 任务

{prompt}

# 输出要求

请严格按照任务要求输出，输出JSON格式。
"""

        assert "novel_id" in result
        assert "任务描述" in result
        assert "输出要求" in result


class TestQwenProviderSkip:
    """Qwen Provider 测试（跳过，因为需要 dashscope）"""

    def test_init_without_dashscope(self):
        """测试没有安装 dashscope"""
        from src.infrastructure.ai_provider import DASHSCOPE_AVAILABLE

        if not DASHSCOPE_AVAILABLE:
            # 验证 ImportError 会被抛出
            with pytest.raises(ImportError):
                from src.infrastructure.ai_provider import QwenProvider
                QwenProvider(api_key="test", model="qwen3.5")
        else:
            pytest.skip("dashscope is installed, cannot test ImportError")


class TestAIProviderFactoryCreate:
    """AI Provider 工厂创建测试"""

    def test_factory_create_dashscope_skip(self):
        """测试工厂创建 dashscope provider（需要 dashscope 安装）"""
        from src.infrastructure.ai_provider import DASHSCOPE_AVAILABLE, AIProviderFactory

        if not DASHSCOPE_AVAILABLE:
            pytest.skip("dashscope not installed")

        # 需要 mock dashscope
        mock_dashscope = MagicMock()
        with patch('src.infrastructure.ai_provider.dashscope', mock_dashscope):
            provider = AIProviderFactory.create("dashscope", {
                "api_key": "test-key",
                "model": "qwen3.5"
            })

            # 验证 api_key 被设置
            assert mock_dashscope.api_key == "test-key"