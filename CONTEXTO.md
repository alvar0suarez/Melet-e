# CONTEXTO.md — Estado del proyecto Melete

## Qué es
PKM personal autohospedado. App de escritorio con Electron + React
en Windows, backend FastAPI + SQLite en Python, APK Android con
Capacitor que se conecta via Tailscale desde cualquier lugar.

## Decisiones técnicas permanentes
- SOLO Tailwind CSS para estilos, sin inline styles
- Un solo store Zustand en frontend/src/store/useAppStore.ts
- Toda ruta de fichero del vault pasa por backend/config.py
- Las notas se guardan en SQLite Y como archivos .md en vault/Notas/
- Windows: activar venv con venv\Scripts\activate
- Windows: PowerShell requiere Set-ExecutionPolicy RemoteSigned

## Milestones
- [x] M1 — Scaffold: Electron + FastAPI + React funcionando
- [X] M2 — CRUD notas Markdown (EN CURSO)
- [ ] M3 — Editor TipTap con wiki-links y backlinks
- [ ] M4 — Lector PDF con highlights de colores
- [ ] M5 — Lector EPUB
- [ ] M6 — Búsqueda full-text (FTS5)
- [ ] M7 — Grafo de conocimiento
- [ ] M8 — Flashcards con SM-2
- [ ] M9 — Vocabulario con IA
- [ ] M10 — Web Clipper (extensión de navegador)
- [ ] M11 — Calendario y Keep
- [ ] M12 — Capa IA (Ollama + Claude/OpenAI)
- [ ] M13 — Funciones IA (resúmenes, traducción, vocabulario auto)
- [ ] M14 — Android APK con Capacitor

## Problemas conocidos y soluciones
- Si el puerto 7749 está ocupado: netstat -ano | findstr :7749
  para encontrar el proceso y taskkill /PID xxxx /F para matarlo
- Si npm falla en PowerShell: Set-ExecutionPolicy RemoteSigned

## Notas importantes por milestone
M1: completado sin incidencias tras resolver entorno virtual
    y política de ejecución de PowerShell.