# SPEC_M10 — Web Clipper

## Objetivo del milestone
Guardar artículos y páginas web en el vault, tanto para lectura
posterior (como Pocket) como referencia permanente vinculable
con notas. El artículo guardado debe ser legible sin distracciones
y debe soportar el mismo sistema de highlights que PDF y EPUB.

## Arquitectura
El web clipper tiene dos partes. La primera es una extensión de
navegador (Chrome y Firefox) que el usuario instala una sola vez.
La segunda es el lector de artículos web dentro de la app Melete.

## Extensión de navegador
La extensión usa Manifest V3 (el estándar actual). Al hacer clic
en el icono de la extensión en la barra del navegador, aparece
un popup pequeño con: el título detectado de la página, una
vista previa de los primeros 200 caracteres del contenido limpio,
un campo de etiquetas (opcional), y dos botones: "Guardar para
leer" y "Guardar como referencia".

La extensión ejecuta Readability.js (de Mozilla) sobre el DOM
de la página actual para extraer el contenido limpio: título,
autor si está disponible, fecha de publicación si está disponible,
y el cuerpo del artículo sin anuncios ni navegación. Luego convierte
el HTML limpio a Markdown usando Turndown.js. El resultado se
envía via POST a http://localhost:7749/api/web/save (o a la IP
Tailscale configurada en los ajustes de la extensión para acceso
remoto desde móvil).

La extensión tiene un campo de configuración para la URL del
servidor (por defecto http://localhost:7749) de forma que funciona
tanto desde el escritorio (localhost) como desde el móvil fuera
de casa (IP Tailscale).

## Backend: guardado de artículos
El endpoint POST /api/web/save recibe: url (la URL original),
title, content (Markdown limpio), author (opcional), published_at
(opcional), tags (array de strings), y read_later (booleano).

El backend guarda el Markdown en vault/Web/{slug}/content.md
donde slug se genera a partir del título (caracteres alfanuméricos
y guiones, máximo 60 caracteres). También guarda los metadatos
en vault/Web/{slug}/meta.json con: url, title, author,
published_at, tags, read_later, saved_at, y read (booleano,
false por defecto).

Crea un registro en la tabla "web_articles" de SQLite con los
mismos campos más id (UUID) y reading_progress.

## Lector de artículos web
La sección Web del sidebar muestra dos listas: "Por leer" (artículos
con read_later=true y read=false) y "Biblioteca" (todos los demás).
Cada ítem muestra título, dominio de origen (extraído de la URL),
y tiempo estimado de lectura (calculado como palabras / 200).
Los artículos no leídos tienen el título en --color-text, los
leídos en --color-text2.

Al abrir un artículo, se renderiza el Markdown con la misma
tipografía y configuración que el lector EPUB: fuente elegible,
tamaño ajustable, tema claro/oscuro/sepia. En la barra superior
hay un botón con el dominio de origen que abre la URL original
en el navegador externo.

El sistema de highlights (cuatro colores, popup con notas,
panel de highlights lateral) funciona exactamente igual que
en PDF y EPUB. Los highlights de artículos web se guardan en
la misma tabla "highlights" con source_type="web" y el id del
artículo como document_id.

## Vinculación con notas
Desde la vista de un artículo hay un botón "Vincular nota" que
abre un selector para elegir una nota existente o crear una nueva.
Al vincular, el artículo aparece en el panel de backlinks de esa
nota, y desde la nota hay un enlace al artículo. Esta vinculación
se guarda en una tabla "note_sources" con note_id y source_id
(puede ser document_id o web_article_id).

## Marcado como leído
Al terminar de leer un artículo (cuando el scroll llega al final
o manualmente con un botón), el artículo se marca como read=true
y desaparece de la lista "Por leer". Permanece accesible en
"Biblioteca" para futura referencia.

## Etiquetas
Los artículos pueden tener etiquetas (tags) asignadas al guardar
o editadas después. En el sidebar hay un panel de filtrado por
etiquetas. Las etiquetas se guardan como array JSON en SQLite
y como campo en meta.json.
