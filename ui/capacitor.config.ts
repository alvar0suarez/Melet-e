import type { CapacitorConfig } from '@capacitor/cli'

// ─── WireGuard IP del servidor ───────────────────────────────────────────────
// Cuando el móvil se conecta a WireGuard, el PC tiene siempre la IP 10.0.0.1.
// Esta IP nunca cambia (es la dirección de la interfaz WireGuard, no la del router).
const SERVER_URL = 'http://10.0.0.1:7749'

const config: CapacitorConfig = {
  appId: 'io.melete.app',
  appName: 'Melete',
  webDir: 'dist',
  server: {
    // La app carga directamente del servidor.
    // Ventaja: no hay que recompilar el APK al actualizar la UI.
    url: SERVER_URL,
    cleartext: true,   // permite HTTP (WireGuard cifra el tráfico por debajo)
  },
  android: {
    backgroundColor: '#0d1117',
    allowMixedContent: true,
  },
}

export default config
