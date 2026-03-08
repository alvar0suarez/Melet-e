"""
Melete Core — Business logic
Vault, notes, documents, AI, flashcards, annotations, collections.
"""
import json
import os
import re
import shutil
from pathlib import Path
from typing import Optional

SETTINGS_FILE = Path(__file__).parent / "melete_settings.json"


# ─── Vault ─────────────────────────────────────────────────────────────────

def get_vault_path() -> Optional[str]:
    if SETTINGS_FILE.exists():
        try:
            data = json.loads(SETTINGS_FILE.read_text())
            vp = data.get("vault")
            if vp and Path(vp).exists():
                return vp
        except Exception:
            pass
    return None


def setup_vault(path: str) -> bool:
    p = Path(path)
    try:
        p.mkdir(parents=True, exist_ok=True)
        for sub in ["Files", "Notas/_annotations", "Flashcards", "Plugins", "Calendar"]:
            (p / sub).mkdir(parents=True, exist_ok=True)
        # Default config
        cfg = p / "config.json"
        if not cfg.exists():
            cfg.write_text(json.dumps({
                "ai": {"provider": "ollama", "model": "llama3.2", "api_key": "", "base_url": "http://localhost:11434"},
                "collections": []
            }, indent=2))
        # Default books_meta
        bm = p / "books_meta.json"
        if not bm.exists():
            bm.write_text("{}")
        # Calendar
        ev = p / "Calendar" / "events.json"
        if not ev.exists():
            ev.write_text("[]")
        SETTINGS_FILE.write_text(json.dumps({"vault": str(p)}, indent=2))
        return True
    except Exception as e:
        print(f"[setup_vault] {e}")
        return False


def _vault() -> Path:
    vp = get_vault_path()
    if not vp:
        raise RuntimeError("Vault not configured")
    return Path(vp)


# ─── Documents ─────────────────────────────────────────────────────────────

SUPPORTED = {".pdf", ".epub", ".txt"}


def list_documents() -> list:
    vault = _vault()
    files_dir = vault / "Files"
    if not files_dir.exists():
        files_dir.mkdir(parents=True, exist_ok=True)
        return []
    meta = _load_books_meta()
    result = []
    for f in sorted(files_dir.rglob("*")):
        if not f.is_file():
            continue
        if f.suffix.lower() in SUPPORTED:
            rel = str(f.relative_to(files_dir))
            m = meta.get(rel, {})
            result.append({
                "path": rel,
                "name": f.stem,
                "ext": f.suffix.lower().lstrip("."),
                "status": m.get("status", "unread"),
                "progress": m.get("progress", 0),
                "favorite": m.get("favorite", False),
                "author": m.get("author", ""),
                "year": m.get("year", ""),
                "collections": m.get("collections", []),
                "last_opened": m.get("last_opened", ""),
                "total_read_seconds": m.get("total_read_seconds", 0),
            })
    return result


def _load_books_meta() -> dict:
    bm = _vault() / "books_meta.json"
    if bm.exists():
        try:
            return json.loads(bm.read_text())
        except Exception:
            pass
    return {}


def update_book_meta(path: str, meta: dict) -> bool:
    bm_path = _vault() / "books_meta.json"
    data = _load_books_meta()
    data[path] = {**data.get(path, {}), **meta}
    bm_path.write_text(json.dumps(data, indent=2))
    return True


def get_book_meta(path: str) -> dict:
    return _load_books_meta().get(path, {})


# ─── PDF ───────────────────────────────────────────────────────────────────

def _pdf_path(rel: str) -> Path:
    return _vault() / "Files" / rel


def get_pdf_page_count(rel: str) -> int:
    try:
        import fitz
        doc = fitz.open(str(_pdf_path(rel)))
        return doc.page_count
    except Exception as e:
        print(f"[pdf_count] {e}")
        return 0


def extract_pdf_text(rel: str, page: int) -> str:
    try:
        import fitz
        doc = fitz.open(str(_pdf_path(rel)))
        if 0 <= page < doc.page_count:
            return doc[page].get_text()
        return ""
    except Exception as e:
        return f"Error: {e}"


