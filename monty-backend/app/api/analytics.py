from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.core.config import get_db
from app.models.models import User, Category, Transaction, TransactionType, CategoryGroup
from app.schemas.schemas import AnalyticsResponse
from app.middleware.auth import get_current_user
from app.services.database import get_financial_period
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("", response_model=AnalyticsResponse)
def get_analytics(
    months: int = Query(3, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30 * months)
    
    transactions = db.query(Transaction).filter(
        Transaction.transaction_date >= start_date,
        Transaction.transaction_date <= end_date
    ).all()
    
    total_income = sum(t.amount for t in transactions if t.category.type == TransactionType.INCOME)
    total_expenses = sum(t.amount for t in transactions if t.category.type == TransactionType.EXPENSE and t.category.group != CategoryGroup.SAVINGS)
    total_savings = sum(t.amount for t in transactions if t.category.type == TransactionType.EXPENSE and t.category.group == CategoryGroup.SAVINGS)
    balance = total_income - total_expenses

    by_category = {}
    for t in transactions:
        cat_name = t.category.name
        cat_icon = t.category.icon
        cat_type = t.category.type
        cat_group = t.category.group

        if cat_name not in by_category:
            by_category[cat_name] = {"name": cat_name, "icon": cat_icon, "income": 0, "expense": 0, "savings": 0}
        if cat_type == TransactionType.INCOME:
            by_category[cat_name]["income"] += t.amount
        elif cat_group == CategoryGroup.SAVINGS:
            by_category[cat_name]["savings"] += t.amount
        else:
            by_category[cat_name]["expense"] += t.amount

    def _cat_type(v):
        if v["income"] > 0:
            return "income"
        if v["savings"] > 0:
            return "savings"
        return "expense"

    by_category_list = [
        {"name": v["name"], "icon": v["icon"], "amount": v["expense"] or v["savings"] or v["income"], "type": _cat_type(v)}
        for v in by_category.values()
    ]
    by_category_list.sort(key=lambda x: x["amount"], reverse=True)

    by_group = {}
    for t in transactions:
        group = t.category.group.value
        if group not in by_group:
            by_group[group] = {"group": group, "income": 0, "expense": 0}
        if t.category.type == TransactionType.INCOME:
            by_group[group]["income"] += t.amount
        else:
            by_group[group]["expense"] += t.amount

    by_group_list = []
    for g in by_group.values():
        if g["income"] > 0:
            by_group_list.append({"group": g["group"], "amount": g["income"], "type": "income"})
        if g["expense"] > 0:
            by_group_list.append({"group": g["group"], "amount": g["expense"], "type": "expense"})
    by_group_list.sort(key=lambda x: x["amount"], reverse=True)

    daily_data = {}
    for t in transactions:
        day = t.transaction_date.date().isoformat()
        if day not in daily_data:
            daily_data[day] = {"date": day, "income": 0, "expense": 0}
        if t.category.type == TransactionType.INCOME:
            daily_data[day]["income"] += t.amount
        elif t.category.group != CategoryGroup.SAVINGS:
            daily_data[day]["expense"] += t.amount

    daily_list = sorted(daily_data.values(), key=lambda x: x["date"])

    return AnalyticsResponse(
        total_income=total_income,
        total_expenses=total_expenses,
        total_savings=total_savings,
        balance=balance,
        by_category=by_category_list[:10],
        by_group=by_group_list,
        daily_data=daily_list
    )


@router.get("/period", response_model=AnalyticsResponse)
def get_analytics_for_period(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if start_date:
        start = datetime.fromisoformat(start_date)
    else:
        start = datetime.utcnow() - timedelta(days=30)
    
    if end_date:
        end = datetime.fromisoformat(end_date)
    else:
        end = datetime.utcnow()
    
    transactions = db.query(Transaction).filter(
        Transaction.transaction_date >= start,
        Transaction.transaction_date <= end
    ).all()
    
    total_income = sum(t.amount for t in transactions if t.category.type == TransactionType.INCOME)
    total_expenses = sum(t.amount for t in transactions if t.category.type == TransactionType.EXPENSE and t.category.group != CategoryGroup.SAVINGS)
    total_savings = sum(t.amount for t in transactions if t.category.type == TransactionType.EXPENSE and t.category.group == CategoryGroup.SAVINGS)
    balance = total_income - total_expenses

    by_category = {}
    for t in transactions:
        cat_name = t.category.name
        cat_icon = t.category.icon
        cat_type = t.category.type
        cat_group = t.category.group
        if cat_name not in by_category:
            by_category[cat_name] = {"name": cat_name, "icon": cat_icon, "income": 0, "expense": 0, "savings": 0}
        if cat_type == TransactionType.INCOME:
            by_category[cat_name]["income"] += t.amount
        elif cat_group == CategoryGroup.SAVINGS:
            by_category[cat_name]["savings"] += t.amount
        else:
            by_category[cat_name]["expense"] += t.amount
    def _cat_type(v):
        if v["income"] > 0:
            return "income"
        if v["savings"] > 0:
            return "savings"
        return "expense"

    by_category_list = [
        {"name": v["name"], "icon": v["icon"], "amount": v["expense"] or v["savings"] or v["income"], "type": _cat_type(v)}
        for v in by_category.values()
    ]
    by_category_list.sort(key=lambda x: x["amount"], reverse=True)

    by_group = {}
    for t in transactions:
        group = t.category.group.value
        if group not in by_group:
            by_group[group] = {"group": group, "income": 0, "expense": 0}
        if t.category.type == TransactionType.INCOME:
            by_group[group]["income"] += t.amount
        else:
            by_group[group]["expense"] += t.amount
    by_group_list = []
    for g in by_group.values():
        if g["income"] > 0:
            by_group_list.append({"group": g["group"], "amount": g["income"], "type": "income"})
        if g["expense"] > 0:
            by_group_list.append({"group": g["group"], "amount": g["expense"], "type": "expense"})
    by_group_list.sort(key=lambda x: x["amount"], reverse=True)

    daily_data = {}
    for t in transactions:
        day = t.transaction_date.date().isoformat()
        if day not in daily_data:
            daily_data[day] = {"date": day, "income": 0, "expense": 0}
        if t.category.type == TransactionType.INCOME:
            daily_data[day]["income"] += t.amount
        elif t.category.group != CategoryGroup.SAVINGS:
            daily_data[day]["expense"] += t.amount
    daily_list = sorted(daily_data.values(), key=lambda x: x["date"])

    return AnalyticsResponse(
        total_income=total_income,
        total_expenses=total_expenses,
        total_savings=total_savings,
        balance=balance,
        by_category=by_category_list[:10],
        by_group=by_group_list,
        daily_data=daily_list
    )
