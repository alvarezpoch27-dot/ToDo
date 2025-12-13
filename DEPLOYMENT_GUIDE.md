# DEPLOYMENT GUIDE - TaskTrack Pro

## 1. Verificaciones Previas

### 1.1 Build & Tests
```bash
# Limpiar build anterior
rm -r www dist

# Build production
npm run build -- --configuration production

# Tests
npm run test --watch=false

# Lint
npm run lint
```

**Esperado**: ✅ Build OK, 5/5 tests pass, lint warnings (solo `inject()` preference)

---

## 2. Capacitor iOS/Android Setup

### 2.1 Instalar Capacitor CLI
```bash
npm install -g @capacitor/cli
npx cap --version  # v5.x expected
```

### 2.2 Inicializar Plataformas
```bash
# iOS
npx cap add ios

# Android
npx cap add android

# Sync cambios de código
npx cap sync
```

---

## 3. Firebase Setup (Opcional pero Recomendado)

### 3.1 Configuración en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. **Crea nuevo proyecto**:
   - Project name: `tasktrack-pro`
   - Analytics: Deshabilitado (opcional)
   - Region: Tu región (ej: `southamerica-argentina`)

3. **Habilita Authentication**:
   - Sign-in method: `Email/Password`
   - Copia el config JSON

4. **Crea Realtime Database** (opcional para sync):
   - Ubicación: Tu región
   - Reglas de seguridad: 
   ```json
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "$uid === auth.uid",
           ".write": "$uid === auth.uid"
         }
       },
       "tasks": {
         "$uid": {
           ".read": "$uid === auth.uid",
           ".write": "$uid === auth.uid"
         }
       }
     }
   }
   ```

### 3.2 Actualizar environment.ts

```typescript
// src/environments/environment.ts
export const environment = {
  production: true,
  apiUrl: 'https://your-backend-api.com',
  firebase: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'tasktrack-pro-xxxx.firebaseapp.com',
    projectId: 'tasktrack-pro-xxxx',
    storageBucket: 'tasktrack-pro-xxxx.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:xxxxx'
  }
};
```

### 3.3 Instalar Firebase SDK
```bash
npm install firebase
```

---

## 4. Backend API Setup (Opcional pero Recomendado)

### 4.1 Endpoints Esperados

Tu backend debe implementar:

```
POST   /api/tasks              → Create task
GET    /api/tasks              → List tasks
GET    /api/tasks/:id          → Get task
PUT    /api/tasks/:id          → Update task
DELETE /api/tasks/:id          → Delete task
GET    /api/sync               → Get changes since timestamp (optional)
```

### 4.2 Request/Response Format

**Create Request** (POST /api/tasks):
```json
{
  "title": "Task title",
  "description": "Task description",
  "localPhotoPath": "file:///data/user/0/com.example/photos/photo.jpg",
  "latitude": -34.603722,
  "longitude": -58.371643,
  "accuracy": 10.5,
  "done": false
}
```

**Response**:
```json
{
  "id": "uuid-xxx",
  "title": "Task title",
  "description": "Task description",
  "localPhotoPath": "file:///data/user/0/com.example/photos/photo.jpg",
  "latitude": -34.603722,
  "longitude": -58.371643,
  "accuracy": 10.5,
  "done": false,
  "createdAt": 1702470000000,
  "updatedAt": 1702470000000
}
```

### 4.3 Authentication Header

Todos los requests incluyen:
```
Authorization: Bearer <idToken>
```

Valida este token en tu backend antes de procesar.

### 4.4 Timeout & Retry

- **Client timeout**: 15 segundos
- **Retry**: Exponential backoff (2^retries segundos, max 5 reintentos)
- **Error handling**: Enqueue failed ops, reporta vía sync status observable

---

## 5. Build para iOS

### 5.1 Build Web
```bash
npm run build -- --configuration production
npx cap sync ios
```

### 5.2 Open Xcode
```bash
npx cap open ios
```

### 5.3 En Xcode
1. **Selecciona device/simulator**
2. **Signing & Capabilities**:
   - Team: Tu Apple Team
   - Bundle ID: `com.tasktrack.pro` (o tu ID)
3. **Info.plist** — Agrega permisos:
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>Necesitamos acceso a tu cámara para capturar fotos en las tareas</string>
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>Necesitamos tu ubicación para geolocalizar tareas</string>
   <key>NSPhotoLibraryAddUsageDescription</key>
   <string>Necesitamos acceso para guardar fotos</string>
   ```
4. **Build & Run**: ⌘R

---

## 6. Build para Android

### 6.1 Build Web
```bash
npm run build -- --configuration production
npx cap sync android
```

### 6.2 Open Android Studio
```bash
npx cap open android
```

### 6.3 En Android Studio
1. **Selecciona device/emulator**
2. **AndroidManifest.xml** — Agrega permisos:
   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
   <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
   <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
   ```
