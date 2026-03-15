# SPEC_M14 — Android APK con Capacitor (Fold 7)

## Objetivo del milestone
Envolver la app React existente en un APK Android usando Capacitor,
optimizado para el Samsung Galaxy Z Fold 7 (pantalla de cubierta
6.5" y pantalla interior 8.0"). El APK se conecta al servidor
FastAPI desde cualquier lugar via Tailscale.

## Por qué Capacitor y no React Native
Capacitor no requiere reescribir ningún código React. El mismo
frontend del Milestone 1 al 13 se ejecuta dentro de un WebView
nativo de Android. El trabajo de este milestone es de configuración
y adaptación responsive, no de reescritura.

## Instalación y configuración
Desde la carpeta /frontend, instalar @capacitor/core y
@capacitor/android. Ejecutar npx cap init con el nombre "Melete"
y el package id "com.melete.app". Ejecutar npm run build para
generar el build de producción en frontend/dist/. Ejecutar
npx cap add android para crear el proyecto Android en /android/.
Ejecutar npx cap sync para copiar el build y los plugins al
proyecto Android.

El archivo capacitor.config.ts debe configurar: appId
"com.melete.app", appName "Melete", webDir "../frontend/dist",
y server.url vacío para producción (usa los archivos locales)
o apuntando al servidor de desarrollo para testing.

## Conexión remota via Tailscale
La URL del servidor no puede ser localhost cuando la app corre
en Android — localhost en Android apunta al propio teléfono.
La solución es una pantalla de configuración en la app donde
el usuario introduce la URL del servidor (por ejemplo
http://100.64.x.x:7749, la IP de Tailscale del ordenador).

Esta URL se guarda en las preferencias de la app usando
@capacitor/preferences (equivalente a localStorage pero
persistente en Android). Todas las llamadas a la API usan
esta URL base en lugar de localhost. La pantalla de configuración
incluye un botón "Probar conexión" que llama a /api/health y
muestra si la conexión funciona.

La primera vez que el usuario abre la app Android, si no hay
URL configurada, se muestra automáticamente la pantalla de
configuración antes de continuar.

## Adaptación al Fold 7: pantalla de cubierta (6.5", portrait)
La pantalla de cubierta tiene 1080x2520 pixels en ratio 21:9,
muy alta y estrecha. En este modo la app muestra una interfaz
simplificada de una sola columna optimizada para uso con una mano.

La navegación inferior (bottom navigation) tiene 4 pestañas:
Leer (biblioteca de documentos), Notas, Estudiar (flashcards),
y Capturar (Keep + nueva nota rápida). El sidebar de escritorio
no aparece en este modo.

Las listas de notas y documentos usan ítems más grandes con
más espacio táctil (mínimo 48px de altura por ítem). Los botones
de acción son más grandes que en escritorio. El lector de
documentos usa el modo inmersivo descrito en SPEC_M4 y SPEC_M5.

## Adaptación al Fold 7: pantalla interior abierta (8.0", ~cuadrada)
La pantalla interior tiene 1968x2184 pixels en ratio casi
cuadrado (9:10). En este modo la app muestra el layout completo
de dos o tres paneles similar al escritorio.

Detectar el cambio de estado del pliegue usando la Device Posture
API: navigator.devicePosture.addEventListener('change', handler).
Cuando type cambia a "continuous" (desplegado), activar el layout
de múltiples columnas. Cuando cambia a "folded" (plegado), volver
al layout de una columna.

En el layout desplegado: columna izquierda de 280px para el
sidebar de navegación (igual que escritorio), columna central
para el contenido principal, y columna derecha opcional de 320px
para paneles contextuales (highlights, chat IA, backlinks).
Usar CSS media queries: @media (min-width: 840px) para activar
el layout multi-columna.

En el lector de documentos con pantalla desplegada en landscape:
mostrar dos páginas de PDF en paralelo (páginas par e impar),
con el pliegue como separación natural. Para EPUB, dos columnas
de texto. Usar env(viewport-segment-width 0 0) y
env(viewport-segment-width 1 0) para alinear contenido a cada
segmento del pliegue.

## Plugins nativos de Capacitor
Instalar y configurar @capacitor/local-notifications para los
recordatorios del Keep y del Calendario. Los recordatorios creados
en el servidor deben sincronizarse con el sistema de notificaciones
del dispositivo. Cuando la app Android arranca, consulta
GET /api/reminders/pending y programa las notificaciones locales
correspondientes usando el plugin.

Instalar @capacitor/filesystem para acceso a archivos locales.
Esto permite en el futuro implementar una caché offline de los
documentos más leídos (fuera del alcance de este milestone, pero
la infraestructura debe estar lista).

## Generación del APK
Abrir el proyecto /android/ en Android Studio. Seleccionar
Build → Generate Signed Bundle/APK → APK. Crear un keystore
nuevo si no existe. El APK resultante se puede instalar
directamente en el Fold 7 via ADB o transfiriendo el archivo.

El CLAUDE.md debe documentar los pasos exactos para regenerar
el APK cuando se hacen cambios en el frontend: npm run build
en /frontend, luego npx cap sync en /frontend, luego Build APK
en Android Studio.
