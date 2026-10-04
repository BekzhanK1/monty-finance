from contextlib import asynccontextmanager

from app.finance.routers import (
    analytics,
    auth,
    budgets,
    categories,
    digest,
    goals,
    integrations,
    settings,
    transactions,
    voice,
)
from app.core.migrations import run_migrations
from app.finance.services.scheduler import scheduler, setup_scheduler
from app.food.router import router as food_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()

    setup_scheduler()
    scheduler.start()

    yield

    scheduler.shutdown()


app = FastAPI(
    title="Monty API",
    version="1.0.0",
    description="Financial tracker API for couple",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(goals.router)
app.include_router(digest.router)
app.include_router(settings.router)
app.include_router(analytics.router)
app.include_router(integrations.router)
app.include_router(voice.router)
app.include_router(food_router)


@app.get("/")
def root():
    return {"status": "ok", "message": "Monty API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
