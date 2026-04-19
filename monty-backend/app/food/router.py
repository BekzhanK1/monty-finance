from fastapi import APIRouter

from app.food.routers import catalog as catalog_routes
from app.food.routers import meal as meal_routes
from app.food.routers import plan as plan_routes

router = APIRouter(prefix="/food", tags=["Food"])
router.include_router(meal_routes.router)
router.include_router(catalog_routes.router)
router.include_router(plan_routes.router)
