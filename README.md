# Melete — Personal Knowledge Management

> PKM de escritorio 100% local. Sin nube, sin cuentas, sin suscripciones.

Melete es una aplicación de gestión del conocimiento personal inspirada en Obsidian y Logseq, con lector de PDFs/EPUBs integrado, editor Markdown, calendario, grafo de conocimiento y asistente de IA local. Todo corre en tu máquina.

---

## Características

| Módulo | Descripción |
|---|---|
| **Lector PDF** | Visor completo con resaltado por colores, anotaciones, zoom, marcapáginas y panel de notas sincronizado |
| **Lector EPUB** | Lector capítulo a capítulo con resaltado, vocabulario y traducción automática por IA |
| **Editor de Notas** | Monaco Editor (VS Code) con Markdown, wikilinks `[[nota]]`, backlinks, autoguardado y snapshots |
| **Biblioteca** | Cuadrícula de libros con estado de lectura, progreso, favoritos y metadatos |
| **Panel de Notas Split** | Vista dividida lector + notas del libro en tiempo real; click en extracto → navega a la página |
| **Grafo de Conocimiento** | Grafo D3.js de las notas y sus conexiones con preview inline |
| **Calendario** | Vistas mes/semana/día, arrastrar para crear eventos, timer Pomodoro integrado |
| **Control de Versiones** | Snapshots git-style por nota, diff visual, restauración y backup ZIP |
| **Flashcards** | Creación desde texto seleccionado, repaso espaciado (SM-2) |
| **IA integrada** | Define, traduce, responde preguntas sobre el texto. Compatible con Ollama, LM Studio, Claude, OpenAI, Grok |
| **Plugins** | Sistema extensible en Python: word-count, daily-note, reading-stats |
| **Keep** | Tablero de tarjetas tipo Google Keep para notas rápidas |
| **Acceso móvil** | El servidor local es accesible desde el navegador del móvil en la misma red |

---

## Requisitos

- **Python 3.11+**
- **Node.js 18+** (solo para compilar el frontend)

Las dependencias Python se instalan automáticamente en el primer arranque.

---

## Instalación y primer arranque

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/melete.git
cd melete
```

### 2. Compilar el frontend (solo una vez)

```bash
cd ui
npm install
npm run build
cd ..
```

### 3. Arrancar la aplicación

```bash
python main.py
```

En el primer arranque:
- Se instalan automáticamente las dependencias Python (`fastapi`, `uvicorn`, `pymupdf`, `ebooklib`, etc.)
- Se abre una ventana de escritorio (via pywebview) o el navegador si no hay display
- Se pedirá elegir una carpeta como **vault** (p. ej. `C:\Users\Tu\MiVault`)

### Windows — scripts de ayuda

```bat
setup.bat    # Instala dependencias
start.bat    # Arranca la aplicación
```

### Linux / macOS

```bash
chmod +x setup.sh start.sh
./setup.sh
./start.sh
```

---

## Acceso desde el móvil

Melete levanta un servidor HTTP en el puerto **7749**. Desde cualquier dispositivo en la misma red:

1. Arranca `python main.py` en tu ordenador
2. Anota la IP local (p. ej. `192.168.1.100`)
3. Abre `http://192.168.1.100:7749` en el navegador del móvil
4. Añade a pantalla de inicio para experiencia tipo app (PWA)

---

## Estructura del vault

El vault es una carpeta normal en tu sistema. Melete la crea automáticamente la primera vez:

```
MiVault/
├── Files/              # PDFs y EPUBs
├── Notas/              # Notas en Markdown (.md)
│   └── _annotations/   # Anotaciones por documento (JSON)
├── Flashcards/         # Mazos de flashcards (.md)
├── Plugins/            # Plugins de usuario
├── Calendar/
│   └── events.json     # Eventos del calendario
├── .history/           # Historial de versiones por nota
├── config.json         # Configuración de IA y colecciones
└── books_meta.json     # Metadatos y progreso de lectura
```

---

## Configurar la IA

Desde **Ajustes → IA** dentro de la aplicación:

| Proveedor | URL base | Notas |
|---|---|---|
| Ollama (local) | `http://localhost:11434` | Recomendado para privacidad total |
| LM Studio | `http://localhost:1234` | Compatible con API OpenAI |
| OpenAI | `https://api.openai.com/v1` | Requiere API key |
| Claude (Anthropic) | `https://api.anthropic.com` | Requiere API key |
| Grok (xAI) | `https://api.x.ai/v1` | Requiere API key |

Sin IA configurada, el lector funciona igualmente (solo se desactivan Definir/Traducir/Preguntar).

---

## Flujo de trabajo con libros

1. Coloca PDFs o EPUBs en `MiVault/Files/`
2. Abre el libro desde la **Biblioteca**
3. Selecciona texto → aparece el popup de acciones:
   - **Colores** (🔴🟡🟢⚫): resalta y guarda en la nota del libro con timestamp
   - **Definir / Traducir**: consulta a la IA, opción de guardar como flashcard
   - **A notas**: añade el extracto a la nota del libro
4. Activa el **panel de notas** (icono `⊟` en toolbar) para ver todos los extractos sincronizados. Click en un extracto → navega a esa página del PDF

---

## Desarrollo

### Estructura del código

```
melete/
├── main.py              # Punto de entrada: arranca servidor + ventana
├── api_server.py        # Todos los endpoints REST (FastAPI)
├── melete_core.py       # Lógica de negocio: vault, notas, IA, flashcards
├── melete_calendar.py   # Calendario y Pomodoro
├── melete_versions.py   # Snapshots y diff de notas
├── melete_keep.py       # Tablero de tarjetas Keep
├── requirements.txt     # Dependencias Python
└── ui/
    ├── src/
    │   ├── App.tsx              # Shell principal
    │   ├── components/
    │   │   ├── reader/          # ReaderPDF, ReaderEPUB, WordPopup, ReaderNotePanel
    │   │   ├── editor/          # Editor Markdown (Monaco)
    │   │   ├── library/         # Biblioteca de libros
    │   │   ├── graph/           # Grafo D3.js
    │   │   ├── calendar/        # Calendario y Pomodoro
    │   │   ├── flashcards/      # Flashcards y repaso
    │   │   └── ...
    │   ├── store/               # Estado global (Zustand)
    │   └── lib/
    │       ├── api.ts           # Cliente REST
    │       └── types.ts         # Tipos TypeScript
    └── package.json
```

### Frontend en modo desarrollo

```bash
cd ui
npm run dev   # Hot reload en http://localhost:5173
              # El backend debe estar corriendo en :7749
```

### Añadir un plugin

Crea `MiVault/Plugins/mi-plugin/` con:

```
mi-plugin/
├── manifest.json   # { "id": "mi-plugin", "name": "...", "version": "1.0" }
└── index.py        # Lógica del plugin
```

```python
# index.py
def run(ctx):
    content = ctx.get_note("Mi nota")
    ctx.status_msg("Plugin ejecutado")
```

---

## Stack técnico

- **Backend**: Python · FastAPI · PyMuPDF · ebooklib · BeautifulSoup4
- **Frontend**: React 18 · TypeScript · Vite · Tailwind CSS · Monaco Editor · D3.js · Zustand
- **Lector PDF**: @react-pdf-viewer/core
- **Escritorio**: pywebview (opcional, fallback a servidor puro)

---

## Licencia

MIT
