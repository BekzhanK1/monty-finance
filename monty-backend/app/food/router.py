from fastapi import APIRouter

from app.food.routers import bootstrap as bootstrap_routes
from app.food.routers import catalog as catalog_routes
from app.food.routers import kitchen as kitchen_routes
from app.food.routers import meal as meal_routes
from app.food.routers import pantry as pantry_routes
from app.food.routers import plan as plan_routes
from app.food.routers import shopping_list as shopping_list_routes
from app.food.routers import warehouses as warehouse_routes

router = APIRouter(prefix="/food", tags=["Food"])
router.include_router(bootstrap_routes.router)
router.include_router(meal_routes.router)
router.include_router(catalog_routes.router)
router.include_router(plan_routes.router)
router.include_router(pantry_routes.router)
router.include_router(kitchen_routes.router)
router.include_router(shopping_list_routes.router)
router.include_router(warehouse_routes.router)