# ─── EPUB ──────────────────────────────────────────────────────────────────

def load_epub(rel: str) -> list:
    """Returns list of chapters: [{title, blocks:[{type, text}]}]"""
    try:
        import ebooklib
        from ebooklib import epub
        from bs4 import BeautifulSoup, NavigableString, Tag

        path = _vault() / "Files" / rel
        book = epub.read_epub(str(path))
        chapters = []

        # Use spine order for correct chapter sequence
        spine_ids = [item_id for item_id, _ in book.spine]
        if spine_ids:
            items = [book.get_item_with_id(item_id) for item_id in spine_ids]
            items = [i for i in items if i is not None and i.get_type() == ebooklib.ITEM_DOCUMENT]
        else:
            items = list(book.get_items_of_type(ebooklib.ITEM_DOCUMENT))

        def extract_blocks(element, blocks):
            """Recursively extract content blocks, handling div/section containers."""
            for child in element.children:
                if not isinstance(child, Tag):
                    continue
                name = child.name
                if not name:
                    continue
                if name in ("script", "style", "svg", "img", "figure", "nav", "aside"):
                    continue
                if name in ("h1", "h2", "h3", "h4", "h5", "h6"):
                    text = child.get_text(separator=" ", strip=True)
                    if text:
                        level = name if name in ("h1", "h2", "h3") else "h3"
                        blocks.append({"type": level, "text": text})
                elif name == "blockquote":
                    text = child.get_text(separator=" ", strip=True)
                    if text:
                        blocks.append({"type": "quote", "text": text})
                elif name in ("pre", "code"):
                    text = child.get_text(strip=True)
                    if text:
                        blocks.append({"type": "code", "text": text})
                elif name == "p":
                    text = child.get_text(separator=" ", strip=True)
                    if text:
                        blocks.append({"type": "p", "text": text})
                elif name in ("ul", "ol"):
                    for li in child.find_all("li", recursive=False):
                        text = li.get_text(separator=" ", strip=True)
                        if text:
                            blocks.append({"type": "p", "text": f"• {text}"})
                elif name in ("div", "section", "article", "main", "body", "span"):
                    extract_blocks(child, blocks)

        for item in items:
            soup = BeautifulSoup(item.get_content(), "html.parser")
            body = soup.find("body") or soup

            # Skip non-content items (navigation, TOC, etc.)
            if body.get_text(strip=True).__len__() < 30:
                continue

            # Determine chapter title
            title_tag = body.find(["h1", "h2"]) or soup.find("title")
            title = title_tag.get_text(strip=True) if title_tag else item.get_name()

            blocks: list = []
            extract_blocks(body, blocks)

            if blocks:
                chapters.append({"title": title, "blocks": blocks})

        return chapters
    except Exception as e:
        import traceback
        print(f"[load_epub] {e}")
        traceback.print_exc()
        return [{"title": "Error", "blocks": [{"type": "p", "text": str(e)}]}]


# ─── Notes ─────────────────────────────────────────────────────────────────

def _notes_dir() -> Path:
    return _vault() / "Notas"


def list_notes() -> list:
    d = _notes_dir()
    return sorted([f.stem for f in d.glob("*.md")])


def get_note(name: str) -> str:
    p = _notes_dir() / f"{name}.md"
    return p.read_text(encoding="utf-8") if p.exists() else ""


def save_note(name: str, content: str) -> bool:
    p = _notes_dir() / f"{name}.md"
    p.write_text(content, encoding="utf-8")
    return True


def new_note() -> str:
    d = _notes_dir()
    i = 1
    while (d / f"Untitled {i}.md").exists():
        i += 1
    name = f"Untitled {i}"
    (d / f"{name}.md").write_text(f"# {name}\n", encoding="utf-8")
    return name


_COLOR_EMOJI = {
    "red":    "🔴",
    "yellow": "🟡",
    "green":  "🟢",
    "grey":   "⚫",
}
_COLOR_LABEL = {
    "red":    "En desacuerdo",
    "yellow": "Interesante",
    "green":  "De acuerdo",
    "grey":   "Neutral",
}


