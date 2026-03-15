# SPEC_M8 — Flashcards con repaso espaciado

## Objetivo del milestone
Implementar un sistema de flashcards organizado por mazos temáticos
con el algoritmo SM-2 para repaso espaciado. Las tarjetas se crean
manualmente o desde highlights y vocabulario. El usuario puede
crear nuevos mazos libremente.

## Estructura de datos
La tabla "decks" tiene: id (UUID), name (texto, ej. "Filosofía",
"Inglés B2", "Biología"), description (opcional), created_at.
La tabla "flashcards" tiene: id (UUID), deck_id (FK a decks),
front (texto, el anverso), back (texto, el reverso), source_type
(texto: "manual", "highlight", "vocabulary"), source_id (UUID
opcional, referencia al highlight o entrada de vocabulario que
originó esta tarjeta), interval (entero, días hasta la próxima
revisión), repetitions (entero, número de veces revisada con
éxito consecutivo), ease_factor (real, factor de facilidad SM-2,
empieza en 2.5), due_date (texto ISO8601, fecha de próxima
revisión), last_review (texto ISO8601), created_at.

## Algoritmo SM-2
Implementar SM-2 en ~30 líneas de TypeScript en el frontend en
frontend/src/lib/sm2.ts. La función recibe la tarjeta actual y
la calificación del usuario (0 a 5) y devuelve los nuevos valores
de interval, repetitions, ease_factor y due_date.

La lógica es: si la calificación es menor que 3 (no recordado),
se resetean repetitions a 0 e interval a 1. Si la calificación
es 3 o mayor (recordado), se incrementa repetitions, se calcula
el nuevo interval (1 día si repetitions=1, 6 días si repetitions=2,
interval_anterior * ease_factor para repetitions mayores), y se
ajusta ease_factor según la fórmula original SM-2. El ease_factor
nunca baja de 1.3.

## Mazos
La sección Flashcards del sidebar muestra la lista de mazos.
Cada mazo muestra su nombre y el número de tarjetas debidas hoy
entre paréntesis en --color-teal. Hay un botón "Nuevo mazo" que
abre un modal con campo de nombre y descripción opcional.

Los mazos predefinidos que existen desde el principio son
"Vocabulario" (donde van automáticamente las tarjetas generadas
desde el módulo de vocabulario) y "Sin clasificar" (donde van
las tarjetas creadas manualmente sin asignar mazo). El usuario
puede renombrar y eliminar cualquier mazo, incluyendo los
predefinidos. Al eliminar un mazo, sus tarjetas se mueven a
"Sin clasificar" en lugar de borrarse.

## Creación manual de tarjetas
Dentro de un mazo hay un botón "Nueva tarjeta" que abre un
formulario con campo "Anverso" (lo que se pregunta), campo
"Reverso" (la respuesta), y selector de mazo. Ambos campos
soportan Markdown básico para poder formatear la respuesta
con negrita, listas, o bloques de código si el mazo es técnico.

## Sesión de estudio
Al pulsar "Estudiar" en un mazo, se inicia una sesión con todas
las tarjetas cuyo due_date es hoy o anterior. La sesión muestra
una tarjeta a la vez: primero el anverso solo, con un botón
"Ver respuesta". Al pulsarlo, aparece el reverso y una fila de
cinco botones numerados del 1 al 5 con etiquetas: 1 Bloqueado,
2 Muy difícil, 3 Difícil, 4 Bien, 5 Fácil. Al pulsar cualquiera,
la tarjeta se puntúa con SM-2, se guarda en SQLite, y aparece
la siguiente tarjeta.

Al terminar todas las tarjetas debidas, aparece una pantalla de
resumen con: total de tarjetas revisadas, porcentaje de respuestas
con calificación 4 o 5 (consideradas correctas), y la fecha de
la próxima sesión (cuándo habrá de nuevo tarjetas debidas).

## Vinculación con origen
Las tarjetas creadas desde un highlight o desde vocabulario
muestran un botón "Ver en contexto" en la sesión de estudio.
Este botón abre el documento PDF/EPUB en la página donde estaba
el highlight, o abre la entrada de vocabulario correspondiente.
Esto permite al usuario recordar el contexto original de la tarjeta
si no la recuerda solo con el anverso.

## Estadísticas por mazo
Cada mazo tiene una vista de estadísticas accesible desde un
botón de información. Muestra: total de tarjetas, tarjetas nuevas
(nunca estudiadas), tarjetas en aprendizaje (repetitions < 3),
tarjetas maduras (repetitions >= 3), y una gráfica de barras
simple con el número de tarjetas revisadas por día en los últimos
30 días.
