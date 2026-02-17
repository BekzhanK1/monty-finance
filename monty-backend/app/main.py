from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Base, engine
from app.api import auth, categories, transactions, budgets, goals, digest, settings
from app.services.scheduler import setup_scheduler, scheduler
from app.services.database import seed_initial_data
from app.core.config import SessionLocal

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    
    setup_scheduler()
    scheduler.start()
    
    yield
    
    scheduler.shutdown()

app = FastAPI(
    title="Monty API",
    version="1.0.0",
    description="Financial tracker API for couple",
    lifespan=lifespan
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

@app.get("/")
def root():
    return {"status": "ok", "message": "Monty API is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}
