"""
Melete — Configuración WireGuard automática.
Ejecuta: python setup_wireguard.py
"""
import subprocess
import sys
import json
import socket
import urllib.request
from pathlib import Path
from datetime import datetime

OUT = Path(__file__).parent / "wireguard"
OUT.mkdir(exist_ok=True)

# ─── Auto-instalar dependencias ──────────────────────────────────────────────

def ensure(package: str, import_name: str = None):
    import_name = import_name or package
    try:
        __import__(import_name)
    except ImportError:
        print(f"  Instalando {package}…")
        subprocess.check_call([sys.executable, "-m", "pip", "install", package, "-q"])

ensure("qrcode[pil]", "qrcode")

import qrcode  # type: ignore

# ─── Helpers ─────────────────────────────────────────────────────────────────

def run(cmd):
    try:
        return subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode().strip()
    except Exception:
        return ""

def find_wg():
    for p in ["wg", r"C:\Program Files\WireGuard\wg.exe"]:
        if run([p, "genkey"]):
            return p
    return None

def get_public_ip():
    try:
        return urllib.request.urlopen("https://api.ipify.org", timeout=4).read().decode()
    except Exception:
        return "<TU_IP_PUBLICA>"

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "<IP_LOCAL>"

def apply_firewall_rules(local_ip: str):
    """Añade reglas de firewall y port forwarding (netsh) si es posible."""
    # Firewall: UDP 51820 (WireGuard) y TCP 7749 (Melete)
    for name, proto, port in [
        ("Melete-WireGuard", "UDP", "51820"),
        ("Melete-App",       "TCP", "7749"),
    ]:
        run(["netsh", "advfirewall", "firewall", "add", "rule",
             f"name={name}", "dir=in", f"protocol={proto}",
             f"localport={port}", "action=allow"])

# ─── Main ─────────────────────────────────────────────────────────────────────

print("\n═══════════════════════════════════════════════")
print("  Melete — Configuración WireGuard")
print("═══════════════════════════════════════════════\n")

# Si ya existe config, solo regenerar el QR
client_path = OUT / "client-movil.conf"
server_path = OUT / "server-pc.conf"

if client_path.exists() and server_path.exists():
    print("  Config ya existente — regenerando QR desde ficheros actuales…\n")
    client_conf = client_path.read_text(encoding="utf-8")
    server_conf = server_path.read_text(encoding="utf-8")
    local_ip = get_local_ip()
else:
    # Generar claves nuevas
    wg = find_wg()
    if not wg:
        print("❌  WireGuard no encontrado.")
        print("   Descárgalo en: https://www.wireguard.com/install/")
        print("   Instálalo, cierra este terminal, ábrelo de nuevo y vuelve a ejecutar.\n")
        sys.exit(1)

    print("  Generando claves…")
    pc_priv   = run([wg, "genkey"])
    pc_pub    = subprocess.check_output([wg, "pubkey"], input=pc_priv.encode()).decode().strip()
    ph_priv   = run([wg, "genkey"])
    ph_pub    = subprocess.check_output([wg, "pubkey"], input=ph_priv.encode()).decode().strip()

    public_ip = get_public_ip()
    local_ip  = get_local_ip()

    print(f"  IP pública del router : {public_ip}")
    print(f"  IP local del PC       : {local_ip}")

    server_conf = f"""[Interface]
PrivateKey = {pc_priv}
Address = 10.0.0.1/24
ListenPort = 51820

[Peer]
# Movil
PublicKey = {ph_pub}
AllowedIPs = 10.0.0.2/32
"""

    client_conf = f"""[Interface]
PrivateKey = {ph_priv}
Address = 10.0.0.2/32
DNS = 1.1.1.1

[Peer]
# PC Melete
PublicKey = {pc_pub}
Endpoint = {public_ip}:51820
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 25
"""

    server_path.write_text(server_conf, encoding="utf-8")
    client_path.write_text(client_conf, encoding="utf-8")
    print(f"\n✓  Config servidor : {server_path}")
    print(f"✓  Config móvil    : {client_path}")

    # Guardar info
    info = {"server_ip": "10.0.0.1", "client_ip": "10.0.0.2",
            "local_pc_ip": local_ip, "melete_url": "http://10.0.0.1:7749",
            "generated": datetime.now().isoformat()}
    (OUT / "info.json").write_text(json.dumps(info, indent=2), encoding="utf-8")

# ─── Generar QR ───────────────────────────────────────────────────────────────

qr_path = OUT / "client-movil-qr.png"
qrcode.make(client_conf).save(qr_path)
print(f"✓  QR generado     : {qr_path}")

# Abrir el QR automáticamente en el visor de Windows
subprocess.Popen(["explorer", str(qr_path)])

# ─── Aplicar reglas de firewall automáticamente ───────────────────────────────

print("\n  Configurando firewall de Windows…")
apply_firewall_rules(local_ip)
print("✓  Reglas de firewall añadidas (UDP 51820 y TCP 7749)")

# ─── Instrucciones finales ────────────────────────────────────────────────────

print(f"""
═══════════════════════════════════════════════
  SOLO QUEDAN 3 PASOS
═══════════════════════════════════════════════

1. WireGuard en el PC:
   • Abre la app WireGuard
   • "Importar túnel desde fichero" → {server_path}
   • Pulsa Activar

2. Router — abre http://192.168.1.1 en el navegador:
   • Busca "Port Forwarding" o "NAT" o "Reenvío de puertos"
   • Crea regla: UDP  51820  →  {local_ip}

3. Móvil:
   • Instala WireGuard (Play Store)
   • "+" → "Escanear QR" → apunta al QR que se ha abierto en pantalla
   • Activa el túnel
   • Abre http://10.0.0.1:7749 en Chrome

════════════════════════════════════════════════
""")
