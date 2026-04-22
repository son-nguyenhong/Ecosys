"""
BA Workflow — JWT verify (không call về PPG, verify locally)
ADR-003: shared JWT_SECRET across services
"""
from app.auth import get_current_user, CurrentUser  # noqa: F401 — re-export

# Shared auth module — copy từ PPG hoặc dùng shared package
# Trong monorepo này, mỗi service có copy của auth.py với cùng JWT_SECRET từ env