def get_book_display_title(stem: str) -> str:
    """Return the best display title for a book: meta title > PDF/EPUB metadata > stem."""
    # 1. Check books_meta for an explicit title
    bm = _load_books_meta()
    for path_key, m in bm.items():
        if Path(path_key).stem == stem:
            if m.get("title"):
                return m["title"].strip()
            break

    # 2. Try to extract title from the file itself
    vault = _vault()
    for ext in [".pdf", ".epub"]:
        fpath = vault / "Files" / f"{stem}{ext}"
        if fpath.exists():
            if ext == ".pdf":
                try:
                    import fitz
                    doc = fitz.open(str(fpath))
                    t = (doc.metadata or {}).get("title", "").strip()
                    if t and len(t) > 2 and not t.lower().endswith(".pdf"):
                        return t
                except Exception:
                    pass
            elif ext == ".epub":
                try:
                    from ebooklib import epub
                    book = epub.read_epub(str(fpath))
                    titles = book.get_metadata("DC", "title")
                    if titles and titles[0][0].strip():
                        return titles[0][0].strip()
                except Exception:
                    pass
    return stem


def _safe_note_name(title: str) -> str:
    """Sanitize a title for use as a markdown note filename (no extension)."""
    sanitized = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '', title).strip()
    return sanitized[:120] or "Sin título"


def append_book_highlight(stem: str, text: str, source: str, color: str = "yellow") -> str:
    """Append a highlighted quote to the book's reading note (Notas/{stem}.md).

    The note filename always matches the book filename stem.
    Returns the note name (stem without .md) that was written to.
    """
    from datetime import datetime

    # Note filename = stem (same name as the book file, without extension)
    note_name = _safe_note_name(stem) or stem
    notes_dir = _notes_dir()
    p = notes_dir / f"{note_name}.md"

    now = datetime.now()
    timestamp = now.strftime("%Y-%m-%d %H:%M")
    date_str = now.strftime("%Y-%m-%d")

    if not p.exists():
        # Use title from books_meta if available; fall back to stem.
        # Do NOT open the PDF/EPUB file here — that can be slow (seconds for large files).
        bm = _load_books_meta()
        display_title = stem
        for path_key, m in bm.items():
            if Path(path_key).stem == stem and m.get("title"):
                display_title = m["title"].strip()
                break
        frontmatter = (
            f"---\n"
            f"book: \"{display_title}\"\n"
            f"fuente: \"{stem}\"\n"
            f"primera_nota: \"{date_str}\"\n"
            f"---\n\n"
        )
        p.write_text(
            frontmatter +
            f"# {display_title}\n\n"
            f"*Notas de lectura*\n\n"
            f"---\n\n## Extractos\n\n",
            encoding="utf-8"
        )

    content = p.read_text(encoding="utf-8")
    emoji = _COLOR_EMOJI.get(color, "🟡")
    label = _COLOR_LABEL.get(color, "Interesante")
    src_str = f" *— {source}*" if source else ""
    entry = f"\n{emoji} **{label}**{src_str} · `{timestamp}`\n> \"{text}\"\n\n"
    p.write_text(content + entry, encoding="utf-8")
    return note_name


def delete_note(name: str) -> bool:
    p = _notes_dir() / f"{name}.md"
    if p.exists():
        p.unlink()
        return True
    return False


def rename_note(old: str, new: str) -> bool:
    op = _notes_dir() / f"{old}.md"
    np = _notes_dir() / f"{new}.md"
    if op.exists() and not np.exists():
        op.rename(np)
        return True
    return False


def search_notes(query: str) -> list:
    q = query.lower()
    results = []
    for name in list_notes():
        content = get_note(name)
        if q in name.lower() or q in content.lower():
            idx = content.lower().find(q)
            ctx = content[max(0, idx - 40):idx + 80].replace("\n", " ") if idx >= 0 else ""
            results.append({"name": name, "ctx": ctx})
    return results


def parse_wikilinks(text: str) -> list:
    return re.findall(r"\[\[([^\]]+)\]\]", text)


