from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date

from app.core.config import get_db
from app.models.models import User, Transaction, Category, CategoryGroup
from app.middleware.auth import get_current_user
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/goals", tags=["Goals"])

@router.get("")
def get_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_amount = SettingsService.get_target_amount(db)
    target_date_str = SettingsService.get_target_date(db)
    target_date = date.fromisoformat(target_date_str)
    
    today = date.today()
    
    savings_category_ids = [
        c.id for c in db.query(Category).filter(Category.group == CategoryGroup.SAVINGS).all()
    ]
    
    if savings_category_ids:
        total_savings = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.user_id == current_user.id,
            Transaction.category_id.in_(savings_category_ids)
        ).scalar() or 0
    else:
        total_savings = 0
    
    days_remaining = (target_date - today).days if today < target_date else 0
    progress_percent = min(100, (total_savings / target_amount) * 100) if target_amount > 0 else 0
    
    return {
        "target_amount": target_amount,
        "target_date": target_date.isoformat(),
        "current_savings": total_savings,
        "progress_percent": round(progress_percent, 1),
        "days_remaining": days_remaining,
        "daily_needed": round((target_amount - total_savings) / days_remaining) if days_remaining > 0 else 0
    }
