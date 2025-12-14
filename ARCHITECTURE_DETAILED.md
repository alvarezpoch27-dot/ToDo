# Arquitectura TaskTrack Pro - Documentación Técnica

## 🏗️ Capas de la Aplicación

```
┌─────────────────────────────────────────┐
│         PRESENTACIÓN (Pages)            │
│  - Login, Tasks, Task-Detail           │
│  - Componentes reutilizables            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      SERVICIOS DE NEGOCIO (Core)        │
├─────────────────────────────────────────┤
│  Auth  │ Encryption │ API │ Camera │GPS│
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      UTILIDADES Y GUARDIAS              │
├─────────────────────────────────────────┤
│ Guards │ Interceptors │ Utils │ Models  │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  CAPACITOR / PLATAFORMA NATIVA          │
├─────────────────────────────────────────┤
│ Camera │ Geolocation │ Preferences │...  │
└─────────────────────────────────────────┘
```

---

## 📦 Estructura de Módulos

### `/core/models`
Interfaces TypeScript tipadas estrictamente.

```typescript
task.model.ts          // Task, ApiTaskDTO
user.model.ts          // User, AuthSession, StoredUser
api.model.ts          // ApiResponse, GpsLocation, HttpErrorDetails
sync-queue.model.ts   // SyncQueueItem, SyncStatus
```

**Principio**: Ni un `any` permitido.

---

### `/core/services`

#### **AuthService**
Responsabilidad: Gestionar autenticación y sesiones.

**Flujo de autenticación**:
```
Login(email, pwd)
  ├─ Intenta Firebase
  │   ├─ createUserWithEmailAndPassword()
  │   ├─ signInWithEmailAndPassword()
  │   └─ getIdToken() → se almacena en sesión
  │
  └─ Fallback: PBKDF2 local
      ├─ Busca usuario en Preferences
      ├─ Verifica password con PBKDF2
      └─ Crea sesión local
```

**Métodos públicos**:
- `register(email, password)`
- `login(email, password)`
- `logout()`
- `isAuthenticated()`
- `getIdToken()`
- `currentUserId` getter
- `currentEmail` getter

---

#### **EncryptionService**
Responsabilidad: Cifrado/descifrado de datos.

**Algoritmo**: AES-256-GCM
- IV: 12 bytes aleatorio
- Auth Tag: 16 bytes
- Derivación: PBKDF2 (Firebase token o password)

**Métodos**:
- `setKeyFromToken(token)` - inicializa desde Firebase
- `encryptString(plaintext)` - cifra string
- `decryptString(encrypted)` - descifra string
- `encryptObject<T>(obj)` - cifra JSON
- `decryptObject<T>(encrypted)` - descifra JSON
- `clearKey()` - limpia clave

**Almacenamiento**:
```json
{
  "iv": "hex string",
  "ciphertext": "hex string",
  "authTag": "hex string"
}
```

---

#### **ApiService**
Responsabilidad: Comunicación con servidor remoto.

**Endpoints**:
```
GET    /tasks              → Task[]
GET    /tasks/:id          → Task
POST   /tasks              → Task
PUT    /tasks/:id          → Task
DELETE /tasks/:id          → void
```

**Cola de sincronización offline**:
```typescript
interface SyncQueueItem {
  id: string;
  taskId: string;
  operation: 'create' | 'update' | 'delete';
  payload: unknown;
  retryCount: number;
  timestamp: string;
  lastError?: string;
}
```

**Flujo de sync**:
```
1. Operación offline → enqueueSync()
   └─ Persistir en Preferences

2. Conexión restaurada → processSyncQueue()
   └─ Ejecutar con reintentos exponenciales
   └─ Actualizar Preferences

3. Conflictos:
   └─ updatedAt en servidor vs cliente
   └─ Prioridad configurable
```

---

#### **CameraService**
Responsabilidad: Captura y almacenamiento de fotos.

**Métodos**:
- `capturePhoto()` - captura desde cámara
- `selectPhoto()` - selecciona de galería
- `readPhoto(filePath)` - lee archivo
- `deletePhoto(filePath)` - elimina

**Almacenamiento**: Directory.Cache

---

#### **GpsService**
Responsabilidad: Geolocalización.

**Métodos**:
- `getCurrentLocation()` - ubicación actual (promesa)
- `checkPermission()` - verifica permisos
- `requestPermission()` - solicita permisos
- `watchPosition(callback)` - rastreo continuo
- `clearWatch(id)` - detiene rastreo

**Retorna**:
```typescript
{
  latitude: number,
  longitude: number,
  accuracy: number,
  timestamp: string
}
```

---

#### **PermissionsService**
Responsabilidad: Gestión unificada de permisos.

**Flujo**:
```
requestPermission(type: 'camera' | 'geolocation')
  ├─ checkPermission()
  ├─ Si 'granted' → return true
  ├─ Si 'denied' → showPermissionAlert()
  │   └─ Botón "Ir a Ajustes" → openAppSettings()
  │   └─ return false
  └─ Si 'prompt' → Permissions.request()
      └─ Mostrar alert si rechaza
```

---

### `/core/guards`

#### **AuthGuard**
Protege rutas que requieren autenticación.

```typescript
canActivate(route, state) {
  if (await authService.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
}
```

**Rutas protegidas**:
- `/tasks`
- `/task-detail/:id`

---

### `/core/interceptors`

#### **AuthInterceptor**
Intercepta todos los HTTP requests.

**Funciones**:
1. Adjunta token Firebase
   ```
   Authorization: Bearer <firebaseToken>
   ```

2. Captura errores de autenticación
   - 401 Unauthorized → logout automático
   - 403 Forbidden → logout automático

