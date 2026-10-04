"""Analytics v2: pure functions over a period's transactions.

Routers turn ORM rows into `Tx` records (local calendar dates, a kind per
transaction) so everything here is plain data and unit-testable.
"""

from __future__ import annotations

import re
import statistics
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Literal

import pytz

APP_TIMEZONE = pytz.timezone("Asia/Almaty")

Kind = Literal["income", "expense", "savings"]


@dataclass(frozen=True)
class Tx:
    id: str
    amount: int
    kind: Kind
    group: str  # BASE | COMFORT | SAVINGS | INCOME
    category_id: int
    category_name: str
    category_icon: str
    comment: str | None
    user_id: int
    user_name: str
    day: date  # local calendar day


def local_day(utc_naive: datetime) -> date:
    return pytz.utc.localize(utc_naive).astimezone(APP_TIMEZONE).date()


def change_pct(current: int, previous: int) -> int | None:
    if previous == 0:
        return None
    return round((current - previous) * 100 / previous)


# ---------- totals ----------

@dataclass
class Totals:
    income: int = 0
    expense: int = 0
    savings: int = 0

    @property
    def balance(self) -> int:
        return self.income - self.expense

    @property
    def savings_rate(self) -> int | None:
        """Share of income that was saved (deposits) — None without income."""
        if self.income <= 0:
            return None
        return round(self.savings * 100 / self.income)

    def as_dict(self) -> dict:
        return {
            "income": self.income,
            "expense": self.expense,
            "savings": self.savings,
            "balance": self.balance,
            "savings_rate": self.savings_rate,
        }


def totals(txs: list[Tx]) -> Totals:
    t = Totals()
    for tx in txs:
        setattr(t, tx.kind, getattr(t, tx.kind) + tx.amount)
    return t


# ---------- period pace & forecast ----------

@dataclass(frozen=True)
class Period:
    start: date
    end: date
    today: date

    @property
    def days_total(self) -> int:
        return (self.end - self.start).days + 1

    @property
    def is_current(self) -> bool:
        return self.start <= self.today <= self.end

    @property
    def days_elapsed(self) -> int:
        if self.today < self.start:
            return 0
        if self.today > self.end:
            return self.days_total
        return (self.today - self.start).days + 1

    def days(self) -> list[date]:
        return [self.start + timedelta(days=i) for i in range(self.days_total)]


def daily_expense(txs: list[Tx], period: Period) -> dict[date, int]:
    by_day: dict[date, int] = {d: 0 for d in period.days()}
    for tx in txs:
        if tx.kind == "expense" and period.start <= tx.day <= period.end:
            by_day[tx.day] += tx.amount
    return by_day


def cumulative_series(txs: list[Tx], period: Period, budget_limit: int) -> list[dict]:
    """Per day: actual cumulative spend (until today), even budget pace, and a straight-line forecast."""
    by_day = daily_expense(txs, period)
    elapsed = period.days_elapsed
    spent_so_far = sum(v for d, v in by_day.items() if d <= period.today)
    per_day = spent_so_far / elapsed if elapsed else 0
    series = []
    running = 0
    for i, d in enumerate(period.days()):
        running += by_day[d]
        actual = running if d <= period.today else None
        forecast = None
        if period.is_current and d >= period.today:
            forecast = round(spent_so_far + per_day * (d - period.today).days)
        series.append({
            "date": d.isoformat(),
            "actual": actual,
            "pace": round(budget_limit * (i + 1) / period.days_total) if budget_limit else None,
            "forecast": forecast,
        })
    return series


