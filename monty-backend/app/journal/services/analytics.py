"""Journal analytics for one user over the last N local days. Computed in Python:
text/tags are encrypted, and two people's journals are a few thousand rows at most."""

from collections import defaultdict
from datetime import date, timedelta
from statistics import mean

import pytz
from sqlalchemy.orm import Session

from app.finance.models import Category, CategoryGroup, Transaction, TransactionType
from app.finance.services.daily_budget import local_day_window
from app.journal.crypto import decrypt_json
from app.journal.models import JournalEntry
from app.journal.services.common import APP_TIMEZONE

LOW_MOOD = 2.5  # day average ≤ this is a "bad" day
HIGH_MOOD = 3.5  # day average ≥ this is a "good" day


def _round(value: float | None) -> float | None:
    return None if value is None else round(value, 2)


def _daily_spending(db: Session, start: date, end: date) -> dict[date, int]:
    """Household expenses per local day (savings excluded, hidden ones are filtered by the ORM hook)."""
    window_start, _ = local_day_window(start)
    _, window_end = local_day_window(end)
    rows = (
        db.query(Transaction.transaction_date, Transaction.amount)
        .join(Category)
        .filter(
            Transaction.transaction_date >= window_start,
            Transaction.transaction_date <= window_end,
            Category.type == TransactionType.EXPENSE,
            Category.group != CategoryGroup.SAVINGS,
        )
        .all()
    )
    out: dict[date, int] = defaultdict(int)
    for moment, amount in rows:
        out[pytz.utc.localize(moment).astimezone(APP_TIMEZONE).date()] += amount
    return out


def _bucket(values: list[int]) -> dict:
    return {"days": len(values), "avg_spent": round(mean(values)) if values else None}


def build_analytics(db: Session, user_id: int, *, today: date, days: int) -> dict:
    start = today - timedelta(days=days - 1)
    entries = (
        db.query(JournalEntry)
        .filter(JournalEntry.user_id == user_id, JournalEntry.entry_date >= start, JournalEntry.entry_date <= today)
        .order_by(JournalEntry.entry_date, JournalEntry.created_at)
        .all()
    )

    moods_by_day: dict[date, list[int]] = defaultdict(list)
    count_by_day: dict[date, int] = defaultdict(int)
    tag_moods: dict[str, list[int | None]] = defaultdict(list)
    emotion_counts: dict[str, int] = defaultdict(int)
    for e in entries:
        count_by_day[e.entry_date] += 1
        if e.mood is not None:
            moods_by_day[e.entry_date].append(e.mood)
        analysis = decrypt_json(e.analysis_enc) or {}
        for tag in analysis.get("tags", []):
            tag_moods[tag].append(e.mood)
        for emotion in analysis.get("emotions", []):
            emotion_counts[emotion] += 1

    day_mood = {d: mean(m) for d, m in moods_by_day.items()}
    series = []
    for i in range(days):
        d = start + timedelta(days=i)
        series.append({"date": d.isoformat(), "mood": _round(day_mood.get(d)), "entries": count_by_day.get(d, 0)})

    by_weekday: dict[int, list[float]] = defaultdict(list)
    for d, m in day_mood.items():
        by_weekday[d.weekday()].append(m)

    tags = sorted(tag_moods.items(), key=lambda kv: (-len(kv[1]), kv[0]))[:10]
    emotions = sorted(emotion_counts.items(), key=lambda kv: (-kv[1], kv[0]))[:8]

    spending = _daily_spending(db, start, today)
    low, mid, high = [], [], []
    points = []
    for d, m in sorted(day_mood.items()):
        spent = spending.get(d, 0)
        points.append({"date": d.isoformat(), "mood": _round(m), "spent": spent})
        (low if m <= LOW_MOOD else high if m >= HIGH_MOOD else mid).append(spent)

    all_moods = [m for ms in moods_by_day.values() for m in ms]
    return {
        "days": days,
        "start": start.isoformat(),
        "end": today.isoformat(),
        "entries_count": len(entries),
        "days_written": len(count_by_day),
        "average_mood": _round(mean(all_moods)) if all_moods else None,
        "series": series,
        "weekday": [{"weekday": w, "mood": _round(mean(by_weekday[w])) if by_weekday[w] else None} for w in range(7)],
        "tags": [
            {
                "tag": tag,
                "count": len(moods),
                "avg_mood": _round(mean([m for m in moods if m is not None])) if any(m is not None for m in moods) else None,
            }
            for tag, moods in tags
        ],
        "emotions": [{"emotion": name, "count": count} for name, count in emotions],
        "spending": {
            "points": points,
            "low_mood": _bucket(low),
            "mid_mood": _bucket(mid),
            "high_mood": _bucket(high),
        },
    }
