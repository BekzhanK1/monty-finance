"""Copy meal slots from one week to another (e.g. repeat last week)."""

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.food.models import FoodMealSlot


def copy_week_slots(
    db: Session,
    *,
    household_id: int,
    target_week_start: date,
    source_week_start: date | None = None,
) -> int:
    """
    Replace all slots in the target ISO week with copies from the source week.
    Default source = previous week (target_start - 7 days).
    Returns number of slots created.
    """
    if source_week_start is None:
        source_week_start = target_week_start - timedelta(days=7)

    target_end = target_week_start + timedelta(days=6)
    source_end = source_week_start + timedelta(days=6)

    db.query(FoodMealSlot).filter(
        FoodMealSlot.household_id == household_id,
        FoodMealSlot.slot_date >= target_week_start,
        FoodMealSlot.slot_date <= target_end,
    ).delete(synchronize_session=False)

    source_slots = (
        db.query(FoodMealSlot)
        .filter(
            FoodMealSlot.household_id == household_id,
            FoodMealSlot.slot_date >= source_week_start,
            FoodMealSlot.slot_date <= source_end,
        )
        .order_by(FoodMealSlot.slot_date, FoodMealSlot.slot_key)
        .all()
    )

    created = 0
    for s in source_slots:
        offset = (s.slot_date - source_week_start).days
        target_date = target_week_start + timedelta(days=offset)
        db.add(
            FoodMealSlot(
                household_id=household_id,
                slot_date=target_date,
                slot_key=s.slot_key,
                dish_id=s.dish_id,
                custom_title=s.custom_title,
                servings=s.servings,
                notes=s.notes,
            )
        )
        created += 1

    db.commit()
    return created
