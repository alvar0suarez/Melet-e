# Melete — PKM personal autohospedado

## Qué es esto
Aplicación de gestión de conocimiento personal. Corre en local
en un PC con Windows. La interfaz es una app de escritorio nativa
construida con Electron + React. El backend es FastAPI (Python).
El Android APK se conecta al servidor desde cualquier lugar via
Tailscale (VPN privada). Sin base de datos externa — todo persiste
en SQLite + archivos planos en el vault.

## Stack técnico (no negociable)
- Desktop: Electron 33+ envolviendo React (electron-builder para
  empaquetar el instalador .exe en Windows)
- Backend: FastAPI (Python 3.11+) + SQLite WAL mode + FTS5,
  arrancado automáticamente por Electron al iniciar la app
- Frontend: React 19 + Vite + TypeScript (sirve dentro de Electron
  en producción; en desarrollo usa Vite dev server en puerto 5173)
- Estado: Zustand (un solo store: src/store/useAppStore.ts)
- UI: shadcn/ui + Tailwind CSS (SOLO Tailwind, sin inline styles)
- Editor de notas: TipTap con extensión tiptap-markdown
- PDF: react-pdf-highlighter-extended (sobre pdf.js)
- EPUB: epub.js
- Grafo: react-force-graph-2d
- Flashcards: SM-2 implementado en ~30 líneas de TypeScript
- Android: Capacitor — solo después de que el desktop funcione
- IA: cliente OpenAI-compatible, base_url configurable en
  vault/config.json (Ollama local por defecto, Claude/OpenAI
  como alternativa cloud)
- Acceso remoto Android: Tailscale VPN (el APK apunta a la IP
  Tailscale del servidor, configurable en Settings)

## Estructura de carpetas
/backend        → FastAPI, Python, SQLite
/frontend       → React, Vite, TypeScript
/electron       → proceso principal Electron (main.js, preload.js)
/vault          → archivos del usuario (notas .md, PDFs, EPUBs)
/vault/db/      → melete.db (SQLite, NO se commitea)

## Cómo arranca la aplicación
En desarrollo:
  1. `cd backend && venv\Scripts\activate && python main.py`
  2. `cd frontend && npm run dev`
  3. `cd electron && npm start`
     (Electron abre una ventana apuntando a localhost:5173)

En producción (app empaquetada):
  Electron lanza automáticamente el proceso Python del backend
  al arrancar, usando el binario de Python embebido o el del
  sistema. El usuario solo hace doble clic en Melete.exe.

## Reglas de desarrollo (obligatorias siempre)
1. SOLO Tailwind CSS para estilos. Sin inline styles. Las
   únicas excepciones son variables CSS globales en index.css.
2. Un solo store Zustand en frontend/src/store/useAppStore.ts.
3. Toda ruta de fichero del vault pasa por backend/config.py.
   Nunca construir rutas con strings manuales en otros ficheros.
4. Git commit después de cada milestone completado y verificado.
5. El servidor FastAPI siempre corre en el puerto 7749.
6. En Electron, toda comunicación con el backend es via HTTP a
   localhost:7749. Nunca acceso directo al filesystem desde React.
7. Windows usa `venv\Scripts\activate` (no source venv/bin/activate)

## Paleta de colores (definir en frontend/src/index.css)
--color-bg: #0d1117        /* fondo principal */
--color-bg2: #161b22       /* panels, sidebars */
--color-bg3: #21262d       /* hover, cards */
--color-text: #e6edf3      /* texto principal */
--color-text2: #8b949e     /* metadatos, secundario */
--color-indigo: #818cf8    /* acento principal, links activos */
--color-teal: #2dd4bf      /* progreso, tags */
--color-green: #3fb950     /* estado positivo */
--color-red: #f85149       /* error, eliminar */

## Comandos útiles en Windows
# Activar entorno virtual Python en Windows
venv\Scripts\activate

# Instalar dependencias Python
pip install -r requirements.txt

# Arrancar backend
python main.py

# Arrancar frontend (desarrollo)
npm run dev

# Compilar frontend (producción)
npm run build