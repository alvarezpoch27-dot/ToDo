export const environment = {
  production: false,

  // Habilitar logs de depuración (DESACTIVAR en producción)
  debug: false,

  // URL de la API remota (placeholder — configurar en despliegue)
  apiUrl: 'https://api.tasktrack.example.com',

  // Configuración de Firebase: NO dejar claves reales en el repositorio.
  // Reemplazar estos valores mediante variables de entorno/CI antes del build.
  firebase: {
    apiKey: 'REPLACE_WITH_FIREBASE_API_KEY',
    authDomain: 'REPLACE_WITH_FIREBASE_AUTH_DOMAIN',
    projectId: 'REPLACE_WITH_FIREBASE_PROJECT_ID',
    storageBucket: 'REPLACE_WITH_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'REPLACE_WITH_MESSAGING_SENDER_ID',
    appId: 'REPLACE_WITH_APP_ID',
  },
};
