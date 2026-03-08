"""
Melete Versions — Local git-style snapshots, diff, and backup ZIP.
"""
import difflib
import hashlib
import json
import os
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Optional


def _history_dir(vault: Path, stem: str) -> Path:
    return vault / ".history" / stem


def _ts_now() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def save_snapshot(vault: Path, stem: str, message: str = "") -> bool:
    """Save current note as a snapshot."""
    note_path = vault / "Notas" / f"{stem}.md"
    if not note_path.exists():
        return False
    content = note_path.read_text(encoding="utf-8")
    hist_dir = _history_dir(vault, stem)
    hist_dir.mkdir(parents=True, exist_ok=True)
    ts = _ts_now()
    (hist_dir / f"{ts}.md").write_text(content, encoding="utf-8")
    if message:
        (hist_dir / f"{ts}.msg").write_text(message, encoding="utf-8")
    # Keep only last 30 snapshots
    snapshots = sorted(hist_dir.glob("*.md"))
    if len(snapshots) > 30:
        for old in snapshots[:-30]:
            old.unlink()
            msg_file = old.with_suffix(".msg")
            if msg_file.exists():
                msg_file.unlink()
    return True


def list_versions(vault: Path, stem: str) -> list:
    hist_dir = _history_dir(vault, stem)
    if not hist_dir.exists():
        return []
    result = []
    for snap in sorted(hist_dir.glob("*.md"), reverse=True):
        ts = snap.stem
        msg_file = snap.with_suffix(".msg")
        message = msg_file.read_text() if msg_file.exists() else ""
        content = snap.read_text(encoding="utf-8")
        hash7 = hashlib.sha1(content.encode()).hexdigest()[:7]
        # Format timestamp for display
        try:
            dt = datetime.strptime(ts, "%Y%m%d_%H%M%S")
            label = dt.strftime("%b %d, %H:%M")
        except Exception:
            label = ts
        result.append({
            "ts": ts,
            "label": label,
            "msg": message,
            "hash": hash7,
        })
    return result


def restore_version(vault: Path, stem: str, ts: str) -> str:
    snap = _history_dir(vault, stem) / f"{ts}.md"
    if snap.exists():
        content = snap.read_text(encoding="utf-8")
        note_path = vault / "Notas" / f"{stem}.md"
        # Save current state first
        save_snapshot(vault, stem, "auto-save before restore")
        note_path.write_text(content, encoding="utf-8")
        return content
    return ""


def diff_with_last(vault: Path, stem: str) -> list:
    """Diff current note vs last snapshot."""
    note_path = vault / "Notas" / f"{stem}.md"
    if not note_path.exists():
        return []
    current = note_path.read_text(encoding="utf-8").splitlines()
    versions = list_versions(vault, stem)
    if not versions:
        # No previous version — show everything as additions
        return [{"type": "ins", "old_n": None, "new_n": i + 1, "text": line}
                for i, line in enumerate(current)]
    last_snap = _history_dir(vault, stem) / f"{versions[0]['ts']}.md"
    prev = last_snap.read_text(encoding="utf-8").splitlines()
    result = []
    matcher = difflib.SequenceMatcher(None, prev, current)
    old_n = 0
    new_n = 0
    for op, i1, i2, j1, j2 in matcher.get_opcodes():
        if op == "equal":
            for k in range(i2 - i1):
                result.append({"type": "ctx", "old_n": i1 + k + 1, "new_n": j1 + k + 1, "text": prev[i1 + k]})
        elif op == "replace":
            for k in range(i2 - i1):
                result.append({"type": "del", "old_n": i1 + k + 1, "new_n": None, "text": prev[i1 + k]})
            for k in range(j2 - j1):
                result.append({"type": "ins", "old_n": None, "new_n": j1 + k + 1, "text": current[j1 + k]})
        elif op == "delete":
            for k in range(i2 - i1):
                result.append({"type": "del", "old_n": i1 + k + 1, "new_n": None, "text": prev[i1 + k]})
        elif op == "insert":
            for k in range(j2 - j1):
                result.append({"type": "ins", "old_n": None, "new_n": j1 + k + 1, "text": current[j1 + k]})
    return result


def _snap_hash(vault: Path, stem: str) -> Optional[str]:
    """Hash of the last snapshot for the given stem (returns None if no snapshot)."""
    versions = list_versions(vault, stem)
    if not versions:
        return None
    snap = _history_dir(vault, stem) / f"{versions[0]['ts']}.md"
    return snap.read_text(encoding="utf-8") if snap.exists() else None