3. Reintentos automáticos (3 intentos)

---

### `/core/utils`

#### **security.util.ts**
Funciones de seguridad y validación.

```typescript
// PBKDF2
pbkdf2Hash(password, salt?, iterations=100_000)
  → { salt, hash, iterations }

verifyPassword(password, hash, salt, iterations)
  → boolean

// Validadores
validateEmail(email) → boolean
validatePassword(password) → boolean  // min 8 chars
validateUrl(url) → boolean

// Utilidades
generateSalt() → string
generateUUID() → string
```

---

#### **encryption.util.ts**
Funciones criptográficas AES-256-GCM.

```typescript
deriveKey(password, salt?)
  → { key: Buffer; salt: string }

encrypt(plaintext, key) → CipherResult
decrypt(cipherResult, key) → string

encryptObject<T>(obj, key) → string
decryptObject<T>(encrypted, key) → T
```

---

#### **logger.util.ts**
Logger controlado por environment.

```typescript
new Logger(prefix: string, debugEnabled: boolean)
  .error(message, error?)
  .warn(message, data?)
  .info(message, data?)
  .debug(message, data?)
```

---

## 🔐 Flujos de Seguridad

### 1. Autenticación
```
Usuario entra credenciales
  │
  ├─ Firebase disponible?
  │   ├─ Sí: createUserWithEmailAndPassword() / signInWithEmailAndPassword()
  │   │   └─ getIdToken() → almacenar
  │   └─ No: continuar a fallback
  │
  └─ PBKDF2 local
      ├─ Generar/validar salt + hash
      ├─ Almacenar en Preferences
      └─ Crear sesión
```

### 2. Cifrado de datos
```
Dato sensible (tarea, GPS, imagen)
  │
  ├─ EncryptionService.getEncryptionKey()
  │   └─ Derivado de Firebase token o password
  │
  └─ AES-256-GCM
      ├─ Generar IV aleatorio
      ├─ Cifrar con clave
      ├─ Generar auth tag
      └─ Almacenar como JSON
```

### 3. API Calls
```
HTTP Request
  │
  ├─ AuthInterceptor
  │   └─ Adjuntar token en header Authorization
  │
  ├─ HttpClient envía
  │   └─ Con reintentos (3x)
  │
  └─ Response
      ├─ ¿401/403?
      │   └─ logout() automático
      └─ ¿Error?
          └─ Cola de sync si offline
```

### 4. Sync offline
```
Operación mientras offline
  │
  └─ enqueueSync(operation, taskId, payload)
      └─ Almacenar en Preferences
          │
          ├─ Conexión restaurada?
          │   └─ processSyncQueue()
          │       ├─ Ejecutar con reintentos
          │       └─ Actualizar estado local
          │
          └─ Error después de 3 reintentos?
              └─ Notificar usuario + guardar para revisión manual
```

---

## 📊 Diagrama de flujo: Login

```
┌─────────────────┐
│  Login Page     │
│  email, pwd     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ AuthService.login()             │
└────────┬────────────────────────┘
         │
    ┌────▼─────┐
    │ Firebase? │
    └────┬──────┘
         │
    ┌────▼────────────────────────────┐
    │ getAuth().signInWithEmailAndPassword()
    └────┬─────────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ getIdToken() → derivar clave AES  │
    └────┬───────────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ await Preferences.set(session)    │
    └────┬───────────────────────────────┘
         │
    ┌────▼──────────────────────────────┐
    │ Router → /tasks                   │
    └───────────────────────────────────┘
```

---

## 🧪 Estrategia de Testing

### Jest (Unitarios)
- AuthService: login, register, logout, validaciones
- EncryptionService: encrypt, decrypt, key management
- ApiService: CRUD, sync queue, reintentos
- SecurityUtils: PBKDF2, validadores
- Mocks: Capacitor, Firebase, HttpClient

### Appium (E2E)
- Login/Register happy path
- CRUD de tareas
- Adjuntar foto (camera)
- Adjuntar GPS
- Sincronizar con servidor
- Manejo de errores

---

## 🚀 Deployment

### Build process
```bash
npm run build:prod
  ├─ AOT compilation
  ├─ Bundle optimization
  ├─ Tree shaking
  └─ Output → www/

npx cap sync
  ├─ Copiar www/ a android/ e ios/
  └─ Actualizar plataformas nativas

# Android
android/gradlew assembleRelease
  → app-release.apk o app-release.aab

# iOS
xcodebuild -workspace ios/App/App.xcworkspace ...
  → App.ipa
```

---

## 📋 Checklist de Seguridad

- ✅ No almacenar contraseñas en plaintext
- ✅ PBKDF2 con >= 100K iteraciones
- ✅ AES-256-GCM para datos sensibles
- ✅ Firebase token en header Authorization
- ✅ No loguear tokens o contraseñas
- ✅ HTTPS solo (TLS/SSL)
- ✅ Logout en 401/403
- ✅ Permisos explícitos (camera, GPS)
- ✅ Cache no accesible desde otras apps
- ✅ Sesión persistente solo en Preferences encriptadas

---

## 🔄 Ciclo de desarrollo recomendado

1. **Feature Branch**
   ```bash
   git checkout -b feature/mi-feature
   ```

2. **Implementar + Tests**
   ```bash
   npm run test:jest -- mi-archivo.spec.ts
   ```

3. **Verificar ESLint**
   ```bash
   npm run lint:fix
   ```

4. **Build local**
   ```bash
   npm run build
   ```

5. **Test en emulador**
   ```bash
   npx cap sync android  # o ios
   ```

6. **Commit y PR**
   ```bash
   git add -A
   git commit -m "feat: descripción"
   ```

---

**Última actualización**: Diciembre 2025
