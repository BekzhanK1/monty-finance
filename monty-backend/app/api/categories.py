from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.config import get_db
from app.models.models import Category
from app.schemas.schemas import CategoryResponse

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    return categories
