"""FastAPI Main Application"""
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

# 加载环境变量（优先加载 .env.local，然后 .env）
load_dotenv(".env.local")
load_dotenv(".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ..infrastructure.storage import FileStorage


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # Startup
    storage = FileStorage("data/novels")
    app.state.storage = storage
    yield
    # Shutdown
    pass


app = FastAPI(
    title="灵笔 API",
    description="AI主导的小说生成平台",
    version="0.1.0",
    lifespan=lifespan
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"],  # 前端开发地址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """根路径"""
    return {"message": "灵笔 API 运行中", "version": "0.1.0"}


@app.get("/health")
async def health():
    """健康检查"""
    return {"status": "healthy"}


# 导入路由
from .api_novels import router as novels_router
from .api_generation import router as generation_router
from .api_state import router as state_router

app.include_router(novels_router, prefix="/novels", tags=["novels"])
app.include_router(generation_router, prefix="/generation", tags=["generation"])
app.include_router(state_router, prefix="/state", tags=["state"])