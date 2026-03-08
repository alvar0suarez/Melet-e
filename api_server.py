"""
Melete API Server — FastAPI REST backend + static file serving.
Accessible from desktop (pywebview) and mobile (browser on same network).
"""
import mimetypes
import os
from pathlib import Path
from typing import Optional, List, Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import melete_core as core
import melete_calendar as cal
import melete_versions as ver
import melete_keep as keep

app = FastAPI(title="Melete API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Ping ──────────────────────────────────────────────────────────────────

@app.get("/api/ping")
def ping():
    return {"ok": True}


@app.get("/api/debug/vault")
def debug_vault():
    """Shows vault structure for diagnosing missing files."""
    from pathlib import Path
    settings = Path.home() / ".melete_settings.json"
    vault_path = core.get_vault_path()
    result: dict = {
        "settings_file": str(settings),
        "settings_exists": settings.exists(),
        "vault_path": vault_path,
    }
    if vault_path:
        vp = Path(vault_path)
        files_dir = vp / "Files"
        result["vault_exists"] = vp.exists()
        result["files_dir"] = str(files_dir)
        result["files_dir_exists"] = files_dir.exists()
        if files_dir.exists():
            all_files = []
            for f in files_dir.rglob("*"):
                if f.is_file():
                    all_files.append({"name": f.name, "ext": f.suffix.lower(), "size_kb": round(f.stat().st_size / 1024, 1)})
            result["all_files"] = all_files[:50]
            result["supported_files"] = [f for f in all_files if f["ext"] in {".pdf", ".epub", ".txt"}]
    return result


# ─── Vault ─────────────────────────────────────────────────────────────────

@app.get("/api/vault")
def get_vault():
    path = core.get_vault_path()
    return {"path": path, "valid": path is not None}


class SetupVaultRequest(BaseModel):
    path: str

@app.post("/api/vault/setup")
def setup_vault(req: SetupVaultRequest):
    ok = core.setup_vault(req.path)
    if ok:
        try:
            core.load_all_plugins()
        except Exception:
            pass
    return {"ok": ok}


# ─── Documents ─────────────────────────────────────────────────────────────

@app.get("/api/documents")
def list_documents():
    return core.list_documents()


class BookMetaRequest(BaseModel):
    path: str
    meta: dict

@app.post("/api/documents/meta")
def update_book_meta(req: BookMetaRequest):
    return {"ok": core.update_book_meta(req.path, req.meta)}


class ReadingSessionRequest(BaseModel):
    path: str
    seconds: int  # time spent reading this session

@app.post("/api/documents/reading-session")
def track_reading_session(req: ReadingSessionRequest):
    from datetime import datetime
    existing = core._load_books_meta().get(req.path, {})
    prev_seconds = existing.get("total_read_seconds", 0)
    return {"ok": core.update_book_meta(req.path, {
        "last_opened": datetime.now().isoformat(),
        "total_read_seconds": prev_seconds + max(0, req.seconds),
    })}


@app.get("/api/documents/meta/{path:path}")
def get_book_meta(path: str):
    return core.get_book_meta(path)


# Serve vault files (for PDF.js and EPUB in browser/mobile)
@app.get("/vault-files/{file_path:path}")
def serve_vault_file(file_path: str):
    vault = core._vault()
    full_path = vault / "Files" / file_path
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    # Security: ensure path is within vault
    try:
        full_path.resolve().relative_to((vault / "Files").resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    mime = mimetypes.guess_type(str(full_path))[0] or "application/octet-stream"
    return FileResponse(str(full_path), media_type=mime)


# ─── PDF ───────────────────────────────────────────────────────────────────

@app.get("/api/pdf/count/{path:path}")
def pdf_page_count(path: str):
    return {"count": core.get_pdf_page_count(path)}


@app.get("/api/pdf/text/{path:path}")
def pdf_text(path: str, page: int = Query(0)):
    return {"text": core.extract_pdf_text(path, page)}


# ─── EPUB ──────────────────────────────────────────────────────────────────

@app.get("/api/epub/{path:path}")
def load_epub(path: str):
    return core.load_epub(path)


# ─── Notes ─────────────────────────────────────────────────────────────────

@app.get("/api/notes")
def list_notes():
    return core.list_notes()


@app.get("/api/notes/search")
def search_notes(q: str = Query("")):
    return core.search_notes(q)


@app.get("/api/graph")
def get_graph():
    return core.get_graph_data()


@app.get("/api/notes/{name}")
def get_note(name: str):
    return {"content": core.get_note(name)}


class SaveNoteRequest(BaseModel):
    content: str
    snapshot: bool = False
    snapshot_msg: str = ""

@app.post("/api/notes/{name}")
def save_note(name: str, req: SaveNoteRequest):
    ok = core.save_note(name, req.content)
    if ok and req.snapshot:
        vault = core._vault()
        ver.save_snapshot(vault, name, req.snapshot_msg)
    return {"ok": ok}


@app.delete("/api/notes/{name}")
def delete_note(name: str):
    return {"ok": core.delete_note(name)}


class RenameNoteRequest(BaseModel):
    new_name: str

@app.post("/api/notes/{name}/rename")
def rename_note(name: str, req: RenameNoteRequest):
    return {"ok": core.rename_note(name, req.new_name)}


@app.post("/api/notes/new")
def new_note():
    return {"name": core.new_note()}


class AppendHighlightRequest(BaseModel):
    text: str
    source: str = ""
    color: str = "yellow"

@app.post("/api/notes/{name}/highlight")
def append_highlight(name: str, req: AppendHighlightRequest):
    note_name = core.append_book_highlight(name, req.text, req.source, req.color)
    return {"ok": True, "note_name": note_name}


@app.get("/api/notes/{name}/backlinks")
def get_backlinks(name: str):
    return core.get_backlinks(name)


@app.get("/api/notes/{name}/backlinks-context")
def get_backlinks_context(name: str):
    return core.get_backlinks_with_context(name)


# ─── Annotations ───────────────────────────────────────────────────────────

@app.get("/api/annotations/{stem}")
def load_annotations(stem: str):
    return core.load_annotations(stem)


class SaveAnnotationsRequest(BaseModel):
    annotations: list

@app.post("/api/annotations/{stem}")
def save_annotations(stem: str, req: SaveAnnotationsRequest):
    return {"ok": core.save_annotations(stem, req.annotations)}


# ─── Flashcard Decks ───────────────────────────────────────────────────────

@app.get("/api/decks")
def get_decks():
    return core.list_decks()


class CreateDeckRequest(BaseModel):
    name: str

@app.post("/api/decks")
def create_deck(req: CreateDeckRequest):
    return {"ok": core.create_deck(req.name)}

@app.delete("/api/decks/{name}")
def delete_deck(name: str):
    return {"ok": core.delete_deck(name)}

@app.get("/api/decks/{deck}/cards")
def get_cards(deck: str):
    return core.list_cards(deck)

@app.get("/api/vocab")
def get_vocab():
    return core.list_vocab_words()


@app.get("/api/decks/{deck}/due")
def get_due(deck: str):
    return core.get_due_cards(deck)

class SaveCardRequest(BaseModel):
    card: dict

@app.post("/api/decks/{deck}/cards")
def save_card(deck: str, req: SaveCardRequest):
    return core.save_card(deck, req.card)

@app.delete("/api/decks/{deck}/cards/{card_id}")
def delete_card(deck: str, card_id: str):
    return {"ok": core.delete_card(deck, card_id)}

class ReviewRequest(BaseModel):
    rating: str  # again|hard|good|easy

@app.post("/api/decks/{deck}/cards/{card_id}/review")
def review_card(deck: str, card_id: str, req: ReviewRequest):
    return core.review_card(deck, card_id, req.rating)


# ─── AI ────────────────────────────────────────────────────────────────────

@app.get("/api/ai/providers")
def get_providers():
    return core.get_providers()


@app.get("/api/ai/config")
def get_ai_config():
    return core.get_ai_config()


@app.post("/api/ai/config")
def save_ai_config(config: dict):
    return {"ok": core.save_ai_config(config)}


class AIChatRequest(BaseModel):
    messages: list
    config: Optional[dict] = None

@app.post("/api/ai/chat")
def ai_chat(req: AIChatRequest):
    result = core.ai_chat(req.messages, req.config)
    return {"response": result}


@app.post("/api/ai/test")
def test_ai(config: dict):
    return core.test_ai_connection(config)


# ─── Collections ───────────────────────────────────────────────────────────

@app.get("/api/collections")
def get_collections():
    return core.get_collections()


class AddCollectionRequest(BaseModel):
    name: str

@app.post("/api/collections")
def add_collection(req: AddCollectionRequest):
    return {"ok": core.add_collection(req.name)}


@app.delete("/api/collections/{name}")
def delete_collection(name: str):
    return {"ok": core.delete_collection(name)}


# ─── Calendar ──────────────────────────────────────────────────────────────

@app.get("/api/calendar/events")
def get_events():
    return cal.get_events()


class AddEventRequest(BaseModel):
    title: str
    date: str
    start_h: int = 9
    end_h: int = 10
    color: str = "#818cf8"
    notes: str = ""
    recurring: str = "none"

@app.post("/api/calendar/events")
def add_event(req: AddEventRequest):
    return cal.add_event(req.title, req.date, req.start_h, req.end_h, req.color, req.notes, req.recurring)


@app.delete("/api/calendar/events/{event_id}")
def delete_event(event_id: str):
    return {"ok": cal.delete_event(event_id)}


@app.get("/api/calendar/date/{date_str}")
def events_for_date(date_str: str):
    return cal.get_events_for_date(date_str)


@app.get("/api/calendar/week/{week_start}")
def events_for_week(week_start: str):
    return cal.get_events_for_week(week_start)


@app.get("/api/calendar/month/{year}/{month}")
def month_cal(year: int, month: int):
    return {"weeks": cal.month_calendar_full(year, month)}


# ─── Source Control ────────────────────────────────────────────────────────

@app.get("/api/sc/changes")
def sc_changes():
    vault = core._vault()
    return ver.list_changed_files(vault)


@app.get("/api/sc/versions/{stem}")
def sc_versions(stem: str):
    vault = core._vault()
    return ver.list_versions(vault, stem)


class SnapshotRequest(BaseModel):
    message: str = ""

@app.post("/api/sc/snapshot/{stem}")
def sc_snapshot(stem: str, req: SnapshotRequest):
    vault = core._vault()
    return {"ok": ver.save_snapshot(vault, stem, req.message)}


@app.post("/api/sc/snapshot-all")
def sc_snapshot_all():
    vault = core._vault()
    count = ver.snapshot_all(vault)
    return {"ok": True, "count": count}


@app.get("/api/sc/diff/{stem}")
def sc_diff(stem: str):
    vault = core._vault()
    return ver.diff_with_last(vault, stem)


@app.post("/api/sc/restore/{stem}/{ts}")
def sc_restore(stem: str, ts: str):
    vault = core._vault()
    content = ver.restore_version(vault, stem, ts)
    return {"content": content, "ok": bool(content)}


@app.post("/api/sc/revert/{stem}")
def sc_revert(stem: str):
    """Discard unsaved changes: restore to last snapshot, or delete if brand new."""
    vault = core._vault()
    versions = ver.list_versions(vault, stem)
    if versions:
        content = ver.restore_version(vault, stem, versions[0]["ts"])
        if content is not None:
            core.save_note(stem, content)
            return {"ok": True, "action": "restored"}
        return {"ok": False, "action": "none"}
    else:
        ok = core.delete_note(stem)
        return {"ok": ok, "action": "deleted"}


@app.post("/api/sc/backup")
def sc_backup():
    vault = core._vault()
    path = ver.create_backup(vault)
    return {"path": path}


# ─── Plugins ───────────────────────────────────────────────────────────────

@app.get("/api/plugins")
def list_plugins():
    return core.list_plugins()


class TogglePluginRequest(BaseModel):
    active: bool

@app.post("/api/plugins/{plugin_id}/toggle")
def toggle_plugin(plugin_id: str, req: TogglePluginRequest):
    # Future: implement enable/disable
    return {"ok": True}


# ─── Keep ──────────────────────────────────────────────────────────────────

@app.get("/api/keep/cards")
def keep_list_cards():
    return keep.list_cards()


class CreateCardRequest(BaseModel):
    type_: str
    title: str = ""
    content: str = ""
    items: list = []
    color: str = "#21262d"
    pinned: bool = False

@app.post("/api/keep/cards")
def keep_create_card(req: CreateCardRequest):
    return keep.create_card(req.type_, req.title, req.content, req.items, req.color, req.pinned)


@app.post("/api/keep/cards/{card_id}")
def keep_update_card(card_id: str, updates: dict):
    result = keep.update_card(card_id, updates)
    if result is None:
        raise HTTPException(status_code=404, detail="Card not found")
    return result


@app.delete("/api/keep/cards/{card_id}")
def keep_delete_card(card_id: str):
    return {"ok": keep.delete_card(card_id)}


@app.post("/api/keep/cards/{card_id}/items/{item_id}/toggle")
def keep_toggle_item(card_id: str, item_id: str):
    result = keep.toggle_item(card_id, item_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Card or item not found")
    return result


class AddItemRequest(BaseModel):
    text: str
    indent: int = 0

@app.post("/api/keep/cards/{card_id}/items")
def keep_add_item(card_id: str, req: AddItemRequest):
    result = keep.add_item(card_id, req.text, req.indent)
    if result is None:
        raise HTTPException(status_code=404, detail="Card not found")
    return result


@app.delete("/api/keep/cards/{card_id}/items/{item_id}")
def keep_delete_item(card_id: str, item_id: str):
    result = keep.delete_item(card_id, item_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Card not found")
    return result


# ─── Static files (React app) ──────────────────────────────────────────────

# In production, serve the built React app
_dist = Path(__file__).parent / "ui" / "dist"
_index = _dist / "index.html"

if _dist.exists() and _index.exists():
    # Serve built assets
    if (_dist / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(_dist / "assets")), name="assets")

    # SPA fallback — must be defined LAST so API routes take priority
    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        """Serve index.html for all non-API routes (SPA client-side routing)."""
        return FileResponse(str(_index))
else:
    @app.get("/")
    def dev_root():
        return {"status": "Melete API running", "ui": "Build the frontend: cd ui && npm run build"}
