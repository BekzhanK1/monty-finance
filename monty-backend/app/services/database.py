from datetime import date
from sqlalchemy.orm import Session
from app.models.models import Category, MonthlyBudget, User, CategoryGroup, TransactionType
from app.core.config import Base, engine
from app.services.settings_service import SettingsService

def init_db():
    Base.metadata.create_all(bind=engine)

def get_financial_period(ref_date: date = None, salary_day: int = None) -> tuple[date, date]:
    from datetime import timedelta
    if ref_date is None:
        ref_date = date.today()
    
    if salary_day is None:
        salary_day = 10
    
    if ref_date.day >= salary_day:
        start = ref_date.replace(day=salary_day)
        if ref_date.month == 12:
            end = date(ref_date.year + 1, 1, salary_day - 1)
        else:
            end = date(ref_date.year, ref_date.month + 1, salary_day - 1)
    else:
        if ref_date.month == 1:
            start = date(ref_date.year - 1, 12, salary_day)
        else:
            start = date(ref_date.year, ref_date.month - 1, salary_day)
        end = ref_date.replace(day=salary_day - 1)
    
    return start, end

def seed_initial_data(db: Session):
    categories = [
        Category(id=1, name="Зарплата", group=CategoryGroup.INCOME, type=TransactionType.INCOME, icon="💰"),
        Category(id=2, name="Продукты", group=CategoryGroup.BASE, type=TransactionType.EXPENSE, icon="🍎"),
        Category(id=3, name="Такси", group=CategoryGroup.COMFORT, type=TransactionType.EXPENSE, icon="🚕"),
        Category(id=4, name="Кафе", group=CategoryGroup.COMFORT, type=TransactionType.EXPENSE, icon="☕️"),
        Category(id=5, name="Бензин", group=CategoryGroup.BASE, type=TransactionType.EXPENSE, icon="⛽️"),
        Category(id=6, name="Одежда", group=CategoryGroup.COMFORT, type=TransactionType.EXPENSE, icon="👕"),
        Category(id=7, name="Депозит", group=CategoryGroup.SAVINGS, type=TransactionType.EXPENSE, icon="🏦"),
        Category(id=8, name="Коммуналка", group=CategoryGroup.BASE, type=TransactionType.EXPENSE, icon="🏠"),
        Category(id=9, name="Развлечения", group=CategoryGroup.COMFORT, type=TransactionType.EXPENSE, icon="🎬"),
        Category(id=10, name="Связь", group=CategoryGroup.BASE, type=TransactionType.EXPENSE, icon="📱"),
    ]
    
    for cat in categories:
        db.merge(cat)
    db.commit()
    
    salary_day = SettingsService.get_salary_day(db)
    period_start, _ = get_financial_period(salary_day=salary_day)
    
    base_budget = int(SettingsService.get_setting(db, "base_budget") or 270000)
    comfort_budget = int(SettingsService.get_setting(db, "comfort_budget") or 195000)
    savings_budget = int(SettingsService.get_setting(db, "savings_budget") or 150000)
    
    budgets = [
        MonthlyBudget(category_id=2, period=period_start, limit_amount=80000),
        MonthlyBudget(category_id=3, period=period_start, limit_amount=comfort_budget // 4),
        MonthlyBudget(category_id=4, period=period_start, limit_amount=comfort_budget // 5),
        MonthlyBudget(category_id=5, period=period_start, limit_amount=base_budget // 9),
        MonthlyBudget(category_id=6, period=period_start, limit_amount=comfort_budget // 6),
        MonthlyBudget(category_id=7, period=period_start, limit_amount=savings_budget),
        MonthlyBudget(category_id=8, period=period_start, limit_amount=base_budget // 5),
        MonthlyBudget(category_id=9, period=period_start, limit_amount=comfort_budget // 8),
        MonthlyBudget(category_id=10, period=period_start, limit_amount=base_budget // 27),
    ]
    
    for budget in budgets:
        existing = db.query(MonthlyBudget).filter(
            MonthlyBudget.category_id == budget.category_id,
            MonthlyBudget.period == budget.period
        ).first()
        if not existing:
            db.add(budget)
    
    db.commit()

if __name__ == "__main__":
    from app.core.config import SessionLocal
    db = SessionLocal()
    init_db()
    seed_initial_data(db)
    print("Database initialized!")