def get_backlinks(name: str) -> list:
    result = []
    for n in list_notes():
        if n == name:
            continue
        content = get_note(n)
        links = parse_wikilinks(content)
        if name in links:
            result.append(n)
    return result


def get_backlinks_with_context(name: str) -> list:
    """Return each note that links to `name`, with surrounding text context."""
    result = []
    pattern = re.compile(r'\[\[' + re.escape(name) + r'\]\]')
    for n in list_notes():
        content = get_note(n)
        for m in pattern.finditer(content):
            start = max(0, m.start() - 120)
            end = min(len(content), m.end() + 120)
            ctx = content[start:end].strip()
            result.append({"note": n, "ctx": ctx})
    return result


def get_graph_data() -> dict:
    notes = list_notes()
    note_set = set(notes)
    nodes = [{"id": n, "real": True} for n in notes]
    links = []
    ghost_set: set = set()
    for n in notes:
        content = get_note(n)
        for target in parse_wikilinks(content):
            links.append({"s": n, "t": target})
            if target not in note_set and target not in ghost_set:
                ghost_set.add(target)
                nodes.append({"id": target, "real": False})
    return {"nodes": nodes, "links": links}


# ─── Annotations ───────────────────────────────────────────────────────────

def _ann_path(stem: str) -> Path:
    return _vault() / "Notas" / "_annotations" / f"{stem}.json"


def load_annotations(stem: str) -> list:
    p = _ann_path(stem)
    if p.exists():
        try:
            return json.loads(p.read_text())
        except Exception:
            pass
    return []


def save_annotations(stem: str, annotations: list) -> bool:
    p = _ann_path(stem)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(annotations, indent=2))
    return True


# ─── Flashcards ────────────────────────────────────────────────────────────

def _fc_dir() -> Path:
    return _vault() / "Flashcards"


# ── Decks ──────────────────────────────────────────────────────────────────

def list_decks() -> list:
    d = _fc_dir()
    result = []
    for deck_dir in sorted(d.iterdir()):
        if not deck_dir.is_dir():
            continue
        cards = list(deck_dir.glob("*.json"))
        from datetime import datetime
        due_count = 0
        now = datetime.now()
        for cp in cards:
            try:
                card = json.loads(cp.read_text())
                due_str = card.get("due", "")
                if not due_str or datetime.fromisoformat(due_str) <= now:
                    due_count += 1
            except Exception:
                due_count += 1
        result.append({"name": deck_dir.name, "card_count": len(cards), "due_count": due_count})
    return result


def create_deck(name: str) -> bool:
    (_fc_dir() / name).mkdir(parents=True, exist_ok=True)
    return True


def delete_deck(name: str) -> bool:
    d = _fc_dir() / name
    if d.exists():
        shutil.rmtree(d)
        return True
    return False


def list_cards(deck: str) -> list:
    d = _fc_dir() / deck
    if not d.exists():
        return []
    cards = []
    for f in sorted(d.glob("*.json")):
        try:
            cards.append(json.loads(f.read_text()))
        except Exception:
            pass
    return cards


def save_card(deck: str, card: dict) -> dict:
    import uuid
    from datetime import datetime
    d = _fc_dir() / deck
    d.mkdir(parents=True, exist_ok=True)
    if not card.get("id"):
        card["id"] = str(uuid.uuid4())[:8]
    if not card.get("created"):
        card["created"] = datetime.now().isoformat()
    card.setdefault("due", datetime.now().isoformat())
    card.setdefault("interval", 0)
    card.setdefault("ease", 2.5)
    card.setdefault("reviews", 0)
    (d / f"{card['id']}.json").write_text(json.dumps(card, ensure_ascii=False, indent=2), encoding="utf-8")
    return card


def delete_card(deck: str, card_id: str) -> bool:
    p = _fc_dir() / deck / f"{card_id}.json"
    if p.exists():
        p.unlink()
        return True
    return False


