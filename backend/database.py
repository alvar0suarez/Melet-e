import sqlite3
from pathlib import Path
from backend.config import get_vault_path


def get_db_path() -> Path:
    db_dir = get_vault_path() / "db"
    db_dir.mkdir(parents=True, exist_ok=True)
    return db_dir / "melete.db"


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS notes (
            id         TEXT PRIMARY KEY,
            title      TEXT NOT NULL,
            content    TEXT NOT NULL DEFAULT '',
            folder     TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS links (
            source_id    TEXT NOT NULL,
            target_title TEXT NOT NULL,
            PRIMARY KEY (source_id, target_title),
            FOREIGN KEY (source_id) REFERENCES notes(id) ON DELETE CASCADE
        );
    """)
    conn.commit()
    conn.close()
