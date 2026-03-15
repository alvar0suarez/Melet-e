SPEC_M5 — Lector EPUB
## Objetivo del milestone
Añadir soporte de lectura de EPUBs con el mismo nivel de calidad
que el lector PDF: highlights de colores, posición persistente,
modo inmersivo en móvil, y panel de highlights para repaso.
## Librería
Usar epub.js (v0.3). A pesar de estar poco mantenido, es la
opción más madura con API de anotaciones via CFI (Canon Fragment
Identifier), que es el sistema estándar de referencias en EPUB.
Los highlights deben guardarse usando CFI ranges, no números
de página, porque los EPUBs no tienen páginas fijas — el texto
se redistribuye según el tamaño de fuente.
## Subida y registro
Mismo flujo que el PDF: botón "Subir EPUB", POST a
/api/documents/upload, guardado en vault/Files/, registro en
la tabla "documents" con type="epub".
## Renderizado
El EPUB se renderiza en un iframe gestionado por epub.js. La
paginación puede ser por scroll continuo o por páginas, elegible
desde los ajustes del lector. El contenido respeta el CSS del
libro por defecto, pero el usuario puede sobreescribirlo con
la fuente y el tamaño que prefiera desde el panel de ajustes.
La tabla de contenidos (TOC) del EPUB se muestra en un panel
lateral izquierdo. Cada entrada de la TOC es clicable y navega
directamente a ese capítulo. La entrada del capítulo actual se
resalta visualmente en la TOC.
## Posición de lectura
La posición se guarda como CFI string en SQLite cada vez que el
usuario cambia de página o capítulo. Al reabrir, epub.js navega
directamente a ese CFI. Esto garantiza que la posición es precisa
al párrafo exacto, independientemente de cambios de fuente o
tamaño.
## Sistema de highlights
Mismo sistema de cuatro colores que el PDF (amarillo, verde,
azul, rojo). La diferencia técnica es que en EPUB la posición
del highlight se guarda como CFI range string en lugar de
coordenadas de página. Esto hace que el highlight sobreviva
correctamente a cambios de fuente y tamaño.
La tabla "highlights" en SQLite es la misma que para PDF. La
columna "position" guarda el CFI como JSON: {"cfi": "epubcfi(...)"}
para EPUBs, y las coordenadas normalizadas para PDFs. El backend
no necesita distinguir — solo guarda y devuelve el JSON.
## Configuración del lector EPUB
El panel de ajustes incluye: familia tipográfica (serif Georgia /
sans-serif Inter / la del libro), tamaño de fuente (12px a 24px),
interlineado (1.4 a 2.0), tema (claro / oscuro / sepia), y modo
de paginación (scroll / páginas). Todos los ajustes se guardan
globalmente para todos los EPUBs (a diferencia del PDF donde
se guardan por documento), porque en los libros el usuario
suele tener unas preferencias de lectura consistentes.
## Modo inmersivo en móvil
Idéntico al del lector PDF. En el Fold 7 con pantalla interior
en portrait, una columna de texto con márgenes generosos. En
landscape, dos columnas de texto separadas por el pliegue,
simulando un libro físico abierto.
## Tap sobre palabra para vocabulario
En el lector EPUB, un tap sostenido (long press) sobre una
palabra abre directamente el popup de vocabulario con la opción
"Añadir al vocabulario", sin necesidad de seleccionar el texto
primero. Esto replica la UX de los e-readers dedicados como
Readera. El tap corto sobre una palabra seleccionada muestra
el popup de highlight normal.