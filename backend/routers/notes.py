import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.config import get_vault_path
from backend.database import get_db

router = APIRouter(prefix="/api/notes", tags=["notes"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    title: str
    content: str = ""
    folder: str = ""


class NoteUpdate(BaseModel):
    title: str
    content: str
    folder: str = ""


# ── Helpers ────────────────────────────────────────────────────────────────────

def _note_path(folder: str, title: str) -> Path:
    base = get_vault_path() / "Notas"
    if folder:
        return base / folder / f"{title}.md"
    return base / f"{title}.md"


def _write_md(folder: str, title: str, content: str) -> None:
    path = _note_path(folder, title)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _delete_md(folder: str, title: str) -> None:
    path = _note_path(folder, title)
    if path.exists():
        path.unlink()
    parent = path.parent
    notas_root = get_vault_path() / "Notas"
    while parent != notas_root and parent.exists():
        try:
            parent.rmdir()
        except OSError:
            break
        parent = parent.parent


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _extract_wiki_links(content: str) -> list[str]:
    return re.findall(r'\[\[([^\]]+)\]\]', content)


def _sync_links(conn, source_id: str, content: str) -> None:
    conn.execute("DELETE FROM links WHERE source_id = ?", (source_id,))
    for title in set(_extract_wiki_links(content)):
        conn.execute(
            "INSERT OR IGNORE INTO links (source_id, target_title) VALUES (?, ?)",
            (source_id, title),
        )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("")
def list_notes():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, title, folder, updated_at FROM notes ORDER BY updated_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.post("", status_code=201)
def create_note(payload: NoteCreate):
    note_id = str(uuid.uuid4())
    now = _now()
    conn = get_db()
    conn.execute(
        "INSERT INTO notes (id, title, content, folder, created_at, updated_at) VALUES (?,?,?,?,?,?)",
        (note_id, payload.title, payload.content, payload.folder, now, now),
    )
    _sync_links(conn, note_id, payload.content)
    conn.commit()
    conn.close()
    _write_md(payload.folder, payload.title, payload.content)
    return {"id": note_id, "created_at": now, "updated_at": now}


@router.get("/{note_id}/backlinks")
def get_backlinks(note_id: str):
    conn = get_db()
    target = conn.execute("SELECT title FROM notes WHERE id = ?", (note_id,)).fetchone()
    if target is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    rows = conn.execute(
        """
        SELECT n.id, n.title, n.folder
        FROM links l
        JOIN notes n ON n.id = l.source_id
        WHERE l.target_title = ?
        """,
        (target["title"],),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/{note_id}")
def get_note(note_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    return dict(row)


@router.put("/{note_id}")
def update_note(note_id: str, payload: NoteUpdate):
    conn = get_db()
    old = conn.execute(
        "SELECT title, folder FROM notes WHERE id = ?", (note_id,)
    ).fetchone()
    if old is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Nota no encontrada")

    now = _now()
    conn.execute(
        "UPDATE notes SET title=?, content=?, folder=?, updated_at=? WHERE id=?",
        (payload.title, payload.content, payload.folder, now, note_id),
    )
    _sync_links(conn, note_id, payload.content)
    conn.commit()
    conn.close()

    if old["title"] != payload.title or old["folder"] != payload.folder:
        _delete_md(old["folder"], old["title"])

    _write_md(payload.folder, payload.title, payload.content)
    return {"updated_at": now}


@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: str):
    conn = get_db()
    row = conn.execute(
        "SELECT title, folder FROM notes WHERE id = ?", (note_id,)
    ).fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Nota no encontrada")
    conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()
    _delete_md(row["folder"], row["title"])
