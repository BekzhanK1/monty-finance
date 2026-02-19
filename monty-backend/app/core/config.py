import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    STAGE: str = "PROD"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/monty"
    DEV_DATABASE_URL: str = "sqlite:///./monty_dev.db"
    
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    OPENAI_API_KEY: str = ""
    
    ALLOWED_TELEGRAM_IDS: str = "[]"
    
    class Config:
        env_file = ".env"
    
    @property
    def allowed_telegram_ids(self) -> List[int]:
        try:
            return json.loads(self.ALLOWED_TELEGRAM_IDS)
        except (json.JSONDecodeError, TypeError):
            return []

settings = Settings()

if settings.STAGE == "DEV":
    engine = create_engine(settings.DEV_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
