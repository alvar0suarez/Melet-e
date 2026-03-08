"""
Melete — simple token-based authentication.

Flow:
  1. First run: no password set → is_configured() returns False → open access.
  2. User calls setup(password) → password hash + first token stored in vault/auth.json.
  3. All subsequent /api/ calls must carry the token in X-Melete-Token header.
  4. Multiple devices: each login creates a new token (stored alongside previous ones).
"""
import hashlib
import json
import secrets
from pathlib import Path
from typing import Optional


def _auth_path() -> Path:
    from melete_core import _vault
    return _vault() / "auth.json"


def _load() -> dict:
    p = _auth_path()
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"password_hash": None, "tokens": []}


def _save(data: dict):
    _auth_path().write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def is_configured() -> bool:
    """Return True if a password has been set."""
    try:
        return bool(_load().get("password_hash"))
    except Exception:
        return False


def setup(password: str) -> str:
    """Set the password for the first time. Returns the first session token."""
    if not password or len(password) < 4:
        raise ValueError("Password too short (min 4 chars)")
    token = secrets.token_hex(32)
    _save({
        "password_hash": _hash(password),
        "tokens": [token],
    })
    return token


def change_password(new_password: str) -> str:
    """Change the password; invalidates all existing tokens. Returns new token."""
    if not new_password or len(new_password) < 4:
        raise ValueError("Password too short (min 4 chars)")
    token = secrets.token_hex(32)
    data = _load()
    data["password_hash"] = _hash(new_password)
    data["tokens"] = [token]
    _save(data)
    return token


def login(password: str) -> Optional[str]:
    """Verify password; return a new session token or None."""
    data = _load()
    if not data.get("password_hash"):
        return None
    if not _verify(password, data["password_hash"]):
        return None
    token = secrets.token_hex(32)
    tokens = data.get("tokens", [])
    tokens.append(token)
    data["tokens"] = tokens[-20:]   # keep last 20 (many devices)
    _save(data)
    return token


def verify_token(token: str) -> bool:
    if not token:
        return False
    try:
        return token in _load().get("tokens", [])
    except Exception:
        return False


def logout(token: str):
    data = _load()
    data["tokens"] = [t for t in data.get("tokens", []) if t != token]
    _save(data)


def _hash(password: str) -> str:
    salted = f"melete-v1:{password}"
    return hashlib.sha256(salted.encode()).hexdigest()


def _verify(password: str, stored: str) -> bool:
    return _hash(password) == stored
