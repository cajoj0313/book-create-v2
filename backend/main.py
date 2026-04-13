"""Backend Entry Point"""
import uvicorn
from src.interfaces.main import app


def main():
    """启动服务器"""
    uvicorn.run(
        "src.interfaces.main:app",
        host="localhost",
        port=8000,
        reload=True
    )


if __name__ == "__main__":
    main()