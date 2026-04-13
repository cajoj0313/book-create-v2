"""Interfaces Package"""
from .main import app
from .api_novels import router as novels_router

__all__ = ["app", "novels_router"]