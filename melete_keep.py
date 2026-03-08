"""
Melete Tablero — card board: text notes, checklists, course/plan trackers.
"""
import json
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

# ─── Plan text parser ───────────────────────────────────────────────────────

_SECTION_RE = re.compile(
    r'^(Fase|Módulo|Modulo|Phase|Module|Parte|Part|Sección|Section|Semana|Week|Unit|Unidad)\s',
    re.IGNORECASE
)

_PLAN_COLORS = [
    '#1a1f35', '#042f2e', '#2d1b4e', '#2d1515',
    '#2d1f08', '#0d2d1a', '#1e1b4b', '#21262d',
]


def parse_plan_text(text: str) -> list:
    """Parse a structured plan text into a list of card dicts (not yet saved)."""
    lines = text.strip().splitlines()
    cards: list = []
    intro: list = []
    title = None
    items: list = []
    in_sub = False
    color_idx = 0

    def flush():
        nonlocal title, items, in_sub, color_idx
        if not title:
            return
        cards.append({
            "id": str(uuid.uuid4()),
            "type": "course",
            "title": title,
            "content": "",
            "items": [
                {"id": str(uuid.uuid4()), "text": it["text"], "done": False, "indent": it["indent"]}
                for it in items
            ],
            "color": _PLAN_COLORS[color_idx % len(_PLAN_COLORS)],
            "pinned": False,
            "created": datetime.now().isoformat(),
            "updated": datetime.now().isoformat(),
        })
        title = None
        items = []
        in_sub = False
        color_idx += 1

    for line in lines:
        s = line.strip()
        if not s:
            in_sub = False
            continue
        if _SECTION_RE.match(s):
            flush()
            title = s
            continue
        if title is None:
            intro.append(s)
            continue
        # Sub-header: short line ending with ':' and no double-quote
        if s.endswith(':') and len(s) < 72 and '"' not in s and "'" not in s:
            in_sub = True
            items.append({"text": s, "indent": -1})  # -1 = section label, non-checkable
            continue
        clean = s.lstrip('•*-–').strip()
        if clean:
            items.append({"text": clean, "indent": 1 if in_sub else 0})

    flush()

    if intro:
        cards.insert(0, {
            "id": str(uuid.uuid4()),
            "type": "text",
            "title": intro[0],
            "content": "\n".join(intro[1:]).strip(),
            "items": [],
            "color": "#21262d",
            "pinned": True,
            "created": datetime.now().isoformat(),
            "updated": datetime.now().isoformat(),
        })

    return cards


def import_plan_cards(text: str) -> list:
    """Parse text and bulk-create cards. Returns list of created cards."""
    new_cards = parse_plan_text(text)
    if not new_cards:
        return []
    existing = _load()
    existing.extend(new_cards)
    _save(existing)
    return new_cards


def scan_plans_folder() -> int:
    """Scan vault/Plans/ for unimported .txt/.md files. Returns count of new cards created."""
    from melete_core import _vault
    plans_dir = _vault() / "Plans"
    plans_dir.mkdir(exist_ok=True)
    log_file = plans_dir / ".imported.json"
    imported: set = set()
    if log_file.exists():
        try:
            imported = set(json.loads(log_file.read_text(encoding="utf-8")))
        except Exception:
            pass

    created = 0
    for f in plans_dir.iterdir():
        if f.suffix not in ('.txt', '.md') or f.name.startswith('.'):
            continue
        if f.name in imported:
            continue
        try:
            text = f.read_text(encoding="utf-8")
            cards = import_plan_cards(text)
            created += len(cards)
            imported.add(f.name)
        except Exception:
            pass

    log_file.write_text(json.dumps(sorted(imported), ensure_ascii=False), encoding="utf-8")
    return created


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
