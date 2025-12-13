# QUICK REFERENCE - TaskTrack Pro

**Mira esto primero** cuando necesites encontrar algo rápidamente.

---

## 🔑 Accesos Rápidos a Código Crítico

### Autenticación
- **Donde loguear/registrarse**: `src/app/services/auth.service.ts` → `login()`, `register()`
- **Obtener token actual**: `auth.getIdToken()` (Firebase o null)
- **Middleware HTTP**: `src/app/interceptors/auth.interceptor.ts`

### Encriptación
- **Encriptar/desencriptar**: `src/app/services/encryption.service.ts`
- **Clave derivada de**: Firebase ID token (SHA-256)
- **Algoritmo**: AES-GCM 256-bit
- **Donde se usa**: TaskService, SyncQueue (Preferences storage)

### Tareas CRUD
- **Crear**: `taskService.addTask(task)` ← **async**
- **Leer**: `taskService.tasks$` (observable)
- **Actualizar**: `taskService.updateTask(id, task)` ← **async**
- **Eliminar**: `taskService.deleteTask(id)` ← **async**

### Sincronización Offline
- **Enqueue fallidos**: Automático en `trySyncCreate/Update/Delete()`
- **Procesar cola**: `taskService.processSyncQueue()` (cada 30s)
- **Reintentos**: Exponential backoff (2^retries, max 5)
- **Ver estado**: `taskService.getSyncStatus()` (observable)

### API
- **Base URL**: `environment.apiUrl`
- **Timeout**: 15 segundos (todos los requests)
- **Headers**: `Authorization: Bearer <idToken>` (automático)
- **DTOs**: `CreateTaskDTO`, `UpdateTaskDTO`, `SyncResponseDTO`

### Permisos
- **Camera**: `permissionsService.requestCameraPermission()`
- **GPS**: `permissionsService.requestLocationPermission()`
- **Ubicación completa**: `locationService.getCurrentPosition()`
- **Foto completa**: `cameraService.takePhoto()`

---

## 🎯 Flujos Comunes

### Crear Tarea (Online)
```typescript
// TaskDetailPage.save()
this.taskService.addTask(task)  // async ✨
  .then(created => {
    // task.syncStatus = 'synced'
    this.router.navigate(['/tasks'])
  })
  .catch(error => {
    // task.syncStatus = 'pending' + enqueued
    this.showError(error)
  })
```

### Sincronizar (Manual)
```typescript
// TasksPage.sync()
this.taskService.processSyncQueue()
  .then(() => {
    const status = this.taskService.getSyncStatus().value
    console.log(`Synced ${status.succeededCount} tasks`)
  })
```

### Ver Estado Sync
```typescript
// TasksPage.ngOnInit()
this.taskService.getSyncStatus().subscribe(status => {
  console.log(`Pendientes: ${status.queueLength}`)
  console.log(`Errores: ${status.lastError}`)
})
```

### Tomar Foto
```typescript
// TaskDetailPage.capturePhoto()
const photo = await this.cameraService.takePhoto()  // async
this.photoUri = photo
// Guarda automáticamente en Filesystem
```

### Obtener GPS
```typescript
// TaskDetailPage.captureLocation()
const location = await this.locationService.getCurrentPosition()  // async
this.latitude = location.latitude
this.accuracy = location.accuracy  // en metros
```

### Importar del Servidor
```typescript
// TasksPage.importFromServer()
this.taskService.importFromServer(userId, (remoteTask) => {
  // Callback: User confirms conflict resolution
  return confirm(`¿Usar versión del servidor?`)
})
```

---

## 📁 Estructura de Directorios

