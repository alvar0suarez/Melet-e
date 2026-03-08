# Melete — Personal Knowledge Management

> PKM local y privado. Sin nube, sin cuentas, sin suscripciones. Funciona en escritorio y móvil.

Melete es una aplicación de gestión del conocimiento personal con lector integrado de PDFs y EPUBs, editor Markdown, calendario, grafo de conocimiento, flashcards y asistente de IA. Todo corre en tu máquina. Tus datos nunca salen de ella.

![Python](https://img.shields.io/badge/Python-3.11+-blue) ![React](https://img.shields.io/badge/React-18-61dafb) ![License](https://img.shields.io/badge/License-MIT-green)

---

## Características

| Módulo | Descripción |
|---|---|
| **Lector PDF** | Zoom, resaltado por colores, anotaciones, marcapáginas, búsqueda en documento (`Ctrl+F`), panel de notas sincronizado en tiempo real |
| **Lector EPUB** | Capítulo a capítulo, resaltado, vocabulario, búsqueda interna, traducción automática por IA |
| **Editor de Notas** | Monaco Editor (VS Code) con Markdown, wikilinks `[[nota]]`, backlinks, autoguardado, snapshots git-style |
| **Tablero** | Tarjetas de notas, listas y cursos. Importa planes de estudio generados por IA. Cuaderno de páginas vinculado a cada tarjeta |
| **Biblioteca** | Cuadrícula con estado de lectura, progreso, favoritos, colecciones y metadatos |
| **Búsqueda global** | `Ctrl+K` — busca en notas y opcionalmente en el contenido de PDFs y EPUBs |
| **Grafo de Conocimiento** | Grafo D3.js de notas y sus conexiones con preview inline |
| **Calendario** | Vistas mes/semana/día, eventos recurrentes, timer Pomodoro integrado |
| **Control de Versiones** | Snapshots, diff visual, restauración y backup ZIP |
| **Flashcards** | Desde texto seleccionado, repaso espaciado SM-2 |
| **IA integrada** | Define, traduce, responde preguntas. Compatible con Ollama, LM Studio, Claude, OpenAI, Grok |
| **Plugins** | Sistema extensible en Python |
| **Acceso móvil** | APK Android nativo (Capacitor) + VPN WireGuard autoalojada — sin servicios de terceros |

---

## Requisitos

| Herramienta | Versión mínima | Para qué |
|---|---|---|
| Python | 3.11+ | Backend (obligatorio) |
| Node.js | 18+ | Compilar el frontend (solo una vez) |
| Android Studio | Cualquier reciente | Generar APK Android (opcional) |

---

## Instalación paso a paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/alvar0suarez/Melet-e.git
cd Melet-e
```

### 2. Compilar el frontend

```bash
cd ui
npm install
npm run build
cd ..
```

### 3. Generar iconos PWA

```bash
python generate_icons.py
```

Crea los iconos en `ui/public/icons/` necesarios para instalar la app en el móvil.

### 4. Arrancar la aplicación

```bash
python main.py
```

En el primer arranque:
- Se instalan automáticamente las dependencias Python (`fastapi`, `uvicorn`, `pymupdf`, `ebooklib`, etc.)
- Se abre una ventana de escritorio (via pywebview) o el navegador si no hay display
- Se pedirá elegir o crear una carpeta como **vault**

### Scripts de ayuda

**Windows:**
```bat
setup.bat    :: instala dependencias Python
start.bat    :: arranca la aplicación
```

**Linux / macOS:**
```bash
./setup.sh && ./start.sh
```

---

## Estructura del vault

El vault es una carpeta normal. Melete la crea y gestiona automáticamente:

```
MiVault/
├── Files/              ← PDFs y EPUBs
├── Notas/              ← Notas Markdown (.md)
│   └── _annotations/   ← Anotaciones JSON por documento
├── Flashcards/         ← Mazos de flashcards
├── Keep/               ← Tablero (cards.json)
├── Plans/              ← Planes .txt/.md para auto-importar al Tablero
├── Plugins/            ← Plugins Python
├── Calendar/
│   └── events.json
├── auth.json           ← Contraseña de acceso (si está configurada)
├── config.json         ← Configuración de IA y colecciones
└── books_meta.json     ← Progreso y metadatos de libros
```

---

## Cómo usar la app

### Leer un libro y tomar notas

1. Coloca PDFs/EPUBs en `MiVault/Files/`
2. Abre la **Biblioteca** → clic en el libro → se abre directamente el lector
3. Selecciona texto → aparece el popup:
   - **🔴🟡🟢⚫** Resalta en el PDF y guarda el extracto en las notas del libro
   - **Definir / Traducir** — consulta la IA
   - **A notas** — añade el extracto a la nota
4. Activa el **panel de notas** (`⊟` en toolbar) para ver extractos en tiempo real
5. Clic en un extracto → navega a esa página del PDF/capítulo del EPUB
6. Buscar en el libro: lupa en toolbar o `Ctrl+F`

### Tablero — importar planes de estudio

Pide a ChatGPT / Claude un plan de estudio estructurado con semanas o módulos, luego:

1. **Tablero → "Importar plan"** → pega el texto
2. Cada `Módulo / Fase / Week / Semana` se convierte en una tarjeta con checklist

Ejemplo de texto compatible:
```
Ciberseguridad — Plan 12 semanas

Módulo I: Fundamentos de redes
• TCP/IP y modelo OSI
• DNS, HTTP, TLS
Recursos:
• TryHackMe — Pre-Security path

Módulo II: Linux para hacking
...
```

**Carpeta automática:** guarda ficheros `.txt` en `MiVault/Plans/` y pulsa **"Escanear"**.

**Cuaderno de notas por tarjeta:** cada tarjeta tiene un panel "Cuaderno" para crear páginas de apuntes vinculadas. Clic en una página → abre el editor Markdown.

---

## Configurar la IA

Desde **Ajustes** dentro de la aplicación:

| Proveedor | URL base | Notas |
|---|---|---|
| **Ollama** (recomendado) | `http://localhost:11434` | 100% local |
| LM Studio | `http://localhost:1234` | API compatible OpenAI |
| OpenAI | `https://api.openai.com/v1` | Requiere API key |
| Claude | `https://api.anthropic.com` | Requiere API key |
| Grok | `https://api.x.ai/v1` | Requiere API key |

---

## Acceso móvil — APK + WireGuard

Melete puede usarse desde el móvil como **APK Android nativo**, con acceso seguro mediante **WireGuard** (VPN open source, sin ningún servicio de terceros).

### Cómo funciona

```
   Móvil (APK Melete)          PC (servidor Melete :7749)
          │                              │
   WireGuard client            WireGuard server
   10.0.0.2                    10.0.0.1
          │                              │
          └──── túnel cifrado directo ───┘
               sin servidores intermedios
```

### Configurar WireGuard (5 minutos)

**1.** Instala WireGuard en Windows: https://www.wireguard.com/install/

**2.** Genera toda la configuración automáticamente:
```bash
python setup_wireguard.py
```
Produce:
- `wireguard/server-pc.conf` → importa en la app WireGuard del PC
- `wireguard/client-movil-qr.png` → escanea con WireGuard en el móvil

**3.** En tu router: crea regla **UDP 51820 → IP local del PC** (el script te la muestra).

**4.** Instala WireGuard en el móvil (Play Store / App Store) y escanea el QR.

La primera vez que abras Melete desde el móvil, te pedirá crear una contraseña de acceso.

### Generar el APK Android

```bash
cd ui
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Melete" "io.melete.app" --web-dir dist
npm run build
npx cap add android
npx cap sync android
npx cap open android   # → Build → Build APK(s) en Android Studio
```

El APK resultante carga la UI directamente del servidor (no hace falta recompilar al actualizar).

**Ver [`README_APK.md`](README_APK.md) para instrucciones detalladas.**

---

## Desarrollo

### Estructura del proyecto

```
melete/
├── main.py              ← Punto de entrada
├── api_server.py        ← Todos los endpoints REST (FastAPI)
├── melete_core.py       ← Vault, notas, documentos, IA, flashcards
├── melete_calendar.py   ← Calendario y Pomodoro
├── melete_versions.py   ← Snapshots, diff, backup ZIP
├── melete_keep.py       ← Tablero: parser de planes, tarjetas
├── melete_auth.py       ← Autenticación por token
├── generate_icons.py    ← Genera iconos PWA
├── setup_wireguard.py   ← Genera config WireGuard
├── README_APK.md        ← Guía APK Capacitor
└── ui/
    ├── capacitor.config.ts
    ├── public/
    │   ├── manifest.json        ← PWA manifest
    │   ├── sw.js                ← Service Worker
    │   └── icons/               ← Iconos generados
    └── src/
        ├── App.tsx
        ├── components/
        │   ├── auth/            ← LoginScreen
        │   ├── reader/          ← PDF, EPUB, DocSearchPanel, WordPopup, NotePanel
        │   ├── explorer/        ← Vista split lector + notas
        │   ├── library/         ← Biblioteca, Bookmarks
        │   ├── keep/            ← Tablero
        │   ├── graph/           ← Grafo D3.js
        │   ├── calendar/
        │   ├── flashcards/
        │   ├── layout/          ← ActivityBar, Sidebar, TitleBar, StatusBar
        │   └── shared/          ← SearchModal, Toast, AISettings
        ├── store/               ← Estado global (Zustand)
        └── lib/
            ├── api.ts           ← Cliente REST + auth
            └── types.ts
```

### Frontend en modo desarrollo

```bash
cd ui
npm run dev   # hot reload en http://localhost:5173
              # backend debe estar corriendo: python main.py
```

### Crear un plugin

```
MiVault/Plugins/mi-plugin/
├── manifest.json
└── index.py
```

```python
# index.py
def run(ctx):
    content = ctx.get_note("Mi nota")
    ctx.save_note("Mi nota", content + "\n\n> Modificado por plugin")
    ctx.status_msg("Plugin ejecutado")
```

```json
{ "id": "mi-plugin", "name": "Mi Plugin", "version": "1.0", "description": "..." }
```

---

## Stack técnico

| Capa | Tecnologías |
|---|---|
| Backend | Python · FastAPI · Uvicorn · PyMuPDF · ebooklib · BeautifulSoup4 · Pillow |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS · Monaco Editor · D3.js · Zustand |
| PDF | @react-pdf-viewer/core · pdfjs-dist |
| Escritorio | pywebview |
| Móvil | Capacitor (APK Android) · WireGuard VPN |

---

## Licencia

MIT
