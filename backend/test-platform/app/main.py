"""
Test Platform — FastAPI App
Port: 8003 | Auto Test Generation | Test Reports
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_pool, close_pool
from app.routers import brs, test_reports
from app.routers import test_cases, test_tasks, discussions, timeline
from app.routers import test_documents, test_metrics


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(title="Test Platform", version="3.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(brs.router)
app.include_router(test_reports.router)
app.include_router(test_cases.router)
app.include_router(test_tasks.router)
app.include_router(discussions.router)
app.include_router(timeline.router)

# v2 routers — FR-030, FR-031, FR-032
app.include_router(test_documents.router)

# v3 routers — Test Metrics Dashboard
app.include_router(test_metrics.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "test-platform"}