```
src/app/
├── services/              ← Lógica de negocio
│   ├── auth.service.ts    ← Login/Firebase/tokens
│   ├── task.service.ts    ← CRUD + sync + retry
│   ├── api.service.ts     ← HTTP requests
│   ├── encryption.service.ts ← AES-GCM
│   ├── permissions.service.ts ← Camera/GPS perms
│   ├── camera.service.ts  ← Photo capture
│   └── location.service.ts ← GPS coordinates
│
├── interceptors/
│   └── auth.interceptor.ts ← Bearer token injection
│
├── models/                ← DTOs & interfaces
│   ├── task.ts            ← Task + syncStatus
│   └── sync-queue.ts      ← Queue + backoff + SyncStatus
│
├── pages/                 ← UI (Ionic)
│   ├── task-detail/       ← Create/edit form
│   ├── tasks/             ← List + sync bar
│   └── home/              ← Dashboard
│
└── theme/
    └── global.scss        ← Styles (already improved)
```

---

## ⚙️ Configuración Rápida

### Environment Setup
```typescript
// src/environments/environment.ts

export const environment = {
  production: true,
  apiUrl: 'https://your-api.com',  // ← Cambia aquí
  firebase: {
    apiKey: '...',
    authDomain: '...',
    projectId: '...',
    // ... resto del config
  }
}
```

### Habilitar Firebase
1. Set `environment.firebase` config
2. `npm install firebase`
3. AuthService automáticamente lo detecta

### Habilitar API
1. Set `environment.apiUrl`
2. Backend debe validar `Authorization: Bearer <token>` header
3. TaskService automáticamente enqueues si falla

---

## 🧪 Testing

### Ejecutar Tests
```bash
npm run test                   # Watch mode
npm run test -- --watch=false # Single run
npm run test -- --code-coverage  # Coverage report
```

### Tests Actuales (5)
- ✅ AppComponent initializes
- ✅ HomePageComponent has title
- ✅ TaskDetailPageComponent creates
- ✅ TasksPageComponent creates
- ✅ TasksPageComponent handles sync

---

## 🚀 Build & Deploy

### Build Local
```bash
npm run build                    # Development
npm run build -- --configuration production  # Production
```

### Deploy iOS
```bash
npx cap add ios
npx cap sync ios
npx cap open ios
# En Xcode: Product → Run
```

### Deploy Android
```bash
npx cap add android
npx cap sync android
npx cap open android
# En Android Studio: Run
```

---

## 🐛 Debugging

### Ver Logs
```typescript
// En código
console.log('Debug:', variable)
console.error('Error:', error)

// En Chrome DevTools
chrome://inspect/#devices  // Android
Safari → Develop        // iOS
```

### Storage Local
```typescript
// Ver qué hay guardado
const tasks = await Preferences.get({ key: 'tasks_<userId>_v1' })
console.log(JSON.parse(tasks.value))
```

### Estado Actual
```typescript
// En componente (via dependency injection)
this.taskService.tasks$.subscribe(tasks => console.log(tasks))
this.taskService.getSyncStatus().subscribe(status => console.log(status))
```

---

## 📊 Límites & Configuración

| Parámetro | Valor | Donde |
|-----------|-------|-------|
| **API Timeout** | 15s | `api.service.ts` |
| **Max Retries** | 5 | `sync-queue.ts` |
| **Max Backoff** | 32s | `task.service.ts` (2^5) |
| **Sync Interval** | 30s | `app.component.ts` |
| **Title Minlength** | 3 | `task-detail.ts` |
| **Title Maxlength** | 255 | `task-detail.ts` |
| **Description Maxlength** | 2000 | `task-detail.ts` |
| **GPS Precision** | 6 decimales | `location.service.ts` |
| **GPS Accuracy** | 2 decimales | `location.service.ts` |
| **GPS Timeout** | 15s | `location.service.ts` |

**Cambiar límites**: Busca estos valores en los archivos, todos están comentados.

---

## ✅ Checklist Antes de Deploy

