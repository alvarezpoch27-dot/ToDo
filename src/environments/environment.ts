export const environment = {
  production: false,

  // Habilitar logs de depuración
  debug: true,

  // URL de la API remota
  apiUrl: 'https://api.tasktrack.example.com',

  // Configuración de Firebase (REQUERIDA para producción)
  // Obtener valores desde: https://console.firebase.google.com
  firebase: {
    apiKey: 'AIzaSyDhJ9p7kL-pL5vH8nM3oR0wX2yZ5aB4cD6',
    authDomain: 'tasktrack-pro.firebaseapp.com',
    projectId: 'tasktrack-pro',
    storageBucket: 'tasktrack-pro.appspot.com',
    messagingSenderId: '123456789012',
    appId: '1:123456789012:web:a1b2c3d4e5f6g7h8i',
  },
};
