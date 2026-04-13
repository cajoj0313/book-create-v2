"""pytest 配置文件"""
import pytest
import os
import sys

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def pytest_addoption(parser):
    """添加自定义命令行选项"""
    parser.addoption(
        "--run-integration",
        action="store_true",
        default=False,
        help="运行集成测试（需要真实 API 密钥）"
    )


def pytest_configure(config):
    """pytest 配置"""
    config.addinivalue_line(
        "markers", "integration: 标记为集成测试（需要真实 API）"
    )


def pytest_collection_modifyitems(config, items):
    """修改测试收集"""
    if not config.getoption("--run-integration"):
        skip_integration = pytest.mark.skip(reason="需要 --run-integration 选项")
        for item in items:
            if "integration" in item.keywords:
                item.add_marker(skip_integration)