# SPEC_M11 — Calendario y Keep

## Objetivo del milestone
Implementar dos herramientas de captura rápida: un calendario
personal para eventos y sesiones de estudio, y un sistema de
notas rápidas tipo Google Keep con soporte de bullets, checkboxes,
recordatorios, y elevación a notas Markdown completas.

---

## Parte A: Keep (notas rápidas)

## Estructura de datos
La tabla "keep_cards" tiene: id (UUID), title (texto opcional),
content (texto, soporta Markdown básico), color (texto: "default",
"red", "orange", "yellow", "green", "teal", "blue", "purple"),
pinned (booleano, las tarjetas fijadas aparecen primero),
archived (booleano), reminder_at (texto ISO8601 opcional),
calendar_event_id (UUID opcional, FK a events si el recordatorio
genera un evento), created_at, updated_at.

## Vista de tarjetas
La sección Keep muestra las tarjetas en un layout de cuadrícula
masonry (como Google Keep): múltiples columnas, cada tarjeta
con altura variable según su contenido. Las tarjetas fijadas
aparecen en una sección separada en la parte superior bajo el
encabezado "Fijadas".

Cada tarjeta muestra su color de fondo (versiones atenuadas de
la paleta del proyecto para el modo oscuro), el título si existe,
y el contenido. Si el contenido tiene checkboxes, se renderizan
como checkboxes interactivos directamente en la tarjeta sin
necesidad de abrirla. Si el contenido supera ~5 líneas, se trunca
con un "Ver más".

## Tipos de contenido soportados
El campo content de cada tarjeta soporta: texto libre, listas
de bullets con guión o asterisco, listas de checkboxes con la
sintaxis - [ ] y - [x], y texto con negrita e cursiva Markdown.
No soporta headings ni tablas — para contenido más complejo,
el usuario debe elevar la tarjeta a nota Markdown completa.

## Creación y edición
Un botón flotante "+" en la esquina inferior derecha abre un
modal de creación rápida. El modal tiene campo de título opcional,
área de texto para el contenido, selector de color (paleta de
círculos de colores), botón de recordatorio, y botón fijar.
La tarjeta se guarda al cerrar el modal o al pulsar Ctrl+Enter.

Hacer clic en una tarjeta existente la abre en el mismo modal
para edición. Los cambios se guardan automáticamente al cerrar.

## Recordatorios
Al añadir un recordatorio a una tarjeta, el usuario elige fecha
y hora con un date-time picker. El recordatorio se guarda en
reminder_at. El sistema de notificaciones (implementado en el
milestone de Android con Capacitor) usará este campo para enviar
una notificación push en el momento indicado. En escritorio,
Electron puede implementar notificaciones del sistema operativo
usando la API de Notification de Node.js.

Además, al crear un recordatorio, se ofrece la opción de crear
automáticamente un evento en el calendario con el título de la
tarjeta y la fecha/hora del recordatorio. Si el usuario acepta,
se crea el evento y se vincula mediante calendar_event_id.

## Elevación a nota Markdown
Cada tarjeta tiene un botón "Convertir a nota" en el menú de
opciones (accesible con clic derecho o desde el menú de tres
puntos). Al convertir, se crea una nueva nota Markdown con el
título de la tarjeta y el contenido, y la tarjeta se archiva
automáticamente (no se borra, por si el usuario quiere recuperarla).
La nota creada tiene una referencia al id de la tarjeta original
en sus metadatos.

---

## Parte B: Calendario

## Estructura de datos
La tabla "events" tiene: id (UUID), title (texto), description
(texto opcional, Markdown), start_at (texto ISO8601 con hora),
end_at (texto ISO8601 con hora), all_day (booleano), color
(texto, uno de los colores de la paleta), reminder_minutes
(entero opcional, minutos antes del evento para notificar),
note_id (UUID opcional, FK a notes si el evento tiene una nota
vinculada), created_at.

## Vista mensual
La vista por defecto es el mes completo en formato cuadrícula.
Cada día muestra hasta 3 eventos con su color de fondo. Si hay
más de 3, aparece "+N más" que expande la vista de ese día.
Navegar entre meses con flechas izquierda/derecha. Un botón
"Hoy" lleva al mes actual.

## Vista diaria
Al hacer clic en un día del calendario mensual, se abre la vista
diaria de ese día. La vista diaria muestra una línea de tiempo
vertical con los eventos del día posicionados según su hora de
inicio y duración. Los eventos de todo el día aparecen en una
barra en la parte superior. Hay flechas para navegar al día
anterior y siguiente sin volver a la vista mensual.

## Creación de eventos
Hacer clic en un espacio vacío del calendario (en vista mensual,
en el día; en vista diaria, en la hora) abre un modal de creación
rápida con: título, fecha y hora de inicio, fecha y hora de fin,
opción de todo el día, selector de color, recordatorio en minutos
(opciones: no recordar, 10 min antes, 30 min antes, 1 hora antes,
1 día antes), y selector de nota vinculada.

## Vinculación con notas
Cada evento puede tener una nota Markdown vinculada. Desde el
detalle del evento hay un botón "Abrir nota" que abre la nota
en el editor. Si no hay nota vinculada, el botón dice "Crear nota"
y al pulsarlo crea una nueva nota con el título del evento y la
fecha como primer heading, vinculándola al evento. Esto es útil
para guardar apuntes de reuniones, clases, o sesiones de estudio.

## Eventos de estudio
El usuario puede crear eventos de tipo "sesión de estudio"
vinculados a un mazo de flashcards. Estos eventos aparecen con
un icono especial de tarjeta. Al llegar la hora del evento,
la notificación incluye un botón de acción "Estudiar ahora"
que abre directamente la sesión de repaso del mazo vinculado.
