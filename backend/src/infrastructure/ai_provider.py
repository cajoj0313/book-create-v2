"""AI Provider - 通义千问调用封装"""
import asyncio
import json
from typing import AsyncGenerator, Optional, Dict, Any

# 可选导入dashscope（安装后才可用）
try:
    import dashscope
    from dashscope import Generation
    DASHSCOPE_AVAILABLE = True
except ImportError:
    DASHSCOPE_AVAILABLE = False
    dashscope = None
    Generation = None


class QwenProvider:
    """通义千问 API Provider"""

    def __init__(self, api_key: str, model: str = "qwen-plus"):
        if not DASHSCOPE_AVAILABLE:
            raise ImportError("dashscope is not installed. Run: pip install dashscope")
        self.api_key = api_key
        self.model = model
        dashscope.api_key = api_key

    async def stream_generate(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[str, None]:
        """流式生成内容

        Args:
            prompt: 生成提示词
            context: 上下文数据（世界观、人物等）

        Yields:
            str: 生成的内容片段
        """
        # 构建完整提示词
        full_prompt = self._build_prompt(prompt, context)

        # 调用通义千问流式API
        responses = Generation.call(
            model=self.model,
            prompt=full_prompt,
            stream=True,
            result_format='message'
        )

        for response in responses:
            if response.status_code == 200:
                content = response.output.choices[0].message.content
                yield content
            else:
                # 错误处理
                error_msg = f"API Error: {response.code} - {response.message}"
                yield json.dumps({"error": error_msg})

    async def generate(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """一次性生成完整内容

        Args:
            prompt: 生成提示词
            context: 上下文数据

        Returns:
            str: 完整生成内容
        """
        full_prompt = self._build_prompt(prompt, context)

        response = Generation.call(
            model=self.model,
            prompt=full_prompt,
            stream=False,
            result_format='message'
        )

        if response.status_code == 200:
            return response.output.choices[0].message.content
        else:
            raise Exception(f"API Error: {response.code} - {response.message}")

    def _build_prompt(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """构建完整提示词

        Args:
            prompt: 原始提示词
            context: 上下文数据

        Returns:
            str: 完整提示词
        """
        if context is None:
            return prompt

        # 将上下文注入提示词
        context_str = json.dumps(context, ensure_ascii=False, indent=2)
        full_prompt = f"""
# 输入上下文

{context_str}

# 任务

{prompt}

# 输出要求

请严格按照任务要求输出，输出JSON格式。
"""
        return full_prompt


class AIProviderFactory:
    """AI Provider 工厂"""

    @staticmethod
    def create(provider_type: str, config: Dict[str, str]) -> QwenProvider:
        """创建AI Provider

        Args:
            provider_type: Provider类型
            config: 配置信息

        Returns:
            QwenProvider实例
        """
        if provider_type == "dashscope":
            return QwenProvider(
                api_key=config.get("api_key", ""),
                model=config.get("model", "qwen-plus")
            )
        else:
            raise ValueError(f"Unsupported provider type: {provider_type}")