def review_card(deck: str, card_id: str, rating: str) -> dict:
    """Update spaced-repetition data after a review. rating: again|hard|good|easy"""
    from datetime import datetime, timedelta
    p = _fc_dir() / deck / f"{card_id}.json"
    if not p.exists():
        return {}
    card = json.loads(p.read_text())
    ease = card.get("ease", 2.5)
    interval = card.get("interval", 0)

    if rating == "again":
        interval = 1
        ease = max(1.3, ease - 0.2)
    elif rating == "hard":
        interval = max(1, int(interval * 1.2)) if interval > 0 else 1
        ease = max(1.3, ease - 0.15)
    elif rating == "good":
        interval = max(1, int(interval * ease)) if interval > 0 else 1
    elif rating == "easy":
        interval = max(4, int(interval * ease * 1.3)) if interval > 0 else 4
        ease = min(4.0, ease + 0.15)

    card["interval"] = interval
    card["ease"] = round(ease, 2)
    card["reviews"] = card.get("reviews", 0) + 1
    card["due"] = (datetime.now() + timedelta(days=interval)).isoformat()
    p.write_text(json.dumps(card, ensure_ascii=False, indent=2), encoding="utf-8")
    return card


def list_vocab_words() -> list:
    """Return all dictionary/translation cards across all decks."""
    result = []
    d = _fc_dir()
    if not d.exists():
        return result
    for deck_dir in d.iterdir():
        if not deck_dir.is_dir():
            continue
        for card_path in deck_dir.glob("*.json"):
            try:
                card = json.loads(card_path.read_text())
                if card.get("type") in ("dictionary", "translation"):
                    result.append({"front": card.get("front", ""), "back": card.get("back", ""), "type": card.get("type")})
            except Exception:
                pass
    return result


def get_due_cards(deck: str) -> list:
    from datetime import datetime
    now = datetime.now()
    due = []
    for card in list_cards(deck):
        due_str = card.get("due", "")
        try:
            if not due_str or datetime.fromisoformat(due_str) <= now:
                due.append(card)
        except Exception:
            due.append(card)
    return due


# ─── AI ────────────────────────────────────────────────────────────────────

def get_ai_config() -> dict:
    try:
        cfg = json.loads((_vault() / "config.json").read_text())
        return cfg.get("ai", {})
    except Exception:
        return {"provider": "ollama", "model": "llama3.2", "api_key": "", "base_url": "http://localhost:11434"}


def save_ai_config(config: dict) -> bool:
    cfg_path = _vault() / "config.json"
    try:
        cfg = json.loads(cfg_path.read_text())
    except Exception:
        cfg = {}
    cfg["ai"] = config
    cfg_path.write_text(json.dumps(cfg, indent=2))
    return True


def get_providers() -> list:
    return [
        {"id": "ollama", "name": "Ollama (local)"},
        {"id": "lmstudio", "name": "LM Studio (local)"},
        {"id": "claude", "name": "Claude (Anthropic)"},
        {"id": "openai", "name": "OpenAI"},
        {"id": "grok", "name": "Grok (xAI)"},
    ]


def ai_chat(messages: list, config: dict = None) -> str:
    if config is None:
        config = get_ai_config()
    provider = config.get("provider", "ollama")
    model = config.get("model", "llama3.2")
    api_key = config.get("api_key", "")
    base_url = config.get("base_url", "http://localhost:11434")

    try:
        if provider == "ollama":
            import requests
            url = base_url.rstrip("/") + "/api/chat"
            r = requests.post(url, json={"model": model, "messages": messages, "stream": False}, timeout=60)
            r.raise_for_status()
            return r.json()["message"]["content"]

        elif provider == "lmstudio":
            import requests
            url = base_url.rstrip("/") + "/v1/chat/completions"
            r = requests.post(url, json={"model": model, "messages": messages}, timeout=60)
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]

        elif provider == "claude":
            import requests
            headers = {"x-api-key": api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
            # Convert messages format
            system = next((m["content"] for m in messages if m["role"] == "system"), "")
            user_msgs = [m for m in messages if m["role"] != "system"]
            body = {"model": model, "max_tokens": 1024, "messages": user_msgs}
            if system:
                body["system"] = system
            r = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=body, timeout=60)
            r.raise_for_status()
            return r.json()["content"][0]["text"]

        elif provider in ("openai", "grok"):
            import requests
            url = "https://api.openai.com/v1/chat/completions" if provider == "openai" else "https://api.x.ai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            r = requests.post(url, headers=headers, json={"model": model, "messages": messages}, timeout=60)
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]

        else:
            return "Unknown AI provider."
    except Exception as e:
        return f"AI Error: {e}"


