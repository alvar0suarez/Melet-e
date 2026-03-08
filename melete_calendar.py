"""
Melete Calendar — Events and Pomodoro state.
"""
import json
import uuid
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Optional
import calendar as cal_module


def _events_path() -> Path:
    from melete_core import _vault
    return _vault() / "Calendar" / "events.json"


def _load_events() -> list:
    p = _events_path()
    if p.exists():
        try:
            return json.loads(p.read_text())
        except Exception:
            pass
    return []


def _save_events(events: list):
    _events_path().write_text(json.dumps(events, indent=2))


def get_events() -> list:
    return _load_events()


def add_event(title: str, date_str: str, start_h: int, end_h: int,
              color: str = "#818cf8", notes: str = "",
              recurring: str = "none") -> dict:
    events = _load_events()
    event = {
        "id": str(uuid.uuid4()),
        "title": title,
        "date": date_str,
        "start_h": start_h,
        "end_h": end_h,
        "color": color,
        "notes": notes,
        "recurring": recurring,
        "created": datetime.now().isoformat(),
    }
    events.append(event)
    _save_events(events)
    return event


def update_event(event_id: str, updates: dict) -> bool:
    events = _load_events()
    for ev in events:
        if ev["id"] == event_id:
            ev.update(updates)
            _save_events(events)
            return True
    return False


def delete_event(event_id: str) -> bool:
    events = _load_events()
    new_events = [e for e in events if e["id"] != event_id]
    if len(new_events) == len(events):
        return False
    _save_events(new_events)
    return True


def get_events_for_date(date_str: str) -> list:
    return [e for e in _load_events() if e.get("date") == date_str]


def get_events_for_week(week_start_str: str) -> dict:
    """Returns dict {date_str: [events]}"""
    start = datetime.strptime(week_start_str, "%Y-%m-%d").date()
    result = {}
    for i in range(7):
        d = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        result[d] = get_events_for_date(d)
    return result


def month_calendar(year: int, month: int) -> list:
    """Returns 6-week grid of date strings (or None for padding)."""
    c = cal_module.Calendar(firstweekday=0)
    weeks = c.monthdatescalendar(year, month)
    result = []
    for week in weeks:
        row = []
        for d in week:
            row.append(d.strftime("%Y-%m-%d") if d.month == month else None)
        result.append(row)
    return result


def month_calendar_full(year: int, month: int) -> list:
    """Returns 6-week grid including neighboring month dates."""
    c = cal_module.Calendar(firstweekday=0)
    weeks = c.monthdatescalendar(year, month)
    result = []
    for week in weeks:
        row = [d.strftime("%Y-%m-%d") for d in week]
        result.append(row)
    return result
