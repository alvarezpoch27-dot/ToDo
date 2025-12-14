# TaskTrack Pro - Documentación Técnica Completa

## 📋 Tabla de Contenidos

1. [Instalación](#instalación)
2. [Configuración](#configuración)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Desarrollo](#desarrollo)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Características de Seguridad](#características-de-seguridad)
8. [Troubleshooting](#troubleshooting)

---

## Instalación

### Requisitos previos

- **Node.js**: v18.0.0 o superior
- **npm**: v9.0.0 o superior
- **Angular CLI**: v20.0.0 o superior
- **Ionic CLI**: v7.0.0 o superior
- **Capacitor CLI**: v8.0.0 o superior

### Pasos de instalación

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/tasktrack-pro.git
cd tasktrack-pro

# 2. Instalar dependencias
npm install

# 3. Instalar dependencias globales (opcional)
npm install -g @angular/cli @ionic/cli @capacitor/cli

# 4. Compilar para web
npm run build

# 5. Sincronizar con Capacitor
npx cap sync
```

---

## Configuración

### Variables de Entorno

Editar `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  debug: true,
  
  // URL de tu API remota
  apiUrl: 'https://api.tasktrack.example.com',
  
  // Configuración Firebase (obligatoria)
  firebase: {
    apiKey: 'AIzaSyDhJ9p7kL-pL5vH8nM3oR0wX2yZ5aB4cD6',
    authDomain: 'tasktrack-pro.firebaseapp.com',
    projectId: 'tasktrack-pro',
    storageBucket: 'tasktrack-pro.appspot.com',
    messagingSenderId: '123456789012',
    appId: '1:123456789012:web:a1b2c3d4e5f6g7h8i',
  },
};
```

### Configurar Firebase

1. Ir a [Firebase Console](https://console.firebase.google.com)
2. Crear proyecto "tasktrack-pro"
3. Habilitar "Authentication" → Email/Password
4. Copiar credenciales a `environment.ts`
5. Configurar reglas de Firestore (si aplica)

### Configurar Capacitor

```bash
# Android
npx cap add android
npx cap open android

# iOS
npx cap add ios
npx cap open ios
```

Editar `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'io.tasktrack.app',
  appName: 'TaskTrack Pro',
  webDir: 'www',
  // ... más configuración
};
```

---

## Estructura del Proyecto

```
src/
├── app/
│   ├── core/                      # 🔐 Servicios y modelos centrales
│   │   ├── models/
│   │   │   ├── task.model.ts
│   │   │   ├── user.model.ts
│   │   │   ├── sync-queue.model.ts
│   │   │   └── api.model.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts    # ✅ Firebase + PBKDF2
│   │   │   ├── encryption.service.ts  # ✅ AES-256-GCM
│   │   │   ├── api.service.ts     # ✅ Sync offline
│   │   │   ├── camera.service.ts
│   │   │   ├── gps.service.ts
│   │   │   └── permissions.service.ts
│   │   ├── guards/
│   │   │   └── auth.guard.ts      # ✅ Protección de rutas
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts    # ✅ Token en headers
│   │   └── utils/
│   │       ├── security.util.ts   # ✅ PBKDF2 + validadores
│   │       ├── encryption.util.ts # ✅ AES-256-GCM
│   │       └── logger.util.ts
│   ├── pages/
│   │   ├── login/
│   │   ├── tasks/
│   │   └── task-detail/
│   ├── app.module.ts
│   └── app-routing.module.ts
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
├── main.ts
└── global.scss

e2e/
├── specs/
│   ├── auth.e2e.ts               # ✅ Tests de login
│   └── tasks.e2e.ts              # ✅ Tests CRUD + permisos

tests/
├── auth.service.spec.ts          # ✅ Unit tests
├── api.service.spec.ts
├── encryption.service.spec.ts
└── security.util.spec.ts

jest.config.js                    # ✅ Jest configuration
appium.json                       # ✅ Appium E2E configuration
capacitor.config.ts              # ✅ Capacitor configuration
```

---

## Desarrollo

### Ejecutar localmente

```bash
# Servidor web (http://localhost:4200)
npm start

# Ver cambios en tiempo real
npm run watch
```

### Ejecutar en emulador Android

```bash
# Terminal 1: Compilar cambios
npm run build

# Terminal 2: Sincronizar y abrir
npx cap sync android
npx cap open android

# En Android Studio: Run → Run 'app'
```

### Ejecutar en emulador iOS

```bash
# Terminal 1: Compilar
npm run build

# Terminal 2: Sincronizar y abrir
npx cap sync ios
npx cap open ios

# En Xcode: Product → Run
```

### Linting

```bash
# Ver errores
npm run lint

# Corregir automáticamente
npm run lint:fix
```

---

## Testing

### Tests Unitarios (Jest)

```bash
# Ejecutar una sola vez
npm run test:jest

# Con cobertura
npm run test:jest -- --coverage

# Watch mode
npm run test:jest:watch

# Test específico
npm run test:jest -- auth.service.spec.ts
```

### Tests E2E (Appium)

```bash
# Iniciar servidor Appium (Terminal 1)
npm run e2e

# En otra terminal (Terminal 2), correr tests
npm run build
npx cap sync android
npx webdriverio appium.json
```

### Cobertura esperada

- **Auth Service**: >90%
- **API Service**: >85%
- **Encryption Service**: >95%
- **Overall**: >70%

---

## Deployment

### Compilar para producción

```bash
# Build optimizado
npm run build:prod

# Sincronizar con Capacitor
npx cap sync

# Android
cd android
./gradlew assembleRelease
# APK estará en: android/app/build/outputs/apk/release/

# iOS
cd ios
xcodebuild -workspace App.xcworkspace -scheme App -configuration Release
```

### Firebase Hosting

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login y deploy
firebase login
firebase deploy
```

### Google Play Store

1. Crear cuenta de desarrollador en [Google Play Console](https://play.google.com/console)
2. Crear app y cargar APK firmado
3. Llenar información de la app
4. Enviar para revisión

---

## Características de Seguridad

### 🔐 Autenticación

- **Firebase Authentication** (principal)
  - Email/Password
  - Sesión persistente
  - Token auto-refresh

- **PBKDF2 Local** (fallback)
  - Salt único por usuario
  - 100,000 iteraciones
  - Derivación segura
  
> Nota: la implementación utiliza Web Crypto (`SubtleCrypto`) cuando está disponible (navegadores y entornos modernos), con un fallback seguro a Node `crypto`. Las contraseñas se derivan con PBKDF2-SHA256 (100k iteraciones) y salida de 64 bytes; las comparaciones usan tiempo-constante para mitigar ataques por canales laterales.

### 🔒 Cifrado

- **AES-256-GCM**
  - Tareas almacenadas
  - Coordenadas GPS
  - Metadatos de imágenes
  - Tokens locales

- **TLS/HTTPS**
  - Todas las comunicaciones
  - Certificate pinning (recomendado)

### 🛡️ Permisos

- **Cámara**: Solicitud explícita + alert
- **Geolocalización**: Solicitud explícita + alert
- **Storage**: Acceso restringido a Cache

### 📝 Logs Seguros

- Controlados por `environment.debug`
- Nunca loguear tokens o contraseñas
- Rotación de logs

---

## Troubleshooting

### "No se abre la cámara"

```bash
# Android: Verificar permisos en AndroidManifest.xml
# iOS: Verificar Info.plist

# Solución:
npx cap sync
npx cap open android  # o ios
# En IDE: agregar permisos manualmente
```

### "Error de CORS en API"

```bash
# Asegurar que el servidor tiene headers CORS
# En API:
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
```

### "Firebase token inválido"

```typescript
// En AuthService, re-autenticar:
await this.logout();
await this.login(email, password);
```

### "Tareas no se sincronizan"

```bash
# Verificar que hay conexión:
navigator.onLine  // en console

# Procesar cola manualmente:
// En TaskService:
await this.api.processSyncQueue();
```

### "Permisos denegados permanentemente"

- Usuario debe ir a Ajustes → Permisos
- O app puede ofrecer link a ajustes via `PermissionsService.openAppSettings()`

---

## Scripts disponibles

```bash
npm start                 # Desarrollar (ng serve)
npm run build            # Build para producción
npm run build:prod       # Build optimizado
npm run watch            # Watch mode
npm run test             # Tests Karma+Jasmine
npm run test:jest        # Tests Jest con cobertura
npm run test:jest:watch  # Jest en modo watch
npm run e2e              # Iniciar Appium
npm run lint             # Verificar código
npm run lint:fix         # Corregir automáticamente
```

---

## Variables de entorno de producción

```bash
NODE_ENV=production
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
API_URL=https://api.tasktrack.com
DEBUG=false
```

---

## Contacto y Soporte

- **Issues**: GitHub Issues
- **Email**: support@tasktrack.com
- **Documentación**: [docs.tasktrack.com](https://docs.tasktrack.com)

---

**Última actualización**: Diciembre 2025
**Versión**: 1.0.0 - Producción
