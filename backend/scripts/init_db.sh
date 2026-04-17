#!/bin/bash
# 灵笔项目 MySQL 数据库初始化脚本
# 用法：./init_db.sh

set -e

MYSQL_USER="root"
MYSQL_PASSWORD=""
DATABASE_NAME="lingbi"
DATABASE_USER="lingbi"
DATABASE_PASSWORD="lingbi_password"

echo "🔧 正在初始化灵笔数据库..."

# 1. 创建数据库
echo "📦 创建数据库：$DATABASE_NAME"
mysql -u $MYSQL_USER $MYSQL_PASSWORD -e "CREATE DATABASE IF NOT EXISTS $DATABASE_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. 创建用户并授权
echo "👤 创建数据库用户：$DATABASE_USER"
mysql -u $MYSQL_USER $MYSQL_PASSWORD -e "CREATE USER IF NOT EXISTS '$DATABASE_USER'@'localhost' IDENTIFIED BY '$DATABASE_PASSWORD';"
mysql -u $MYSQL_USER $MYSQL_PASSWORD -e "GRANT ALL PRIVILEGES ON $DATABASE_NAME.* TO '$DATABASE_USER'@'localhost';"
mysql -u $MYSQL_USER $MYSQL_PASSWORD -e "FLUSH PRIVILEGES;"

# 3. 执行建表脚本
echo "📋 执行建表脚本..."
mysql -u $MYSQL_USER $MYSQL_PASSWORD $DATABASE_NAME < "$(dirname "$0")/create_tables.sql"

# 4. 验证
echo "✅ 验证数据库..."
mysql -u $MYSQL_USER $MYSQL_PASSWORD -e "USE $DATABASE_NAME; SHOW TABLES;" | grep -E "novels|world_settings|outlines"

echo ""
echo "🎉 数据库初始化完成！"
echo ""
echo "📌 连接信息:"
echo "   数据库名：$DATABASE_NAME"
echo "   用户名：$DATABASE_USER"
echo "   密码：$DATABASE_PASSWORD"
echo "   连接字符串：mysql+aiomysql://$DATABASE_USER:$DATABASE_PASSWORD@localhost:3306/$DATABASE_NAME"
echo ""
echo "⚠️  请更新 .env 文件："
echo "   DATABASE_URL=mysql+aiomysql://$DATABASE_USER:$DATABASE_PASSWORD@localhost:3306/$DATABASE_NAME"
echo "   STORAGE_TYPE=mysql"