def list_changed_files(vault: Path) -> list:
    """Return files that have unsaved changes relative to last snapshot."""
    result = []

    # ── Notes ────────────────────────────────────────────────────────────────
    notes_dir = vault / "Notas"
    for note_path in sorted(notes_dir.glob("*.md")):
        stem = note_path.stem
        current = note_path.read_text(encoding="utf-8")
        prev = _snap_hash(vault, stem)
        if prev is None:
            result.append({"name": stem, "status": "A", "kind": "note"})
        elif current != prev:
            result.append({"name": stem, "status": "M", "kind": "note"})

    # ── Flashcard decks ───────────────────────────────────────────────────────
    fc_dir = vault / "Flashcards"
    if fc_dir.exists():
        for deck_dir in sorted(fc_dir.iterdir()):
            if not deck_dir.is_dir():
                continue
            for card_path in sorted(deck_dir.glob("*.json")):
                stem = f"flashcards__{deck_dir.name}__{card_path.stem}"
                current = card_path.read_text(encoding="utf-8")
                prev = _snap_hash(vault, stem)
                if prev is None:
                    result.append({"name": f"{deck_dir.name}/{card_path.stem}", "status": "A", "kind": "flashcard"})
                elif current != prev:
                    result.append({"name": f"{deck_dir.name}/{card_path.stem}", "status": "M", "kind": "flashcard"})

    # ── New library files (EPUBs, PDFs) ──────────────────────────────────────
    known_path = vault / ".history" / "known_files.json"
    files_dir = vault / "Files"
    current_files = set()
    if files_dir.exists():
        for ext in ("*.epub", "*.pdf", "*.txt"):
            for f in files_dir.glob(ext):
                current_files.add(f.name)
    known_files: set = set()
    if known_path.exists():
        try:
            known_files = set(json.loads(known_path.read_text()))
        except Exception:
            pass
    for fname in sorted(current_files - known_files):
        result.append({"name": fname, "status": "A", "kind": "book"})

    return result


def snapshot_all(vault: Path) -> int:
    """Snapshot all changed notes and flashcard files. Returns count saved."""
    count = 0

    # Notes
    notes_dir = vault / "Notas"
    for note_path in notes_dir.glob("*.md"):
        stem = note_path.stem
        current = note_path.read_text(encoding="utf-8")
        prev = _snap_hash(vault, stem)
        if prev is None or current != prev:
            save_snapshot(vault, stem)
            count += 1

    # Flashcard cards — snapshot into .history using the pseudo-stem
    fc_dir = vault / "Flashcards"
    if fc_dir.exists():
        for deck_dir in fc_dir.iterdir():
            if not deck_dir.is_dir():
                continue
            for card_path in deck_dir.glob("*.json"):
                stem = f"flashcards__{deck_dir.name}__{card_path.stem}"
                current = card_path.read_text(encoding="utf-8")
                prev = _snap_hash(vault, stem)
                if prev is None or current != prev:
                    hist_dir = _history_dir(vault, stem)
                    hist_dir.mkdir(parents=True, exist_ok=True)
                    (hist_dir / f"{_ts_now()}.md").write_text(current, encoding="utf-8")
                    count += 1

    # Record currently known library files
    files_dir = vault / "Files"
    known_path = vault / ".history" / "known_files.json"
    known_path.parent.mkdir(parents=True, exist_ok=True)
    current_files = []
    if files_dir.exists():
        for ext in ("*.epub", "*.pdf", "*.txt"):
            current_files.extend(f.name for f in files_dir.glob(ext))
    known_path.write_text(json.dumps(sorted(current_files)), encoding="utf-8")

    return count


def create_backup(vault: Path) -> str:
    """Create a ZIP backup of the vault excluding .history."""
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    vault_name = vault.name
    backup_name = f"backup_{vault_name}_{ts}.zip"
    backup_path = vault.parent / backup_name
    with zipfile.ZipFile(backup_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(vault):
            # Exclude .history
            dirs[:] = [d for d in dirs if d != ".history"]
            for file in files:
                fp = Path(root) / file
                arcname = fp.relative_to(vault.parent)
                zf.write(fp, arcname)
    return str(backup_path)
