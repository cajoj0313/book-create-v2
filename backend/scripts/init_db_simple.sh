#!/bin/bash
# 灵笔项目 MySQL 数据库初始化脚本 (使用 lingbi 用户)
# 用法：./init_db_simple.sh

set -e

DATABASE_NAME="lingbi"
DATABASE_USER="lingbi"
DATABASE_PASSWORD="lingbi"

echo "🔧 正在初始化灵笔数据库..."

# 1. 创建数据库
echo "📦 创建数据库：$DATABASE_NAME"
mysql -u lingbi -p -e "CREATE DATABASE IF NOT EXISTS $DATABASE_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" << EOF
lingbi
EOF

# 2. 执行建表脚本
echo "📋 执行建表脚本..."
mysql -u lingbi -p $DATABASE_NAME < "$(dirname "$0")/create_tables.sql" << EOF
lingbi
EOF

# 3. 验证
echo "✅ 验证数据库..."
mysql -u lingbi -p $DATABASE_NAME -e "SHOW TABLES;" << EOF
lingbi
EOF

echo ""
echo "🎉 数据库初始化完成！"
echo ""
echo "📌 连接信息:"
echo "   数据库名：$DATABASE_NAME"
echo "   用户名：$DATABASE_USER"
echo "   密码：$DATABASE_PASSWORD"
echo "   连接字符串：mysql+aiomysql://$DATABASE_USER:$DATABASE_PASSWORD@localhost:3306/$DATABASE_NAME"
