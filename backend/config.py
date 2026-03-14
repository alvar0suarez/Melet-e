from pathlib import Path


def get_vault_path() -> Path:
    """Devuelve la ruta absoluta al vault del proyecto."""
    return Path(__file__).parent.parent / "vault"
