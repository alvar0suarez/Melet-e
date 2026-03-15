# SPEC_M12 — Capa IA (cliente unificado)

## Objetivo del milestone
Construir la abstracción que permite a todos los módulos de la
app usar IA de forma transparente, sin saber ni importarles si
están hablando con Ollama local o con una API cloud. Este milestone
no añade features visibles para el usuario — prepara la
infraestructura que el Milestone 13 usará para todo.

## Principio arquitectónico
Ollama expone una API compatible con OpenAI en http://localhost:11434/v1.
Esto significa que el mismo cliente Python puede hablar con Ollama
local o con Claude/OpenAI simplemente cambiando la base_url y la
api_key. Toda la lógica de IA del backend debe pasar por un único
módulo backend/ai_client.py que encapsula esta abstracción.

## Configuración
Los ajustes de IA se guardan en vault/config.json con esta
estructura:
{
  "ai": {
    "provider": "ollama",  // "ollama", "claude", "openai"
    "ollama_base_url": "http://localhost:11434/v1",
    "ollama_model": "llama3.2",
    "claude_api_key": "",
    "claude_model": "claude-sonnet-4-20250514",
    "openai_api_key": "",
    "openai_model": "gpt-4o-mini",
    "openai_compat_base_url": ""  // para LM Studio, vLLM, etc.
  }
}

El proveedor activo es el campo "provider". Si provider es "ollama"
y Ollama no responde al hacer una request de prueba, el cliente
debe fallar con un error claro: "Ollama no está disponible.
Verifica que está corriendo en localhost:11434."

## El módulo ai_client.py
Este módulo exporta una sola clase AIClient con dos métodos
públicos. El método complete(prompt, system_prompt, max_tokens)
hace una llamada no-streaming y devuelve el texto completo de
la respuesta. Se usa para tareas batch como enriquecimiento de
vocabulario. El método stream(prompt, system_prompt) es un
generador asíncrono que yield-ea tokens según llegan. Se usa
para el chat contextual del lector donde el usuario ve la
respuesta aparecer palabra por palabra.

Internamente, el cliente usa la librería openai de Python con
base_url y api_key configurados según el proveedor activo.

## Endpoint de configuración
GET /api/ai/config devuelve la configuración actual con las
API keys enmascaradas (solo los últimos 4 caracteres visibles).
PUT /api/ai/config recibe la configuración completa y la guarda
en vault/config.json. POST /api/ai/test hace una llamada de
prueba con el prompt "Responde solo con la palabra OK" y devuelve
{"success": true, "response": "OK", "latency_ms": 234} o
{"success": false, "error": "mensaje de error"}.

## Vista de Settings IA
La sección Settings de la app tiene una pestaña IA con:
selector de proveedor (Ollama / Claude / OpenAI / Compatible),
campos de configuración relevantes según el proveedor seleccionado,
botón "Probar conexión" que llama a /api/ai/test y muestra el
resultado con latencia, y un indicador de estado en la barra
inferior de la app (punto verde si IA disponible, gris si no).

## Gestión de errores
Todos los módulos que usan IA (vocabulario, resúmenes, traducción,
chat) deben degradar graciosamente cuando la IA no está disponible:
mostrar el formulario manual en lugar del enriquecimiento
automático, deshabilitar el botón con un tooltip "IA no disponible",
y nunca crashear ni mostrar errores técnicos al usuario.
