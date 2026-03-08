"""
Melete Keep — Google Keep-style cards: text notes, checklists, course trackers.
"""
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional


def _keep_path() -> Path:
    from melete_core import _vault
    p = _vault() / "Keep"
    p.mkdir(exist_ok=True)
    return p / "cards.json"


def _load() -> list:
    p = _keep_path()
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            pass
    return []


def _save(cards: list):
    _keep_path().write_text(json.dumps(cards, indent=2, ensure_ascii=False), encoding="utf-8")


def list_cards() -> list:
    cards = _load()
    # Pinned first, then by updated desc
    return sorted(cards, key=lambda c: (not c.get("pinned", False), c.get("updated", "")), reverse=False)


def get_card(card_id: str) -> Optional[dict]:
    for c in _load():
        if c["id"] == card_id:
            return c
    return None


def create_card(type_: str, title: str = "", content: str = "",
                items: list = None, color: str = "#21262d",
                pinned: bool = False) -> dict:
    card = {
        "id": str(uuid.uuid4()),
        "type": type_,   # "text" | "checklist" | "course"
        "title": title,
        "content": content,
        "items": items or [],   # [{id, text, done, indent}]
        "color": color,
        "pinned": pinned,
        "created": datetime.now().isoformat(),
        "updated": datetime.now().isoformat(),
    }
    cards = _load()
    cards.append(card)
    _save(cards)
    return card


def update_card(card_id: str, updates: dict) -> Optional[dict]:
    cards = _load()
    for c in cards:
        if c["id"] == card_id:
            c.update(updates)
            c["updated"] = datetime.now().isoformat()
            _save(cards)
            return c
    return None


def delete_card(card_id: str) -> bool:
    cards = _load()
    new_cards = [c for c in cards if c["id"] != card_id]
    if len(new_cards) == len(cards):
        return False
    _save(new_cards)
    return True


def toggle_item(card_id: str, item_id: str) -> Optional[dict]:
    cards = _load()
    for c in cards:
        if c["id"] == card_id:
            for item in c.get("items", []):
                if item["id"] == item_id:
                    item["done"] = not item.get("done", False)
            c["updated"] = datetime.now().isoformat()
            _save(cards)
            return c
    return None


def add_item(card_id: str, text: str, indent: int = 0) -> Optional[dict]:
    cards = _load()
    for c in cards:
        if c["id"] == card_id:
            c.setdefault("items", []).append({
                "id": str(uuid.uuid4()),
                "text": text,
                "done": False,
                "indent": indent,
            })
            c["updated"] = datetime.now().isoformat()
            _save(cards)
            return c
    return None


def delete_item(card_id: str, item_id: str) -> Optional[dict]:
    cards = _load()
    for c in cards:
        if c["id"] == card_id:
            c["items"] = [i for i in c.get("items", []) if i["id"] != item_id]
            c["updated"] = datetime.now().isoformat()
            _save(cards)
            return c
    return None
