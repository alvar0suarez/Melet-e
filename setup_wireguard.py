"""
Melete — Generador de configuración WireGuard.

Genera automáticamente los ficheros de configuración para:
  - El servidor (tu PC Windows)
  - El cliente (tu móvil Android/iOS)

Requisitos previos:
  1. Instala WireGuard para Windows: https://www.wireguard.com/install/
     (incluye la herramienta `wg` en el PATH)
  2. Configura port forwarding en tu router: UDP puerto 51820 → IP local de tu PC.
  3. Ejecuta este script: python setup_wireguard.py

Los ficheros se guardan en melete/wireguard/
"""
import subprocess
import sys
import os
import json
from pathlib import Path
from datetime import datetime

OUT = Path(__file__).parent / "wireguard"
OUT.mkdir(exist_ok=True)


def run(cmd: list[str]) -> str:
    try:
        return subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode().strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ""


def gen_key_pair() -> tuple[str, str]:
    """Returns (private_key, public_key) using the `wg` command."""
    priv = run(["wg", "genkey"])
    if not priv:
        # Try Windows path
        wg_paths = [
            r"C:\Program Files\WireGuard\wg.exe",
            r"C:\Program Files (x86)\WireGuard\wg.exe",
        ]
        for p in wg_paths:
            if Path(p).exists():
                priv = run([p, "genkey"])
                if priv:
                    pub = subprocess.check_output(
                        [p, "pubkey"], input=priv.encode(), stderr=subprocess.DEVNULL
                    ).decode().strip()
                    return priv, pub
        print("\n❌  No se encuentra el comando 'wg'.")
        print("   Instala WireGuard desde https://www.wireguard.com/install/")
        print("   y asegúrate de que está en el PATH, luego ejecuta de nuevo.\n")
        sys.exit(1)

    pub = subprocess.check_output(
        ["wg", "pubkey"], input=priv.encode(), stderr=subprocess.DEVNULL
    ).decode().strip()
    return priv, pub


def get_public_ip() -> str:
    """Try to detect current public IP."""
    try:
        import urllib.request
        return urllib.request.urlopen("https://api.ipify.org", timeout=4).read().decode()
    except Exception:
        return "<TU_IP_PÚBLICA>"


def get_local_ip() -> str:
    """Get the PC's local network IP."""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "<IP_LOCAL_DEL_PC>"


print("\n═══════════════════════════════════════════════")
print("  Melete — Configuración WireGuard")
print("═══════════════════════════════════════════════\n")
print("Generando claves…")

pc_priv, pc_pub = gen_key_pair()
phone_priv, phone_pub = gen_key_pair()

public_ip = get_public_ip()
local_ip = get_local_ip()

print(f"  PC public key  : {pc_pub[:24]}…")
print(f"  IP pública     : {public_ip}")
print(f"  IP local PC    : {local_ip}")

# ─── Config servidor (PC) ─────────────────────────────────────────────────────

server_conf = f"""# WireGuard — Melete Server (PC)
# Generado: {datetime.now().strftime('%Y-%m-%d %H:%M')}
# Importa este fichero en la app WireGuard de Windows.

[Interface]
PrivateKey = {pc_priv}
Address = 10.0.0.1/24
ListenPort = 51820
# Permite que el móvil acceda a Melete (puerto 7749):
# Si usas Windows Firewall, añade una regla de entrada UDP 51820.

[Peer]
# Móvil
PublicKey = {phone_pub}
AllowedIPs = 10.0.0.2/32
"""

server_path = OUT / "server-pc.conf"
server_path.write_text(server_conf, encoding="utf-8")
print(f"\n✓  Configuración servidor guardada: {server_path}")

# ─── Config cliente (móvil) ───────────────────────────────────────────────────

client_conf = f"""# WireGuard — Melete Client (Móvil)
# Generado: {datetime.now().strftime('%Y-%m-%d %H:%M')}
# Importa este fichero en la app WireGuard de Android/iOS,
# o escanea el código QR generado a continuación.

[Interface]
PrivateKey = {phone_priv}
Address = 10.0.0.2/32
DNS = 1.1.1.1

[Peer]
# PC (servidor Melete)
PublicKey = {pc_pub}
Endpoint = {public_ip}:51820
# Solo redirige el tráfico hacia la red WireGuard (10.0.0.0/24),
# el resto del tráfico del móvil va por su ruta normal.
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 25
"""

client_path = OUT / "client-movil.conf"
client_path.write_text(client_conf, encoding="utf-8")
print(f"✓  Configuración móvil guardada: {client_path}")

# ─── QR code para el móvil ────────────────────────────────────────────────────

try:
    import qrcode   # type: ignore
    qr = qrcode.make(client_conf)
    qr_path = OUT / "client-movil-qr.png"
    qr.save(qr_path)
    print(f"✓  Código QR guardado: {qr_path}")
    print("   (Escanéalo con la app WireGuard del móvil)")
except ImportError:
    print("\n   (Instala 'qrcode' para generar el QR: pip install qrcode[pil])")
    print(f"   O importa manualmente el fichero: {client_path}")

# ─── Resumen ──────────────────────────────────────────────────────────────────

print(f"""
═══════════════════════════════════════════════
  PASOS SIGUIENTES
═══════════════════════════════════════════════

1. PC — Importar configuración servidor:
   • Abre WireGuard para Windows
   • "Importar túnel(es) desde fichero" → {server_path.name}
   • Activa el túnel

2. Router — Port forwarding:
   • Accede a tu router (normalmente 192.168.1.1)
   • Crea regla: UDP puerto 51820 → {local_ip}

3. Móvil — Instalar WireGuard + importar config:
   • Instala WireGuard desde Play Store / App Store
   • "+" → "Importar desde archivo o QR"
   • Escanea {OUT / "client-movil-qr.png"} (o importa el .conf)

4. Acceder a Melete:
   • Conecta WireGuard en el móvil
   • Abre http://10.0.0.1:7749 en el navegador
   • O instala el APK de Capacitor (ver README_APK.md)

La IP del servidor Melete dentro del túnel siempre será 10.0.0.1.
""")

# Guardar resumen en JSON para referencia
info = {
    "pc_public_key": pc_pub,
    "phone_public_key": phone_pub,
    "server_wireguard_ip": "10.0.0.1",
    "client_wireguard_ip": "10.0.0.2",
    "melete_url": "http://10.0.0.1:7749",
    "generated": datetime.now().isoformat(),
}
(OUT / "info.json").write_text(json.dumps(info, indent=2), encoding="utf-8")
