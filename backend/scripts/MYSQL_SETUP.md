# MySQL 数据库初始化指南

## 前置要求

- MySQL 8.0+ 已安装
- macOS (Homebrew)

## 快速开始

### 1. 启动 MySQL 服务

```bash
# 启动 MySQL
brew services start mysql@8.0

# 验证状态
mysql.server status
```

### 2. 创建数据库和用户

```bash
# 登录 MySQL
mysql -u root -p

# 在 MySQL 命令行执行：
CREATE DATABASE IF NOT EXISTS lingbi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'lingbi'@'localhost' IDENTIFIED BY 'lingbi_password';
GRANT ALL PRIVILEGES ON lingbi.* TO 'lingbi'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. 执行建表脚本

```bash
cd /Users/supercao/workspace/book-create-v2/backend
mysql -u lingbi -p lingbi < scripts/create_tables.sql
```

### 4. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，确认以下配置：
# DATABASE_URL=mysql+aiomysql://lingbi:lingbi_password@localhost:3306/lingbi
# STORAGE_TYPE=mysql
# DASHSCOPE_API_KEY=your_api_key
```

### 5. 验证数据库连接

```bash
cd /Users/supercao/workspace/book-create-v2/backend
PYTHONPATH=src python3 -c "
import asyncio
from infrastructure.database import init_db
asyncio.run(init_db())
print('✅ 数据库连接成功，表已创建')
"
```

## 手动初始化（可选）

如果自动脚本失败，可以手动执行：

```bash
# 1. 连接数据库
mysql -u lingbi -p lingbi

# 2. 验证表已创建
SHOW TABLES;

# 3. 应该看到以下 10 张表：
# - novels
# - world_settings
# - outlines
# - outline_volumes
# - outline_chapters
# - chapters
# - story_synopsis
# - characters
# - chapter_versions
# - validation_reports
```

## 数据迁移（如有现有 JSON 数据）

```bash
# 1. 导出 JSON 数据
cd /Users/supercao/workspace/book-create-v2/backend
PYTHONPATH=src python3 scripts/export_json_data.py

# 2. 导入到 MySQL
PYTHONPATH=src python3 scripts/import_to_mysql.py
```

## 常见问题

### MySQL 无法启动

```bash
# 查看错误日志
brew info mysql@8.0

# 重新启动
brew services restart mysql@8.0
```

### 密码错误

如果忘记 root 密码：

```bash
# 停止 MySQL
mysql.server stop

# 跳过权限表启动
mysqld_safe --skip-grant-tables &

# 重置密码
mysql -u root
> ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
> FLUSH PRIVILEGES;
> EXIT;
```

### 字符集问题

```bash
# 检查数据库字符集
mysql -u lingbi -p lingbi -e "SHOW CREATE DATABASE lingbi;"

# 应该是：DEFAULT CHARSET=utf8mb4
```

## 下一步

数据库初始化完成后，可以：

1. 运行后端服务：`./start.sh`
2. 运行测试：`PYTHONPATH=src python3 -m pytest tests/unit/test_repositories.py -v`
3. 访问 API 文档：http://localhost:8000/docs
