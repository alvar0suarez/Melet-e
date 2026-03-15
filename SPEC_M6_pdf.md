SPEC_M6 — Búsqueda full-text
## Objetivo del milestone
Permitir al usuario buscar en todo su conocimiento desde un único
lugar: notas, highlights, vocabulario, y artículos web. La búsqueda
debe ser instantánea, relevante, y mostrar contexto suficiente para
que el usuario reconozca el resultado sin tener que abrir cada item.
## Motor de búsqueda
Usar FTS5 (Full-Text Search 5) de SQLite. FTS5 está incluido en
SQLite sin dependencias adicionales y proporciona búsqueda BM25
(relevancia), búsqueda por prefijo, frases exactas entre comillas,
y snippets con términos resaltados.
## Índices FTS5
Crear tablas virtuales FTS5 para cada tipo de contenido. La tabla
notes_fts indexa title y content de la tabla notes. La tabla
highlights_fts indexa selected_text y note de la tabla highlights,
con referencia al document_id. La tabla vocabulary_fts indexa word,
etymology, y definition de la tabla vocabulary. La tabla
webcontent_fts indexa title y content de los artículos web.
Los índices FTS5 se mantienen sincronizados con las tablas
principales usando triggers de SQLite: cuando se inserta, actualiza
o borra un registro en la tabla principal, el trigger actualiza
automáticamente la tabla FTS5 correspondiente.
## Endpoint de búsqueda
GET /api/search?q={query}&types={tipos}&limit={n} donde types es
una lista opcional de "notes,highlights,vocabulary,web" para
filtrar por tipo. El endpoint devuelve un array de resultados
unificados, cada uno con: id, type (el tipo de contenido), title
(título del resultado), snippet (fragmento con el término buscado
resaltado con etiquetas <mark>), source (nombre del documento si
el resultado es un highlight), y relevance_score.
Los resultados se ordenan por relevance_score descendente. El
límite por defecto es 20 resultados.
## Interfaz de búsqueda
La búsqueda se activa con Ctrl+K (o Cmd+K) desde cualquier parte
de la app, abriendo un modal flotante centrado en pantalla. Este
modal tiene un campo de texto con foco automático, una fila de
filtros por tipo (Todos / Notas / Highlights / Vocabulario / Web),
y la lista de resultados con scroll.
Cada resultado muestra un icono de tipo, el título en negrita,
el snippet con los términos buscados resaltados en --color-indigo,
y el origen (nombre del documento para highlights). Hacer clic
en un resultado cierra el modal y navega directamente al contenido:
abre la nota en el editor, navega al PDF en la página del highlight,
o abre el artículo web.
La búsqueda se ejecuta en tiempo real mientras el usuario escribe,
con un debounce de 200ms para no sobrecargar con cada keystroke.
## Indexación inicial
Al arrancar el backend por primera vez, o cuando se detecta que
las tablas FTS5 están vacías, se ejecuta una indexación completa
que recorre todos los registros existentes en las tablas
principales y los inserta en los índices FTS5. Este proceso es
transparente para el usuario.