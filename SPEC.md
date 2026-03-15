# SPEC.md — Especificación de funcionalidades de Melete

---

## Módulo: Notas — Milestone 2 (CRUD básico)

### Objetivo del milestone
Establecer el patrón de comunicación entre React y FastAPI usando
notas como primer modelo de datos. Al terminar este milestone, los
datos deben fluir de verdad: crearse en el frontend, guardarse en
SQLite, persistir al recargar, y existir como archivos .md reales
en el filesystem.

### Base de datos
La tabla "notes" en SQLite tiene estas columnas exactas:
- id: TEXT, clave primaria, UUID v4 generado en el backend
- title: TEXT, no nulo, título de la nota
- content: TEXT, contenido en Markdown, puede estar vacío
- folder: TEXT, ruta de carpeta tipo "personal/libros" o vacío
  si la nota está en la raíz. El separador "/" mapea a
  subcarpetas reales en el filesystem.
- created_at: TEXT, fecha ISO8601, se asigna al crear
- updated_at: TEXT, fecha ISO8601, se actualiza al editar

### Persistencia dual (SQLite + archivo .md)
Cada nota existe en dos lugares simultáneamente. En SQLite para
búsquedas rápidas y metadatos. Y como archivo Markdown en
vault/Notas/{folder}/{title}.md para que el usuario pueda acceder
a sus notas con cualquier editor de texto externo.

El archivo .md contiene únicamente el campo "content" de la nota,
sin metadatos YAML frontmatter en este milestone. Cuando se edita
una nota, el archivo .md se sobreescribe con el nuevo contenido.
Cuando se borra una nota, el archivo .md se elimina del filesystem.
Si el folder cambia al editar, el archivo .md anterior se elimina
y se crea uno nuevo en la nueva ubicación.

### Endpoints del backend
El router vive en backend/routers/notes.py y se registra en
main.py con el prefijo /api.

GET /api/notes devuelve una lista de objetos con solo los campos
necesarios para el sidebar: id, title, folder y updated_at.
No devuelve el campo content para no sobrecargar la respuesta
cuando hay muchas notas.

POST /api/notes recibe title, content y folder. Genera el UUID
en el backend, asigna created_at y updated_at, guarda en SQLite,
crea el archivo .md, y devuelve la nota completa.

GET /api/notes/{id} devuelve la nota completa incluyendo content.
Se llama cuando el usuario hace clic en una nota del sidebar para
cargarla en el editor.

PUT /api/notes/{id} recibe title, content y folder. Actualiza
SQLite, actualiza el archivo .md (moviéndolo si el folder cambió),
y devuelve la nota actualizada.

DELETE /api/notes/{id} elimina el registro de SQLite y el archivo
.md del filesystem. Devuelve 204 sin contenido.

### Interfaz de usuario
El layout tiene dos paneles. El panel izquierdo es un sidebar de
260px de ancho con fondo --color-bg2, que muestra la lista de notas.
Cada ítem de la lista muestra el título en --color-text y la carpeta
en --color-text2 con fuente más pequeña. El ítem activo tiene fondo
--color-bg3. Hay un botón "Nueva nota" en la parte superior del
sidebar.

El panel derecho es el área principal con fondo --color-bg, que
muestra un formulario con campo de texto para el título, campo de
texto para la carpeta (opcional), y un textarea para el contenido
Markdown. Hay un botón "Guardar" y un botón "Eliminar" (este último
deshabilitado cuando no hay nota activa).

### Estado con Zustand
El store useAppStore.ts gestiona: notes (array con la lista del
sidebar), activeNote (la nota completa actualmente en el editor),
y las acciones fetchNotes, createNote, updateNote, deleteNote,
y setActiveNote. Todas las llamadas a la API pasan por funciones
en frontend/src/api/index.ts, nunca directamente desde componentes.

### Menú contextual con clic derecho
Tanto las carpetas como las notas individuales en el árbol del
sidebar responden al clic derecho mostrando un menú contextual
flotante. Para las notas, las opciones son: Renombrar, Mover a
carpeta (abre un selector de carpetas existentes), Duplicar, y
Eliminar (con confirmación). Para las carpetas, las opciones son:
Nueva nota aquí, Renombrar carpeta, y Eliminar carpeta (solo si
está vacía; si tiene notas, muestra un aviso). El menú se cierra
al hacer clic fuera o al pulsar Escape.
---

