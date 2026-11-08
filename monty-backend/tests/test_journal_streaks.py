from datetime import date, timedelta

from app.journal.services.streaks import compute_streak

# 2026-11-02 is a Monday; ISO weeks run Mon..Sun.
MON = date(2026, 11, 2)


def d(offset: int) -> date:
    return MON + timedelta(days=offset)


def test_empty():
    s = compute_streak([], d(0))
    assert (s.current, s.best, s.today_done) == (0, 0, False)


def test_consecutive_days_including_today():
    s = compute_streak([d(0), d(1), d(2)], d(2))
    assert (s.current, s.best, s.today_done) == (3, 3, True)


def test_today_not_written_yet_keeps_streak():
    s = compute_streak([d(0), d(1)], d(2))
    assert (s.current, s.today_done) == (2, False)


def test_one_gap_per_week_is_frozen():
    s = compute_streak([d(0), d(2), d(3)], d(3))  # Tuesday missed
    assert s.current == 3
    assert s.frozen_days == (d(1),)


def test_second_gap_in_same_week_breaks():
    s = compute_streak([d(0), d(2), d(4)], d(4))  # Tue and Thu missed
    assert s.current == 2  # Wed + Fri (Thu frozen), Tue gap ends it
    assert s.best == 2


def test_two_missed_days_in_a_row_same_week_break():
    s = compute_streak([d(0), d(3)], d(3))
    assert s.current == 1


def test_gaps_in_different_weeks_each_frozen():
    # Sunday (week 1) and Monday (week 2) both missed.
    s = compute_streak([d(4), d(5), d(8)], d(8))
    assert s.current == 3
    assert set(s.frozen_days) == {d(6), d(7)}


def test_yesterday_missed_and_today_open_is_still_alive_via_freeze():
    s = compute_streak([d(0), d(1)], d(3))  # Wed missed, Thu not written yet
    assert s.current == 2 and not s.today_done


def test_broken_streak_resets_but_best_is_kept():
    days = [d(i) for i in range(5)] + [d(10)]
    s = compute_streak(days, d(10))
    assert s.current == 1
    assert s.best == 5


def test_future_dates_ignored():
    s = compute_streak([d(0), d(5)], d(0))
    assert s.current == 1
