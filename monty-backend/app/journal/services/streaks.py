"""Streaks: consecutive local days with at least one entry.

Rules (docs/journal/decisions.md, J3):
- Today without an entry does not break the streak yet — it is still "in progress".
- One missed day per ISO week is covered automatically by a freeze; a second gap in
  the same week ends the streak. Frozen days keep the chain but do not add to it.
"""

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Iterable


@dataclass(frozen=True)
class Streak:
    current: int
    best: int
    today_done: bool
    frozen_days: tuple[date, ...]  # freezes used by the current streak, newest first


def _week(day: date) -> tuple[int, int]:
    year, week, _ = day.isocalendar()
    return year, week


def _walk_back(days: set[date], start: date) -> tuple[int, list[date]]:
    """Length of the chain ending at `start` and the freezes it used.

    A missed day becomes a *pending* freeze; it only counts once an earlier entry
    proves the chain continues behind it.
    """
    count = 0
    frozen: list[date] = []
    pending: list[date] = []
    used_weeks: set[tuple[int, int]] = set()
    earliest = min(days)
    day = start
    while day >= earliest:
        if day in days:
            count += 1
            frozen.extend(pending)
            pending.clear()
        else:
            week = _week(day)
            if week in used_weeks:
                break
            used_weeks.add(week)
            pending.append(day)
        day -= timedelta(days=1)
    return count, frozen


def compute_streak(entry_dates: Iterable[date], today: date) -> Streak:
    days = {d for d in entry_dates if d <= today}
    if not days:
        return Streak(current=0, best=0, today_done=False, frozen_days=())
    today_done = today in days
    current, frozen = _walk_back(days, today if today_done else today - timedelta(days=1))
    # Best: walk back from the last day of every run (a day whose next day has no entry).
    best = max(_walk_back(days, d)[0] for d in days if d + timedelta(days=1) not in days)
    return Streak(current=current, best=max(best, current), today_done=today_done, frozen_days=tuple(frozen))
