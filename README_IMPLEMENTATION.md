# TaskTrack Pro - Complete Implementation

## Overview

TaskTrack Pro es una aplicación Ionic/Angular de gestión de tareas con:
- **Autenticación** local o vía Firebase
- **Persistencia** con cifrado en dispositivo (AES-GCM)
- **Sincronización** offline-first con cola de reintentos y backoff exponencial
- **Cámara & GPS** con manejo robusto de permisos
- **API Integration** con timeouts, errores tipados y autenticación via tokens
- **Validaciones** reactivas en formularios con mensajes de error detallados
- **Tests** unitarios (Karma/Jasmine) y scaffolding para E2E (Appium)

## Stack

- **Angular** 20.3
- **Ionic** 8.x
- **Capacitor** 8.x (Camera, Geolocation, Filesystem, Preferences, App)
- **RxJS** (Observables para sync state)
- **Firebase Auth** (opcional, vía dynamic imports)
- **Web Crypto API** (AES-GCM para cifrado local)
- **Karma + Jasmine** (unit tests)

## Estructura del Proyecto

```
src/app/
├── services/
│   ├── auth.service.ts         # Firebase/local auth, getIdToken()
│   ├── task.service.ts         # Lógica de tareas, sync offline, retry/backoff
│   ├── api.service.ts          # HTTP calls con DTOs, timeout 15s
│   ├── camera.service.ts       # Foto con permisos
│   ├── location.service.ts     # GPS con permisos
│   ├── permissions.service.ts  # Solicitud de permisos
│   ├── encryption.service.ts   # AES-GCM, clave derivada de token
│   └── ...
├── models/
│   ├── task.ts                 # Task interface con syncStatus, lastSyncError
│   ├── sync-queue.ts           # SyncQueue con retry counts, timestamps, SyncStatus
│   └── ...
├── pages/
│   ├── login/                  # Autenticación local o Firebase
│   ├── tasks/                  # Lista de tareas + sync button
│   ├── task-detail/            # Crear/editar con foto, GPS, validaciones
│   └── ...
├── interceptors/
│   └── auth.interceptor.ts     # Agrega Authorization: Bearer <token>
└── ...

www/                            # Build output
environments/
├── environment.ts              # apiUrl, firebase config
└── environment.prod.ts

```

## Setup & Build

### Requisitos

- **Node.js** >= 16
- **npm** >= 8
- **Ionic CLI** (opcional): `npm install -g @ionic/cli`
- **Android Studio** o **Xcode** (para emuladores/dispositivos)

### Instalación

```bash
# Clonar/abrir proyecto
cd "c:\Users\Andres\Downloads\U2.3\Desarrollo de App moviles\EVA3\tasktrack-pro"

# Instalar dependencias
npm install

# Si usas Firebase, instálalo también:
npm install firebase
```

### Build & Run

```bash
# Build para navegador (development)
npm run build

# Ejecutar tests
npm run test -- --watch=false

# Lint (preferencia: usar inject() en lugar de constructor)
npm run lint

# Build para producción
npm run build -- --configuration production
```

## Configuración

### API Backend (Opcional)

En `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'https://api.tubackend.com',  // Configura tu backend
  firebase: undefined  // O configura Firebase aquí
};
```

Si no configuras `apiUrl`, la aplicación trabajará **offline-only** con sincronización manual vía botón.

### Firebase (Opcional)

Si quieres usar Firebase Authentication:

1. Ve a [Firebase Console](https://console.firebase.google.com) y crea un proyecto.
2. Habilita **Email/Password authentication**.
3. Copia tu config en `environment.ts`:

```typescript
firebase: {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  storageBucket: '...',
  messagingSenderId: '...',
  appId: '...',
}
```

4. Instala Firebase SDK:
```bash
npm install firebase
```

La aplicación fallará gracefully si Firebase config no está disponible y usará autenticación local.

## Características Principales

### 1. Autenticación
- **Local**: Email/contraseña almacenados localmente (hash SHA-256).
- **Firebase**: Sign-up / login via Firebase (dinámicamente importado).
- La sesión se encripta con AES-GCM cuando Firebase está disponible.

### 2. Tareas
- Crear, leer, actualizar, eliminar (CRUD).
- Capturar **foto** via cámara → guardada en Filesystem (`photos/`).
- Capturar **ubicación GPS** → lat/lon con precisión redondeada a 6 decimales.
- **Validaciones** reactivas: título requerido, min 3 caracteres, descripción máx 2000 caracteres.
- Indicador visual de **syncStatus**: pending/synced/failed.

### 3. Sincronización Offline

**Cola de reintentos (`SyncQueue`)**:
- Cuando API falla o está offline, la operación se enqueuea.
- **Backoff exponencial**: espera 2^retries segundos antes de reintentar (máx 5 reintentos = 1 hora).
- Al volver a tener conexión (evento `online`), se reintenta automáticamente.
- Botón **"Sincronizar"** en la lista de tareas para forzar sincronización.

**Merge de cambios**:
- Conflictos resueltos prefiriendo timestamp más reciente (`updatedAt`).
- Importación de tareas del servidor vía `importFromServer()` (con confirmación del usuario).

### 4. Permisos

**Cámara**:
- Solicitud automática al tomar foto.
- Si está denegada, se muestra toast y se permite guardar tarea sin foto.

**GPS**:
- Solicitud automática al actualizar ubicación.
- Timeout de 15 segundos; si falla, se guarda tarea sin coordenadas.

### 5. Cifrado Local

Datos almacenados en **Capacitor Preferences** están cifrados con AES-GCM cuando el usuario está autenticado:
- Clave derivada del **ID token** (Firebase) o de un identificador de sesión.
- Datos: tareas, cola de sync, sesión.
- Al logout, la clave se limpia y los datos quedan ilegibles sin la sesión.

### 6. API Integration

**DTOs tipados**:
- `CreateTaskDTO`, `UpdateTaskDTO`, `SyncResponseDTO` — tipos estrictos, sin `any`.

**Timeouts**: 15 segundos para todos los endpoints.

**Interceptor**: Agrega `Authorization: Bearer <idToken>` automáticamente a cada request.

**Validación**: Logging de errores detallados, manejo de timeouts, tipos de respuesta.

## Tareas que Quedan (Opcionales/Avanzadas)

- [ ] **E2E Tests** con Appium (scaffolding presente en la estructura).
- [ ] **Compresión de imágenes** antes de guardar en Filesystem.
- [ ] **Limpieza de fotos huérfanas** cuando se elimina una tarea.
- [ ] **Migración completa a inject()** en lugar de constructor injection (linter warnings).
- [ ] **HTTP Interceptor para errors**: re-intentar automáticamente en 429/5xx.
- [ ] **Auditoría de seguridad**: penetration testing, validación HTTPS pinning.
- [ ] **CI/CD**: GitHub Actions para build, test, lint automático.

## Testing

### Unit Tests

```bash
# Ejecutar tests (headless)
npm run test -- --watch=false

# Ejecutar con watch
npm run test

# Resultado esperado: 5/5 SUCCESS
```

Tests actualizados:
- `app.component.spec.ts`
- `home.page.spec.ts`
- `task-detail.page.spec.ts`
- `tasks.page.spec.ts`

### Lint

```bash
npm run lint
```

⚠️ 29 warnings sobre `inject()` (preferencia de Angular moderno, no es crítico).

## Troubleshooting

### Error: "API no configurada"
- Si ves mensajes de "API no configurada", es porque `environment.apiUrl` está vacío.
- **Solución**: Configura `environment.ts` con tu backend URL o desactiva la sincronización remota.

### Error: "No hay sesión activa"
- Esto ocurre si intentas acceder sin iniciar sesión.
- **Solución**: Verifica que estés autenticado antes de navegar a tareas.

### Fotos no se ven después de capturar
- Las fotos se guardan en `Filesystem` de Capacitor, no en el directorio de assets público.
- Se usan con `Capacitor.convertFileSrc()` para convertir la ruta interna a URL.

### Tests fallan
- Asegúrate de que `ActivatedRoute`, `HttpClientTestingModule` estén en los `providers` del spec.

## Performance

- **Evitar recargas innecesarias**: `ensureLoaded()` cachea tareas por usuario.
- **Control de concurrencia**: `syncNow()` no ejecuta si ya hay sincronización en progreso.
- **Inmutabilidad**: operaciones sobre tareas crean nuevos arrays (spread operator).
- **Lazy loading**: rutas cargan módulos bajo demanda (excepto AuthGuard).

## Security Considerations

1. **Contraseña local**: Hash SHA-256 (débil, solo para demo; usa bcrypt en producción).
2. **Token expiration**: Firebase tokens expiran; la app renueva automáticamente.
3. **HTTPS**: Usa HTTPS en producción. Backend debe validar `Authorization` header.
4. **No almacenar secretos**: IDs privados de usuarios NO se guardan en localstorage plano.
5. **Validación cliente**: Todos los inputs se validan antes de enviar al servidor.

## Licencia

Proyecto académico — U2-3 (Desarrollo de Aplicaciones Móviles).

## Contacto

Para dudas o issues, contacta al docente o abre un issue en el repo del proyecto.

---

**Última actualización**: Diciembre 13, 2025
