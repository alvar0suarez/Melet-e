# Melete — APK Android con Capacitor

## Qué es esto
Capacitor envuelve la app React en una shell nativa Android.
El resultado es un APK real, sin Chrome visible, sin barra de navegador —
exactamente igual que una app de la Play Store.

La app carga la UI directamente del servidor Melete vía WireGuard,
por lo que no hay que recompilar el APK al actualizar la aplicación.

---

## Requisitos (solo una vez)

1. **Node.js 18+** — ya lo tienes (para compilar la UI)
2. **Android Studio** — gratis: https://developer.android.com/studio
   - Durante la instalación: acepta los SDK components por defecto
3. **Java 17+** — Android Studio lo incluye automáticamente
4. **WireGuard configurado** — ejecuta `python setup_wireguard.py` primero

---

## Pasos para generar el APK

```bash
# 1. Instalar Capacitor en el proyecto UI
cd melete/ui
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Inicializar Capacitor (solo la primera vez)
npx cap init "Melete" "io.melete.app" --web-dir dist

# 3. Compilar la UI (aunque no se use en el APK, Capacitor lo necesita)
npm run build

# 4. Añadir plataforma Android (solo la primera vez)
npx cap add android

# 5. Sincronizar
npx cap sync android

# 6. Abrir en Android Studio
npx cap open android
```

En Android Studio:
- Espera a que termine la indexación (barra inferior)
- **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- El APK aparece en: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Instalar el APK en el móvil

```bash
# Opción A: con cable USB (más rápido)
# Activa "Depuración USB" en Ajustes → Opciones de desarrollador
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Opción B: copia el .apk al móvil y ábrelo
# (necesitas activar "Fuentes desconocidas" en Ajustes → Seguridad)
```

---

## Actualizar la app

Cuando actualices el código de Melete, **no necesitas recompilar el APK**.
La app carga la UI del servidor en tiempo real.

Solo necesitas recompilar el APK si:
- Cambias el `SERVER_URL` en `capacitor.config.ts`
- Actualizas Capacitor a una versión nueva

---

## Cambiar la IP del servidor

Si cambias la IP WireGuard, edita `capacitor.config.ts`:

```typescript
const SERVER_URL = 'http://10.0.0.1:7749'  // ← cambia esto
```

Y repite los pasos de compilación desde el paso 5.

---

## iOS (requiere Mac + Apple Developer)

```bash
npx cap add ios
npx cap open ios   # abre Xcode
```

Apple exige una cuenta de desarrollador ($99/año) para instalar en dispositivos físicos.
La alternativa gratuita para iOS: Safari → Compartir → "Añadir a pantalla de inicio".
