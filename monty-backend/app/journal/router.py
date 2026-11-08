from fastapi import APIRouter, Depends

from app.journal.deps import require_journal_key
from app.journal.routers import entries as entries_routes
from app.journal.routers import overview as overview_routes
from app.journal.routers import settings as settings_routes

router = APIRouter(prefix="/journal", tags=["Journal"], dependencies=[Depends(require_journal_key)])
router.include_router(overview_routes.router)
router.include_router(entries_routes.router)
router.include_router(settings_routes.router)
