"""
PPG System — FastAPI App
Port: 8001 | Auth provider | Application Registry
"""
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import init_pool, close_pool
from app.routers import auth, projects, app_registry, sync
from app.routers import milestones, members, files, meetings
from app.routers import annual_plans_v2, project_objects, reports
from app.routers import publish, annual_plan_extended
from app.routers import project_management, project_product_info, project_compliance
from app.routers import project_export
from app.routers import catalog_products, catalog_users
from app.routers import activity_tasks
from app.routers import dashboard
from app.routers import project_docs
from app.routers import requests
from app.routers import test_documents
from app.routers import todos


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    yield
    await close_pool()


app = FastAPI(title="PPG System", version="3.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public routes (no auth)
app.include_router(auth.router)
app.include_router(sync.router)

# Protected routes
app.include_router(projects.router)
app.include_router(app_registry.router)
app.include_router(milestones.router)
app.include_router(members.router)
app.include_router(files.router)
app.include_router(meetings.router)

# v2 routers — FR-019 to FR-026 (annual_plans_v2 supersedes annual_plans)
app.include_router(annual_plans_v2.router)
app.include_router(project_objects.router)
app.include_router(reports.router)
app.include_router(publish.router)
app.include_router(annual_plan_extended.router)

# v3 routers — Extended project management (FR: Governance, Health, Products, Compliance)
app.include_router(project_management.router)
app.include_router(project_product_info.router)
app.include_router(project_compliance.router)
app.include_router(project_export.router)
app.include_router(activity_tasks.router)

# v4 routers — Module Danh Mục Dữ Liệu (Data Catalog)
app.include_router(catalog_products.router)
app.include_router(catalog_users.router)

# v5 routers — Portfolio Dashboard
app.include_router(dashboard.router)

# v6 routers — Project Docs (folder tree + template downloads)
app.include_router(project_docs.router)

# v7 routers — Request Management (PCR + SR)
app.include_router(requests.router)

# v8 routers — Test Documents (Test Plan / Bug Report / UAT Sign-off)
app.include_router(test_documents.router)

# v9 routers — To-do List (FR-T01 – FR-T10)
app.include_router(todos.router)

# Serve MkDocs static sites at /sites/{project_code}/
_sites_dir = Path(os.getenv("SITES_DIR", "./public/sites"))
_sites_dir.mkdir(parents=True, exist_ok=True)
app.mount("/sites", StaticFiles(directory=str(_sites_dir), html=True), name="sites")


@app.get("/health")
def health():
    return {"status": "ok", "service": "ppg"}