def test_ai_connection(config: dict) -> dict:
    try:
        result = ai_chat([{"role": "user", "content": "Say OK"}], config)
        return {"ok": True, "message": result[:100]}
    except Exception as e:
        return {"ok": False, "message": str(e)}


# ─── Collections ───────────────────────────────────────────────────────────

def get_collections() -> list:
    try:
        cfg = json.loads((_vault() / "config.json").read_text())
        return cfg.get("collections", [])
    except Exception:
        return []


def add_collection(name: str) -> bool:
    cfg_path = _vault() / "config.json"
    try:
        cfg = json.loads(cfg_path.read_text())
    except Exception:
        cfg = {}
    colls = cfg.get("collections", [])
    if name not in colls:
        colls.append(name)
    cfg["collections"] = colls
    cfg_path.write_text(json.dumps(cfg, indent=2))
    return True


def delete_collection(name: str) -> bool:
    cfg_path = _vault() / "config.json"
    try:
        cfg = json.loads(cfg_path.read_text())
        colls = cfg.get("collections", [])
        cfg["collections"] = [c for c in colls if c != name]
        cfg_path.write_text(json.dumps(cfg, indent=2))
        return True
    except Exception:
        return False


# ─── Plugins ───────────────────────────────────────────────────────────────

_loaded_plugins: dict = {}


def list_plugins() -> list:
    vault = _vault()
    plugins_dir = vault / "Plugins"
    result = []
    for manifest_path in sorted(plugins_dir.glob("*/manifest.json")):
        try:
            m = json.loads(manifest_path.read_text())
            pid = m.get("id", manifest_path.parent.name)
            loaded = _loaded_plugins.get(pid)
            result.append({
                "id": pid,
                "name": m.get("name", pid),
                "description": m.get("description", ""),
                "version": m.get("version", "0.0.0"),
                "active": loaded is not None and loaded.get("error") is None,
                "error": loaded.get("error") if loaded else None,
            })
        except Exception as e:
            result.append({"id": manifest_path.parent.name, "name": "Error", "description": str(e), "version": "?", "active": False, "error": str(e)})
    return result


def load_all_plugins():
    vault = _vault()
    plugins_dir = vault / "Plugins"
    for manifest_path in plugins_dir.glob("*/manifest.json"):
        _load_plugin(manifest_path.parent)


def _load_plugin(plugin_dir: Path):
    import importlib.util
    manifest_path = plugin_dir / "manifest.json"
    try:
        m = json.loads(manifest_path.read_text())
        pid = m.get("id", plugin_dir.name)
        index_py = plugin_dir / "index.py"
        if not index_py.exists():
            _loaded_plugins[pid] = {"manifest": m, "module": None, "error": None}
            return
        spec = importlib.util.spec_from_file_location(f"melete_plugin_{pid}", index_py)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        if hasattr(mod, "register"):
            ctx = PluginContext(pid)
            mod.register(ctx)
        _loaded_plugins[pid] = {"manifest": m, "module": mod, "error": None}
    except Exception as e:
        pid = plugin_dir.name
        _loaded_plugins[pid] = {"manifest": {}, "module": None, "error": str(e)}


class PluginContext:
    def __init__(self, plugin_id: str):
        self.plugin_id = plugin_id

    @property
    def vault(self) -> Path:
        return _vault()

    @property
    def notas(self) -> Path:
        return _vault() / "Notas"

    def ai_chat(self, msgs: list) -> str:
        return ai_chat(msgs)

    def get_note(self, name: str) -> str:
        return get_note(name)

    def save_note(self, name: str, content: str) -> bool:
        return save_note(name, content)

    def status_msg(self, text: str):
        # Emitted to frontend via SSE (future)
        print(f"[plugin:{self.plugin_id}] {text}")

    def emit(self, event: str, data):
        pass  # SSE future
