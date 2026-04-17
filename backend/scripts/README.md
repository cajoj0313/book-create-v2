# 灵笔项目 MySQL 数据库迁移方案

详见：[MySQL 数据库迁移方案](./mysql-migration-plan.md)

## 快速开始

### 前置要求

- MySQL 8.0+ 已安装并运行
- Python 3.9+
- pip 包管理器

### 1. 启动 MySQL 服务

```bash
# macOS (Homebrew)
brew services start mysql@8.0

# 或使用
mysql.server start
```

### 2. 创建数据库和用户

```bash
# 使用 root 用户登录
mysql -u root -p

# 在 MySQL 命令行中执行：
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
# 输入密码：lingbi_password
```

### 4. 配置数据库连接

```bash
cp .env.example .env
# 编辑 .env 文件：
# DATABASE_URL=mysql+aiomysql://lingbi:lingbi_password@localhost:3306/lingbi
# STORAGE_TYPE=mysql
```

### 5. 安装依赖

```bash
pip install sqlalchemy[asyncio] aiomysql pymysql
```

### 6. 验证连接

```bash
python -c "from infrastructure.database import init_db; import asyncio; asyncio.run(init_db()); print('✅ 数据库连接成功')"
```

## 目录结构

| 文件 | 说明 |
|------|------|
| `create_tables.sql` | 建表脚本（10 张表） |
| `init_db.sh` | 一键初始化脚本（需要 root 无密码） |
| `init_db_simple.sh` | 简化版初始化脚本 |
| `export_json_data.py` | JSON 数据导出脚本 |
| `import_to_mysql.py` | MySQL 数据导入脚本 |
| `migrate.py` | 一键迁移脚本 |

## 常见问题

### MySQL 无法启动

```bash
# 查看状态
mysql.server status

# 重启
mysql.server restart

# 查看错误日志
brew info mysql@8.0
```

### 密码错误

如果忘记 root 密码，可以重置：

```bash
# 停止 MySQL
mysql.server stop

# 跳过权限表启动
mysqld_safe --skip-grant-tables &

# 重置密码
mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';"
```

### 字符集问题

确保所有表都使用 utf8mb4:

```sql
SHOW CREATE TABLE novels;
-- 应该显示：CHARSET=utf8mb4
```

## 迁移步骤

详见 [MySQL 数据库迁移方案](./mysql-migration-plan.md)