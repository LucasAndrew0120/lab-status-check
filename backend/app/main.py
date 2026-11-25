"""FastAPI 应用入口。

启动：
    cd backend
    python -m uvicorn app.main:app --reload
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.database import init_db
from app.errors import register_exception_handlers
from app.routers import devices, health, stats


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="实验室设备巡检与故障记录平台 API",
    version=__version__,
    description="接口约定见仓库 docs/api.md",
    lifespan=lifespan,
)

# 本地开发时前端 Vite 默认 5173 端口；生产环境不涉及跨域部署
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(health.router, prefix="/api")
app.include_router(devices.router, prefix="/api")
app.include_router(stats.router, prefix="/api")


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {
        "name": "实验室设备巡检与故障记录平台 API",
        "docs": "/docs",
        "health": "/api/health",
    }
