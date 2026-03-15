# SPEC_M9 — Vocabulario con IA

## Objetivo del milestone
Construir la base de datos personal de palabras y expresiones
desconocidas, con enriquecimiento automático via IA (etimología +
definición) y generación automática de dos flashcards por palabra.
Este módulo es el puente entre la lectura activa y el estudio.

## Estructura de datos
La tabla "vocabulary" tiene: id (UUID), word (texto, la palabra
o expresión exacta como la encontró el usuario), language (texto:
"es" o "en"), context_sentence (la frase completa donde apareció
la palabra, guardada para referencia), source_document_id (UUID
opcional, FK a documents si viene de un PDF/EPUB), etymology
(texto, generado por IA), definition (texto, generado por IA),
example_sentence (texto, generado por IA, diferente al contexto
original), register (texto: "culto", "técnico", "coloquial",
"formal", "literario"), ai_enriched (booleano, false hasta que
la IA procesa la entrada), created_at.

## Captura de palabras desde el lector
En el lector PDF y EPUB, cuando el usuario selecciona una sola
palabra o expresión corta (máximo 5 palabras) y abre el popup
de highlight, aparece la opción "Añadir al vocabulario" además
de los colores de highlight. Esta opción no es excluyente:
el usuario puede añadir al vocabulario Y hacer highlight al
mismo tiempo.

En el lector EPUB, un long press (tap sostenido 600ms) sobre
una palabra abre directamente el popup de vocabulario sin
necesidad de seleccionar el texto primero, replicando la UX
de Readera.

Al añadir una palabra, se guarda inmediatamente en SQLite con
word, context_sentence y source_document_id, con ai_enriched=false.
La IA enriquece en segundo plano (ver sección de enriquecimiento).
El usuario no espera a que la IA termine para continuar leyendo.

## Enriquecimiento con IA
Cuando se añade una nueva palabra con ai_enriched=false, el
backend encola una tarea de enriquecimiento. Esta tarea llama
a la IA configurada con el siguiente prompt exacto, que no debe
modificarse salvo instrucción explícita del usuario:

"Enriquece esta entrada de vocabulario en español.
Palabra: {word}
Contexto donde apareció: {context_sentence}
Idioma de la palabra: {language}

Responde ÚNICAMENTE con un JSON con esta estructura exacta, sin
texto adicional:
{
  'etymology': 'Etimología detallada con idioma de origen y
    significado original de cada morfema relevante',
  'definition': 'Definición precisa y completa en español',
  'example_sentence': 'Una frase de ejemplo diferente al contexto
    dado que ilustre el uso correcto',
  'register': 'uno de: culto, técnico, coloquial, formal, literario'
}"

La respuesta se parsea como JSON y se guarda en los campos
correspondientes de la tabla vocabulary, marcando ai_enriched=true.
Si la IA no está disponible (Ollama no corre, no hay API key),
los campos quedan vacíos y ai_enriched permanece false. El usuario
puede reintentar el enriquecimiento manualmente desde la vista
de vocabulario.

## Generación automática de flashcards
Inmediatamente después de que el enriquecimiento IA completa,
se crean automáticamente dos flashcards en el mazo "Vocabulario":

Tarjeta 1 — Etimología:
Anverso: "{word} — ¿cuál es su etimología?"
Reverso: "{etymology}"
source_type: "vocabulary", source_id: id de la entrada

Tarjeta 2 — Definición:
Anverso: "{word}"
Reverso: "{definition}\n\nEjemplo: {example_sentence}"
source_type: "vocabulary", source_id: id de la entrada

Si la IA no está disponible, las flashcards no se crean
automáticamente pero el usuario puede crearlas manualmente
desde la vista de la entrada de vocabulario.

## Vista del vocabulario
La sección Vocabulario del sidebar abre una vista de tarjetas.
Cada tarjeta muestra la palabra en grande, el registro como
etiqueta de color (culto en --color-indigo, técnico en --color-teal,
coloquial en --color-green), y la primera línea de la definición.
Al expandir la tarjeta (clic) se ve la etimología completa, la
definición completa, el ejemplo, y la frase de contexto original
con el documento de origen si existe.

Las tarjetas se pueden ordenar por fecha de adición (defecto),
alfabéticamente, por idioma, o por estado de aprendizaje (nuevo,
aprendiendo, dominado — heredado del estado SM-2 de sus flashcards).

Hay un campo de búsqueda en la parte superior que filtra por
palabra o por contenido de la definición en tiempo real.

El usuario puede añadir palabras manualmente desde esta vista
con un botón "Nueva palabra", rellenando el formulario a mano
si no las encontró en un documento.

## Reconocimiento de variantes morfológicas
Cuando se muestra el popup de vocabulario para una palabra, el
backend verifica si ya existe una entrada para esa palabra o
alguna de sus variantes comunes (plural, forma verbal conjugada).
Si existe, en lugar de crear una entrada duplicada, el popup
muestra la entrada existente con su definición. Esta verificación
es simple: normaliza a minúsculas y compara con las palabras
existentes más sus formas con sufijos comunes (-s, -es, -ado,
-ando, -ción). No requiere NLP complejo.
