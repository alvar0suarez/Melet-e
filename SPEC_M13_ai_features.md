# SPEC_M13 — Funciones IA

## Objetivo del milestone
Implementar todas las features de IA visibles para el usuario,
usando la capa construida en el Milestone 12. Este milestone
toca casi todos los módulos anteriores para añadirles capacidades
de IA de forma quirúrgica.

---

## Feature 1: Enriquecimiento de vocabulario
Ya especificado en SPEC_M9. En este milestone se conecta la
lógica de enriquecimiento con el AIClient real del Milestone 12.
En el M9 el placeholder devolvía un JSON hardcodeado de prueba.
Aquí se reemplaza por la llamada real a la IA.

---

## Feature 2: Resumen de documento
Disponible para PDFs, EPUBs, y artículos web. En el menú de
opciones de cualquier documento hay una opción "Generar resumen
con IA". Al pulsarla aparece un modal con opciones: extensión
del resumen (breve ~200 palabras / detallado ~500 palabras /
completo con secciones), y idioma de salida (mismo idioma que
el documento / español siempre).

El backend extrae el texto del documento (usando PyMuPDF para
PDF, ebooklib para EPUB, o el contenido Markdown para web) y
lo envía a la IA con un prompt que instruye a generar el resumen
en el formato y extensión solicitados.

El resumen generado aparece primero en un panel de preview dentro
del modal, donde el usuario puede leerlo antes de guardarlo.
Hay un botón "Guardar como nota" que crea una nueva nota Markdown
en la carpeta "Resúmenes/" con el título "{título del documento}
— Resumen" y el contenido del resumen, vinculada al documento
de origen.

---

## Feature 3: Traducción de texto seleccionado
En cualquier lector (PDF, EPUB, web), cuando el usuario tiene
texto seleccionado, el popup de highlight incluye una opción
"Traducir al español" (o "Traducir al inglés" si el documento
está en español). Al pulsarla, aparece un panel flotante en
la parte inferior de la pantalla que muestra la traducción
generada por la IA. El panel tiene botón de cerrar y botón
"Copiar traducción". El texto original no se modifica.

---

## Feature 4: Traducción de documento completo
En el menú principal de un PDF o EPUB, hay una opción "Traducir
documento completo". Al pulsarla aparece un modal con: idioma
de destino (español / inglés), y un aviso de que el proceso
puede tardar varios minutos dependiendo del tamaño del documento
y del proveedor de IA.

El backend ejecuta la traducción como un job asíncrono. El
progreso es visible en un indicador en la barra de estado de
la app (porcentaje completado). Al terminar, el resultado se
guarda como un nuevo documento en vault/Files/ con el sufijo
"[ES]" o "[EN]" en el nombre. Una notificación avisa al usuario
cuando está listo.

Para PDFs, la traducción genera un nuevo PDF con el texto
traducido manteniendo el layout aproximado. Para EPUBs, genera
un nuevo EPUB con los capítulos traducidos.

---

## Feature 5: Chat contextual en el lector
En el lector de PDF, EPUB, y artículos web, hay un botón de
chat en la barra superior que abre un panel lateral derecho
de 320px. Este panel es una interfaz de chat donde el usuario
puede hacer preguntas sobre el contenido que está leyendo.

Cada mensaje del usuario se envía al backend junto con el
contexto actual: el texto de la página visible en PDF (o el
capítulo en EPUB). El sistema prompt le instruye a la IA a
responder únicamente basándose en el texto proporcionado como
contexto, citando partes relevantes cuando sea apropiado.

El chat soporta streaming: las respuestas de la IA aparecen
token por token en tiempo real. El historial del chat de cada
documento se guarda en SQLite y se restaura al reabrir el
documento.

Si el usuario selecciona texto antes de abrir el chat, ese
texto aparece pre-citado en el campo de entrada del chat,
facilitando preguntas del tipo "¿Qué significa exactamente
este párrafo?".

---

## Feature 6: Subrayado automático de vocabulario
Esta es la feature transversal anotada en PENDIENTES.md.
En todos los lectores (notas, PDF, EPUB, web), las palabras
que existen en la base de datos de vocabulario del usuario
aparecen con un subrayado punteado en --color-teal, visualmente
distinto de los highlights manuales.

Al hacer clic sobre una de estas palabras subrayadas, aparece
un popup pequeño con la etimología y la definición almacenadas,
y un botón "Ver entrada completa" que navega al vocabulario.

La implementación usa un Web Worker que, al cargar un documento,
procesa el texto en segundo plano buscando coincidencias con el
vocabulario (incluyendo variantes morfológicas básicas). No bloquea
el hilo principal. Los resultados se aplican como decoraciones
sobre el texto renderizado.

---

## Prompts editables
Todos los prompts que la app usa internamente (enriquecimiento
de vocabulario, resúmenes, traducción) son editables por el
usuario desde Settings → IA → Prompts. Cada prompt tiene un
nombre descriptivo, el texto editable, y un botón "Restaurar
por defecto". Esto permite al usuario personalizar el
comportamiento de la IA sin tocar código.
