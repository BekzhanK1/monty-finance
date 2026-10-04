from datetime import date, timedelta

from app.finance.services import analytics_service as av

D0 = date(2026, 9, 10)


def tx(day, amount, kind="expense", group="BASE", cat=1, name="Продукты", comment=None, user=1, tid=None):
    return av.Tx(id=tid or f"{day}-{amount}-{cat}", amount=amount, kind=kind, group=group, category_id=cat,
                 category_name=name, category_icon="•", comment=comment, user_id=user,
                 user_name="Аня" if user == 1 else "Бек", day=day)


PERIOD = av.Period(start=D0, end=D0 + timedelta(days=29), today=D0 + timedelta(days=9))  # day 10 of 30


def test_period_and_totals():
    assert (PERIOD.days_total, PERIOD.days_elapsed, PERIOD.is_current) == (30, 10, True)
    t = av.totals([tx(D0, 400_000, "income", "INCOME"), tx(D0, 50_000), tx(D0, 80_000, "savings", "SAVINGS")])
    assert t.as_dict() == {"income": 400_000, "expense": 50_000, "savings": 80_000, "balance": 350_000, "savings_rate": 20}
    assert av.totals([]).savings_rate is None


def test_forecast_and_cumulative():
    txs = [tx(D0 + timedelta(days=i), 10_000) for i in range(10)] + [tx(D0 + timedelta(days=20), 99_999)]
    fc = av.forecast(txs, PERIOD, budget_limit=240_000)
    # 100k in 10 days → 300k over 30; the future-dated 99 999 is ignored.
    assert fc == {"spent": 100_000, "projected": 300_000, "budget_limit": 240_000, "over_by": 60_000,
                  "days_left": 21, "safe_per_day": 6666}
    series = av.cumulative_series(txs, PERIOD, 240_000)
    assert series[9] == {"date": "2026-09-19", "actual": 100_000, "pace": 80_000, "forecast": 100_000}
    assert series[29]["actual"] is None and series[29]["forecast"] == 300_000 and series[29]["pace"] == 240_000
    assert series[0]["forecast"] is None
    past = av.Period(start=D0, end=D0 + timedelta(days=29), today=D0 + timedelta(days=60))
    assert av.forecast(txs, past, 240_000) is None


def test_structure_against_50_30_20():
    s = av.structure([
        tx(D0, 500_000, "income", "INCOME"),
        tx(D0, 250_000, group="BASE"),
        tx(D0, 200_000, group="COMFORT", cat=2),
        tx(D0, 50_000, "savings", "SAVINGS", cat=3),
    ])
    assert s["basis"] == "income"
    assert [(g["group"], g["share"], g["target_share"]) for g in s["groups"]] == [
        ("BASE", 50, 50), ("COMFORT", 40, 30), ("SAVINGS", 10, 20)]
    assert av.structure([tx(D0, 100)])["basis"] == "spending"


def test_categories_with_change_and_limit():
    rows = av.categories([tx(D0, 30_000), tx(D0, 20_000), tx(D0, 5_000, group="COMFORT", cat=2, name="Кафе")],
                         [tx(D0, 40_000)], {1: 45_000})
    assert rows[0] == {"category_id": 1, "name": "Продукты", "icon": "•", "group": "BASE", "type": "expense",
                       "amount": 50_000, "count": 2, "previous_amount": 40_000, "change_pct": 25, "limit": 45_000}
    assert rows[1]["change_pct"] is None and rows[1]["limit"] is None


def test_weekdays_and_heatmap_only_count_elapsed_days():
    txs = [tx(D0, 7_000)]  # D0 is a Thursday
    wd = av.weekday_averages(txs, PERIOD)
    assert wd[3] == {"weekday": 3, "average": 3_500, "days": 2}  # two Thursdays elapsed
    hm = av.heatmap(txs, PERIOD)
    assert len(hm) == 30 and hm[0] == {"date": "2026-09-10", "expense": 7_000, "future": False}
    assert hm[-1]["future"] is True


def test_anomalies_need_history_and_a_big_jump():
    history = [tx(D0 - timedelta(days=i), a) for i, a in enumerate([4000, 5000, 4500, 5200, 4800, 5100], 1)]
    big = tx(D0, 25_000, comment="Банкет", tid="big")
    [found] = av.anomalies([big, tx(D0, 6_000)], history)
    assert (found["id"], found["typical"], found["times"]) == ("big", 4900, 5.1)
    assert av.anomalies([big], history[:3]) == []


def test_recurring_detects_monthly_and_weekly_and_ignores_noise():
    today = date(2026, 10, 4)
    netflix = [tx(date(2026, m, 5), 4_990, cat=7, name="Подписки", comment="Netflix") for m in (6, 7, 8, 9)]
    gym = [tx(date(2026, 9, 1) + timedelta(days=7 * i), 3_000, cat=8, name="Спорт", comment="Йога #12") for i in range(5)]
    coffee = [tx(date(2026, 9, d), a, cat=9, name="Кафе", comment="кофе") for d, a in [(1, 900), (2, 1500), (9, 700), (20, 2200)]]
    stopped = [tx(date(2026, m, 1), 2_000, cat=10, name="Связь", comment="Beeline") for m in (3, 4, 5)]
    found = av.recurring(netflix + gym + coffee + stopped, today)
    assert [(r["label"], r["cadence"], r["amount"], r["next_date"]) for r in found] == [
        ("Netflix", "monthly", 4_990, "2026-10-06"),
        ("Йога #12", "weekly", 3_000, "2026-10-06"),
    ]


def test_insights_pick_the_important_things():
    cats = [{"category_id": 2, "name": "Кафе", "icon": "☕", "group": "COMFORT", "type": "expense",
             "amount": 60_000, "count": 9, "previous_amount": 30_000, "change_pct": 100, "limit": 50_000}]
    out = av.insights(
        cur=av.Totals(income=400_000, expense=300_000, savings=100_000),
        prev=av.Totals(income=400_000, expense=250_000, savings=60_000),
        cats=cats, weekdays=[], anomalies_found=[],
        fc={"projected": 320_000, "budget_limit": 300_000, "over_by": 20_000},
        struct={"basis": "income", "groups": [{"group": "SAVINGS", "share": 25, "target_share": 20}]},
    )
    assert [i["title"] for i in out] == [
        # Growth for Кафе is not repeated: the over-limit card already covers it.
        "Темп выше бюджета", "☕ Кафе: лимит превышен", "Откладываете 25% дохода",
    ]
    assert "320 000 ₸" in out[0]["text"]
