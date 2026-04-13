#!/bin/bash
# 灵笔 Backend 启动脚本

cd "$(dirname "$0")"

# 检查依赖
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "Installing dependencies..."
    python3 -m pip install -r requirements.txt
fi

# 启动服务
echo "Starting Lingbi API Server..."
echo "API: http://localhost:8000"
echo "Docs: http://localhost:8000/docs"
python3 -m uvicorn src.interfaces.main:app --reload --port 8000