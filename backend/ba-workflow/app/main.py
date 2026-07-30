"""
BA Workflow — FastAPI App
Port: 8002 | Document Hub | State Machine
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_pool, close_pool
from app.routers import documents, requirements
from app.routers import discussions, ba_tasks, timeline
from app.routers import ba_documents_v2
from app.routers import ba_studio


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(title="BA Workflow", version="3.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(requirements.router)
app.include_router(documents.router)
app.include_router(discussions.router)
app.include_router(ba_tasks.router)
app.include_router(timeline.router)

# v2 routers — FR-027, FR-028, FR-029
app.include_router(ba_documents_v2.router)

# BA Studio — Master Doc có version + Change Request cấp tài liệu
app.include_router(ba_studio.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "ba-workflow"}