## Módulo: Notas — Milestone 3 (Editor TipTap + wiki-links)

### Objetivo del milestone
Reemplazar el textarea básico del Milestone 2 por un editor rico
con TipTap, añadir soporte de wiki-links con backlinks automáticos,
y construir la jerarquía de carpetas en el sidebar. Este milestone
no modifica el backend de forma significativa — los datos ya
persisten correctamente. El trabajo es casi enteramente de frontend
más una pequeña adición de backlinks en el backend.

### El editor TipTap
El textarea del Milestone 2 se reemplaza por un editor TipTap
con las extensiones StarterKit (negrita, cursiva, listas, headings),
tiptap-markdown para serializar y deserializar Markdown (porque
el contenido sigue guardándose en disco como .md), y una extensión
personalizada para wiki-links descrita más abajo.

El editor tiene dos modos visibles que el usuario puede alternar
con un botón o atajo de teclado (Ctrl+Shift+P): modo editor
(TipTap renderizando el contenido como rich text) y modo fuente
(un textarea mostrando el Markdown crudo). Esto permite al usuario
editar el Markdown directamente si lo prefiere.

La tipografía del editor usa Georgia o una fuente serif similar
para el contenido, con tamaño de línea generoso (line-height 1.8)
para facilitar la lectura. Los headings son visualmente
distinguibles con tamaño y peso distintos.

### Wiki-links: sintaxis y comportamiento
Los wiki-links usan la sintaxis [[nombre de nota]]. Al escribir
[[ en el editor, aparece un popup de autocompletado que busca en
tiempo real entre los títulos de todas las notas existentes. El
usuario puede seguir escribiendo para filtrar o usar las flechas
para navegar y Enter para seleccionar.

Un wiki-link renderizado aparece con color --color-indigo y cursor
pointer. Al hacer clic, carga esa nota en el editor (equivalente
a hacer clic en ella desde el sidebar). Si la nota referenciada
no existe, el wiki-link aparece en --color-red y al hacer clic
muestra un diálogo "Esta nota no existe. ¿Crear nota con este
título?" con botones Crear y Cancelar.

La serialización a Markdown guarda los wiki-links como [[nombre]]
en el archivo .md, exactamente como los escribe el usuario, para
compatibilidad con Obsidian y otros PKMs.

### Backlinks: implementación
Un backlink es una referencia inversa: si la nota A contiene
[[nota B]], entonces la nota B sabe que A la menciona. Esto se
implementa con una tabla adicional en SQLite llamada "links" con
columnas source_id (id de la nota que contiene el wiki-link) y
target_title (el texto dentro de [[]]). Esta tabla se recalcula
completamente cada vez que se guarda una nota: se borran todos
los links donde source_id es la nota guardada y se reinsertan
los que se encuentren en el nuevo contenido.

El endpoint GET /api/notes/{id}/backlinks devuelve la lista de
notas que enlazan a esta nota. En el frontend, el panel del editor
tiene una sección colapsable al pie llamada "Referencias" que
muestra estos backlinks como una lista de títulos clicables.

### Jerarquía de carpetas en el sidebar
El sidebar del Milestone 2 mostraba una lista plana de notas.
En este milestone se transforma en un árbol colapsable. Las
carpetas se muestran como nodos con icono de carpeta, y las notas
dentro de ellas aparecen indentadas. Una nota con folder
"personal/libros" aparece dentro de la carpeta "libros" que está
dentro de "personal".

Las carpetas se pueden colapsar y expandir con clic. El estado
de colapso de cada carpeta se guarda en localStorage para que
persista entre recargas. Las carpetas vacías no aparecen en el
árbol. No hay límite de profundidad de anidación, pero el diseño
visual funciona bien hasta 3 niveles.

Hay un botón "Nueva carpeta" junto al botón "Nueva nota" que
permite crear una carpeta escribiendo su nombre. Crear una carpeta
vacía no hace nada en el backend — las carpetas existen solo si
contienen notas.

### Búsqueda rápida dentro del sidebar
En la parte superior del sidebar hay un campo de búsqueda que
filtra las notas visibles en tiempo real mientras el usuario
escribe. La búsqueda es local (filtra el array de notas ya
cargado en Zustand) y busca coincidencias en el título y en el
nombre de la carpeta. No es la búsqueda full-text del Milestone 6
— esa busca también dentro del contenido de las notas. Esta es
una búsqueda de navegación rápida, solo por título.