- [ ] `environment.apiUrl` configurado (o vacío si offline-only)
- [ ] `environment.firebase` completado (o comentado si no se usa)
- [ ] `npm run build` compila sin errores
- [ ] `npm run test` todos los tests pasan
- [ ] `npm run lint` revisado (29 warnings, no críticos)
- [ ] Permisos en Info.plist (iOS) y AndroidManifest.xml (Android) completados
- [ ] App icons y splash screens configurados
- [ ] Version bump en `capacitor.config.ts`
- [ ] Backend API responde correctamente a `POST /api/tasks`
- [ ] Backend valida header `Authorization: Bearer <token>`
- [ ] Firebase (si se usa) está configurado en Firebase Console

---

## 🆘 Troubleshooting Rápido

### App no compila
```bash
rm -rf node_modules dist
npm install
npm run build
```

### Tests fallan
```bash
npm run test -- --watch=false --browsers=Chrome
# Revisa los logs en terminal
```

### API no funciona
1. Verifica `environment.apiUrl` ✓
2. Backend responde a `GET /api/tasks`? ✓
3. Token válido en `Authorization: Bearer`? ✓
4. HTTPS? (Capacitor requiere) ✓

### Permisos no solicitan
- **Android**: Revisa `AndroidManifest.xml` tiene permisos
- **iOS**: Revisa `Info.plist` tiene NSCameraUsageDescription, etc.

### Fotos no guardan
- Verifica `Filesystem.writeFile()` no falla
- Directory `photos/` accessible? (Capacitor handles)
- Permiso de almacenamiento otorgado?

### Sincronización no funciona
- API enabled? (`environment.apiUrl` no está vacío)
- Queue tiene items? (`taskService.getSyncStatus()`)
- Network accessible? (Abre `environment.apiUrl` en Safari)

---

## 📚 Documentación por Tema

| Tema | Archivo |
|------|---------|
| **Setup Completo** | `README_IMPLEMENTATION.md` |
| **Deploy iOS/Android** | `DEPLOYMENT_GUIDE.md` |
| **Arquitectura Detallada** | `ARCHITECTURE.md` |
| **Cambios Realizados** | `CHANGELOG.md` |
| **Este Documento** | `QUICK_REFERENCE.md` |
| **Resumen Ejecutivo** | `EXECUTIVE_SUMMARY.md` |

---

## 🔗 Enlaces Rápidos

- [Firebase Console](https://console.firebase.google.com) ← Para config
- [Ionic Docs](https://ionicframework.com/docs/) ← Para componentes
- [Angular Docs](https://angular.io/docs) ← Para framework
- [RxJS Docs](https://rxjs.dev/) ← Para observables
- [Capacitor Docs](https://capacitorjs.com/docs) ← Para plugins

---

## 💡 Tips Pro

### Evitar re-renders innecesarios
```typescript
// ✅ Usa `async` pipe en template
<div>{{ taskService.tasks$ | async | json }}</div>

// ❌ Evita subscriptions en componente (memory leak)
this.taskService.tasks$.subscribe(...)  // Remember to unsubscribe!
```

### Hacer debug de Observables
```typescript
// ✅ Usa `tap` para ver valores
this.taskService.tasks$.pipe(
  tap(tasks => console.log('Tasks:', tasks))
).subscribe(...)
```

### Validar forma correctamente
```typescript
// ✅ Revisa dirty/touched antes de mostrar error
<div *ngIf="form.get('title')?.invalid && form.get('title')?.touched">
  Error: {{ form.get('title')?.errors | json }}
</div>
```

---

## 🎓 Conceptos Clave

| Concepto | Explicación | Código |
|----------|-------------|--------|
| **Observable** | Stream de datos | `tasks$: BehaviorSubject` |
| **Backoff** | Esperar más entre reintentos | `2^retries` segundos |
| **DTO** | Contrato API tipado | `CreateTaskDTO` |
| **Interceptor** | Middleware HTTP | Agrega Bearer token |
| **Encryptación** | Cifrar en reposo | AES-GCM 256-bit |
| **Sync Queue** | Cola de fallidos | Persiste en Preferences |

---

**Última actualización**: Diciembre 13, 2025  
**Versión**: 1.0.0-rc1

✅ **Proyecto COMPLETADO y LISTO**
