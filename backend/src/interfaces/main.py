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
    title="灵笔 API - 都市言情小说生成器",
    description="AI主导的都市言情小说生成平台",
    version="0.2.0",
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
    return {"message": "灵笔 API - 都市言情小说生成器", "version": "0.2.0"}


@app.get("/health")
async def health():
    """健康检查"""
    return {"status": "healthy"}


# 导入路由（都市言情简化版，移除状态追踪路由）
from .api_novels import router as novels_router
from .api_generation import router as generation_router

app.include_router(novels_router, prefix="/novels", tags=["novels"])
app.include_router(generation_router, prefix="/generation", tags=["generation"])