def forecast(txs: list[Tx], period: Period, budget_limit: int) -> dict | None:
    if not period.is_current:
        return None
    by_day = daily_expense(txs, period)
    spent = sum(v for d, v in by_day.items() if d <= period.today)
    elapsed = max(period.days_elapsed, 1)
    projected = round(spent / elapsed * period.days_total)
    days_left = period.days_total - elapsed + 1  # today still counts
    remaining = budget_limit - spent
    return {
        "spent": spent,
        "projected": projected,
        "budget_limit": budget_limit,
        "over_by": max(projected - budget_limit, 0) if budget_limit else 0,
        "days_left": days_left,
        "safe_per_day": max(remaining // days_left, 0) if budget_limit and days_left else None,
    }


# ---------- structure (50/30/20) ----------

TARGET_SHARES = {"BASE": 50, "COMFORT": 30, "SAVINGS": 20}


def structure(txs: list[Tx]) -> dict:
    """Actual split of income into needs (BASE) / wants (COMFORT) / savings vs the 50/30/20 rule."""
    sums = defaultdict(int)
    income = 0
    for tx in txs:
        if tx.kind == "income":
            income += tx.amount
        elif tx.group in TARGET_SHARES:
            sums[tx.group] += tx.amount
    base = income or sum(sums.values())
    groups = []
    for group, target in TARGET_SHARES.items():
        amount = sums[group]
        groups.append({
            "group": group,
            "amount": amount,
            "share": round(amount * 100 / base) if base else 0,
            "target_share": target,
        })
    return {"basis": "income" if income else "spending", "basis_amount": base, "groups": groups}


# ---------- categories ----------

def categories(txs: list[Tx], prev: list[Tx], limits: dict[int, int]) -> list[dict]:
    cur: dict[int, dict] = {}
    for tx in txs:
        row = cur.setdefault(tx.category_id, {
            "category_id": tx.category_id, "name": tx.category_name, "icon": tx.category_icon,
            "group": tx.group, "type": tx.kind, "amount": 0, "count": 0,
        })
        row["amount"] += tx.amount
        row["count"] += 1
    previous = defaultdict(int)
    for tx in prev:
        previous[tx.category_id] += tx.amount
    out = []
    for row in cur.values():
        prev_amount = previous.get(row["category_id"], 0)
        out.append({
            **row,
            "previous_amount": prev_amount,
            "change_pct": change_pct(row["amount"], prev_amount),
            "limit": limits.get(row["category_id"]),
        })
    out.sort(key=lambda r: r["amount"], reverse=True)
    return out


# ---------- calendar & weekdays ----------

def weekday_averages(txs: list[Tx], period: Period) -> list[dict]:
    """Average expense per weekday over the elapsed part of the period (days without spending count as 0)."""
    by_day = daily_expense(txs, period)
    sums = defaultdict(int)
    counts = defaultdict(int)
    for d, amount in by_day.items():
        if d > period.today:
            continue
        sums[d.weekday()] += amount
        counts[d.weekday()] += 1
    return [
        {"weekday": wd, "average": round(sums[wd] / counts[wd]) if counts[wd] else 0, "days": counts[wd]}
        for wd in range(7)
    ]


def heatmap(txs: list[Tx], period: Period) -> list[dict]:
    by_day = daily_expense(txs, period)
    return [{"date": d.isoformat(), "expense": v, "future": d > period.today} for d, v in by_day.items()]


# ---------- notable transactions ----------

def tx_dict(tx: Tx) -> dict:
    return {
        "id": tx.id, "date": tx.day.isoformat(), "amount": tx.amount, "kind": tx.kind,
        "category_id": tx.category_id, "category_name": tx.category_name, "category_icon": tx.category_icon,
        "comment": tx.comment, "user_name": tx.user_name,
    }


def top_expenses(txs: list[Tx], limit: int = 5) -> list[dict]:
    expenses = sorted((t for t in txs if t.kind == "expense"), key=lambda t: t.amount, reverse=True)
    return [tx_dict(t) for t in expenses[:limit]]


def anomalies(txs: list[Tx], history: list[Tx], *, min_samples: int = 5) -> list[dict]:
    """Expenses far above what is usual for their category (median + 3×MAD, and ≥ 2× median)."""
    by_cat: dict[int, list[int]] = defaultdict(list)
    for tx in history:
        if tx.kind == "expense":
            by_cat[tx.category_id].append(tx.amount)
    out = []
    for tx in txs:
        if tx.kind != "expense":
            continue
        sample = by_cat.get(tx.category_id, [])
        if len(sample) < min_samples:
            continue
        med = statistics.median(sample)
        mad = statistics.median(abs(a - med) for a in sample) or med * 0.25
        if tx.amount >= max(med + 3 * mad, 2 * med) and tx.amount >= 5_000:
            out.append({**tx_dict(tx), "typical": round(med), "times": round(tx.amount / med, 1) if med else None})
    out.sort(key=lambda r: r["amount"], reverse=True)
    return out[:5]


def by_user(txs: list[Tx]) -> list[dict]:
    users: dict[int, dict] = {}
    for tx in txs:
        u = users.setdefault(tx.user_id, {"user_id": tx.user_id, "user_name": tx.user_name,
                                          "income": 0, "expense": 0, "savings": 0, "count": 0})
        u[tx.kind] += tx.amount
        u["count"] += 1
    return sorted(users.values(), key=lambda u: u["expense"], reverse=True)


# ---------- recurring payments ----------

_NOISE = re.compile(r"[\d\W_]+", re.UNICODE)


def _payee_key(tx: Tx) -> tuple[int, str]:
    words = _NOISE.sub(" ", (tx.comment or "").lower()).split()
    return tx.category_id, " ".join(words[:3])


def recurring(history: list[Tx], today: date) -> list[dict]:
    """Expenses that repeat at a steady interval (weekly or ~monthly) with a similar amount."""
    groups: dict[tuple[int, str], list[Tx]] = defaultdict(list)
    for tx in history:
        if tx.kind == "expense":
            groups[_payee_key(tx)].append(tx)
    out = []
    for (_, label), txs in groups.items():
        txs.sort(key=lambda t: t.day)
        # One charge per day at most (several coffees on one day are not a subscription).
        days = sorted({t.day for t in txs})
        if len(days) < 3:
            continue
        gaps = [(b - a).days for a, b in zip(days, days[1:])]
        interval = statistics.median(gaps)
        if not (6 <= interval <= 8 or 26 <= interval <= 35):
            continue
        if any(abs(g - interval) > max(3, interval * 0.2) for g in gaps):
            continue
        amounts = [t.amount for t in txs]
        avg = statistics.median(amounts)
        if any(abs(a - avg) > avg * 0.25 for a in amounts):
            continue
        last = days[-1]
        next_date = last + timedelta(days=round(interval))
        if (today - last).days > interval * 2:
            continue  # stopped
        sample = txs[-1]
        out.append({
            "category_id": sample.category_id,
            "category_name": sample.category_name,
            "category_icon": sample.category_icon,
            "label": (sample.comment or sample.category_name).strip()[:60],
            "amount": round(avg),
            "interval_days": round(interval),
            "cadence": "weekly" if interval <= 8 else "monthly",
            "last_date": last.isoformat(),
            "next_date": next_date.isoformat(),
            "count": len(days),
        })
    out.sort(key=lambda r: (r["next_date"], r["label"]))
    return out


# ---------- insights ----------

WEEKDAY_RU = ["понедельникам", "вторникам", "средам", "четвергам", "пятницам", "субботам", "воскресеньям"]


def insights(
    *,
    cur: Totals,
    prev: Totals,
    cats: list[dict],
    weekdays: list[dict],
    fc: dict | None,
    anomalies_found: list[dict],
    struct: dict,
) -> list[dict]:
    """Up to four short, rule-based observations, most important first."""
    out: list[dict] = []

    if fc and fc["budget_limit"]:
        if fc["over_by"] > 0:
            out.append({"tone": "warning", "title": "Темп выше бюджета",
                        "text": f"При текущем темпе к концу периода выйдет {fc['projected']:,} ₸ — на {fc['over_by']:,} ₸ больше плана.".replace(",", " ")})
        else:
            out.append({"tone": "good", "title": "Укладываетесь в бюджет",
                        "text": f"Прогноз на период — {fc['projected']:,} ₸ из {fc['budget_limit']:,} ₸.".replace(",", " ")})

    over = [c for c in cats if c["type"] == "expense" and c.get("limit") and c["amount"] > c["limit"]]
    if over:
        worst = max(over, key=lambda c: c["amount"] - c["limit"])
        out.append({"tone": "warning", "title": f"{worst['icon']} {worst['name']}: лимит превышен",
                    "text": f"Потрачено {worst['amount']:,} ₸ при лимите {worst['limit']:,} ₸.".replace(",", " ")})

    flagged = {c["category_id"] for c in over}
    growing = [c for c in cats if c["type"] == "expense" and c["category_id"] not in flagged and c["change_pct"] is not None
               and c["change_pct"] >= 30 and c["amount"] - c["previous_amount"] >= 10_000]
    if growing:
        top = max(growing, key=lambda c: c["amount"] - c["previous_amount"])
        out.append({"tone": "info", "title": f"{top['icon']} {top['name']} +{top['change_pct']}%",
                    "text": f"{top['amount']:,} ₸ против {top['previous_amount']:,} ₸ в прошлом периоде.".replace(",", " ")})

    if anomalies_found:
        a = anomalies_found[0]
        out.append({"tone": "info", "title": "Необычно крупная трата",
                    "text": f"{a['category_icon']} {a['category_name']}: {a['amount']:,} ₸ — обычно около {a['typical']:,} ₸.".replace(",", " ")})

    active = [w for w in weekdays if w["days"] > 0]
    if len(active) == 7:
        avg_all = sum(w["average"] for w in active) / 7
        peak = max(active, key=lambda w: w["average"])
        if avg_all and peak["average"] >= avg_all * 1.6:
            out.append({"tone": "info", "title": f"Больше всего — по {WEEKDAY_RU[peak['weekday']]}",
                        "text": f"В среднем {peak['average']:,} ₸ против {round(avg_all):,} ₸ в обычный день.".replace(",", " ")})

    savings = next((g for g in struct["groups"] if g["group"] == "SAVINGS"), None)
    if savings and struct["basis"] == "income" and cur.income:
        if savings["share"] >= savings["target_share"]:
            out.append({"tone": "good", "title": f"Откладываете {savings['share']}% дохода",
                        "text": "Это не меньше цели 20% из правила 50/30/20."})
        elif prev.savings_rate is not None and cur.savings_rate is not None and cur.savings_rate < prev.savings_rate:
            out.append({"tone": "info", "title": f"Откладываете {savings['share']}% дохода",
                        "text": f"В прошлом периоде было {prev.savings_rate}%. Цель правила 50/30/20 — 20%."})
    return out[:4]
