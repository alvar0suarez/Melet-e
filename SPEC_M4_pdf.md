# SPEC_M4 — Lector PDF con highlights

## Objetivo del milestone
Permitir subir PDFs al vault, renderizarlos visualmente (no como
texto extraído), y hacer highlights de colores que persistan en
SQLite y sobrevivan al recargar la app.

## Librería
Usar react-pdf-highlighter-extended (sobre pdf.js). NO usar
extracción de texto con PyMuPDF como sustituto del render visual.
El PDF debe verse exactamente como en un lector nativo, con
imágenes, tablas y layout original preservados.

## Subida de archivos
Hay un botón "Subir PDF" en la sección Biblioteca del sidebar.
Al pulsarlo se abre el selector de archivos del sistema. El archivo
se envía via POST /api/documents/upload (multipart/form-data).
El backend lo guarda en vault/Files/{nombre_original}.pdf y crea
un registro en la tabla "documents" de SQLite con: id (UUID),
title (nombre sin extensión), file_path (ruta relativa desde vault),
type ("pdf"), created_at, last_opened, y reading_progress (0.0
a 1.0, porcentaje de avance).

## Renderizado y navegación
El PDF se renderiza página a página con pdf.js. La navegación
funciona con las flechas del teclado (izquierda/derecha) en
escritorio y con gestos de deslizamiento horizontal en móvil.
Existe una barra de navegación con número de página actual / total
y un campo numérico para saltar directamente a una página.

La posición de lectura (número de página) se guarda automáticamente
en SQLite cada vez que el usuario cambia de página, sin ningún
botón de guardar. Al reabrir el documento, se navega directamente
a la última página visitada.

## Sistema de highlights
El usuario selecciona texto y aparece un popup flotante con cuatro
opciones de color. Amarillo es para ideas principales. Verde es
para conceptos que el usuario ya conoce y quiere reforzar. Azul
es para referencias, datos, o citas. Rojo es para cosas que no
entiende o quiere investigar después.

Cada highlight se guarda en SQLite en la tabla "highlights" con:
id (UUID), document_id (FK a documents), page (número de página),
color (texto: "yellow", "green", "blue", "red"), selected_text
(el texto subrayado), note (texto libre opcional, puede estar
vacío), position (JSON con las coordenadas normalizadas
independientes del zoom), y created_at. Las coordenadas
normalizadas son críticas: deben ser relativas al tamaño de la
página, no al viewport, para que el highlight aparezca en el
lugar correcto independientemente del nivel de zoom.

Al reabrir un PDF, todos sus highlights se cargan desde SQLite
y se renderizan visualmente sobre el texto antes de que el usuario
interactúe con nada.

## Popup de highlight
Cuando el usuario hace clic sobre un highlight existente, aparece
un popup con el texto subrayado, el campo de nota (editable
inline), y tres acciones: "Crear flashcard" (abre el modal de
creación de flashcard con el texto pre-rellenado), "Añadir al
vocabulario" (solo disponible si el highlight es de una sola
palabra o expresión corta), y "Eliminar highlight".

## Panel de highlights del documento
Un botón en la barra superior del lector abre un panel lateral
derecho que lista todos los highlights del documento agrupados
por página. Cada ítem muestra el color como indicador visual,
el texto subrayado, y la nota si existe. Hacer clic en un ítem
navega a esa página. Este panel es la vista de repaso sin
necesidad de releer el documento completo.

## Configuración del lector
Un botón de ajustes abre un panel con: nivel de zoom (50% a 200%
en pasos de 10%), modo de visualización (página única o doble
página en escritorio), y tema (normal o invertido para lectura
nocturna). Estos ajustes se guardan por documento.

## Modo inmersivo en móvil (Fold 7)
Al abrir un PDF en móvil, la barra superior y la navegación
inferior se ocultan automáticamente tras 2 segundos sin
interacción. Un tap en el centro de la pantalla las muestra de
nuevo durante 3 segundos. Tap en el tercio izquierdo retrocede
página. Tap en el tercio derecho avanza página. Deslizamiento
desde el borde derecho abre el panel de highlights.

En el Fold 7 con la pantalla interior abierta en landscape.