3. **Build & Run**: Shift+F10

### 6.4 Generar APK/AAB para Play Store
```bash
# En Android Studio: Build → Generate Signed Bundle/APK
# O via Gradle:
cd android
./gradlew bundleRelease
```

---

## 7. Testing en Emulador

### 7.1 iOS Simulator
```bash
npx cap run ios
# En Xcode: Product → Run (⌘R)
```

### 7.2 Android Emulator
```bash
# Crea emulator si no existe
~/Android/Sdk/emulator/emulator -list-avds
~/Android/Sdk/emulator/emulator -avd Pixel_5_API_33 &

# Build & run
npx cap run android
```

### 7.3 Casos de Prueba
1. **Auth**: Login/register con Firebase
2. **Tasks**: Crear tarea con foto y GPS
3. **Sync**: Offline → online → verifica sync status
4. **Permissions**: Rechaza permisos, observa fallback
5. **Import**: Importa desde backend, verifica merge

---

## 8. Debugging

### 8.1 Chrome DevTools (iOS/Android)
```bash
# Android Chrome
chrome://inspect/#devices
# Selecciona device y "Inspect"

# iOS Safari
Safari → Develop → [Device] → [App]
```

### 8.2 Logs en Consola
```typescript
// En código
console.log('Debug:', message);  // Visible en DevTools

// Desde terminal
npx cap open ios    # Usa Console.app después de run
```

### 8.3 Persisted Data
```bash
# Android
adb shell "run-as com.tasktrack.pro cat /data/data/com.tasktrack.pro/shared_prefs/preferences.xml"

# iOS (via Xcode console after run)
```

---

## 9. Troubleshooting

### Build Error: "Cannot find module 'firebase'"
```bash
npm install firebase
npm run build
```

### Auth Interceptor Error
- Verifica que `AuthService` está inyectado en `AppModule`
- Revisa `auth.interceptor.ts` está registrado en providers

### Permisos No Solicita en Android
- Verifica `AndroidManifest.xml` tiene permisos declarados
- Runtime permissions (API 30+) son solicitados por `PermissionsService`

### Sync No Funciona
1. Verifica `environment.apiUrl` está configurado
2. Backend responde con estructura correcta (DTO)
3. Token valida en servidor
4. Network es accesible (`httpClient.get(this.apiUrl)` no falla)

### Fotos No Guardan
- Verifica permisos en Info.plist (iOS) y AndroidManifest.xml (Android)
- `photos/` directory existe en app cache
- `Filesystem.writeFile()` no rechaza

---

## 10. Production Checklist

- [ ] Firebase config completado en `environment.ts`
- [ ] Backend API implementado y deployado
- [ ] HTTPS habilitado en backend (requerido por Capacitor)
- [ ] Token validation en backend
- [ ] Database backup/disaster recovery setup
- [ ] Rate limiting en backend para evitar abuse
- [ ] CORS configurado correctamente
- [ ] App icons/splash screens configurados
- [ ] Privacy policy & terms of service en app
- [ ] TestFlight (iOS) o Beta (Android) testing completado
- [ ] Versión bump en `capacitor.config.ts` (`appVersion`)
- [ ] Build firmada y optimizada

---

## 11. Monitoreo Post-Deploy

### 11.1 Error Tracking (Recomendado: Sentry)
```bash
npm install @sentry/capacitor
# Configura en main.ts
```

### 11.2 Analytics (Recomendado: Firebase Analytics)
```typescript
// En TaskService
import { Analytics, logEvent } from 'firebase/analytics';

logEvent(analytics, 'task_created', {
  userId: this.currentUser.id,
  taskId: task.id
});
```

### 11.3 Performance Monitoring
- Use Chrome DevTools en emulator
- Monitora sync times y error rates
- Log slow API calls (> 5s)

---

## 12. Updates & Maintenance

### 12.1 Código Update
```bash
# Fetch nuevos cambios
git pull origin main

# Rebuild & test
npm install
npm run build
npm run test

# Deploy nuevamente
npx cap sync
npx cap run ios/android
```

### 12.2 Dependency Updates (Mensual)
```bash
# Check outdated
npm outdated

# Update minor/patch
npm update

# Update major (manual)
npm install angular@latest ionic@latest capacitor@latest

# Test & commit
npm run test
git commit -am "Update dependencies"
```

---

**Última actualización**: Diciembre 13, 2025  
**Version**: 1.0.0-rc1
