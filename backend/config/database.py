"""数据库配置"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseConfig(BaseSettings):
    """数据库配置"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        extra="ignore"  # 忽略额外字段
    )

    database_url: str = "mysql+aiomysql://lingbi:lingbi_password@localhost:3306/lingbi"
    storage_type: str = "mysql"
    echo: bool = False  # 是否打印 SQL 日志


# 全局配置实例
database_config = DatabaseConfig()


def get_database_url() -> str:
    """获取数据库连接 URL"""
    return database_config.database_url


def is_mysql_storage() -> bool:
    """判断是否使用 MySQL 存储"""
    return database_config.storage_type.lower() == "mysql"
