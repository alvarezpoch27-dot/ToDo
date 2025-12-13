# ARCHITECTURE & SYNC FLOW - TaskTrack Pro

## 1. Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      MOBILE APP (Ionic)                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │             PRESENTATION LAYER (Pages)              │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ TasksPage              TaskDetailPage                │  │
│  │ ├─ list tasks          ├─ form (title, desc, done)  │  │
│  │ ├─ sync status bar     ├─ photo capture             │  │
│  │ ├─ import button       ├─ GPS location              │  │
│  │ └─ add/edit/delete     ├─ validation messages       │  │
│  │                        └─ error handling             │  │
│  └──────────────────────────────────────────────────────┘  │
│           ↓              ↓              ↓                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         DOMAIN LAYER (Services)                      │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  TaskService (Core Logic)                            │  │
│  │  ├─ addTask()/updateTask()/deleteTask()             │  │
│  │  ├─ trySyncCreate/Update/Delete() (w/ enqueue)      │  │
│  │  ├─ processSyncQueue() (exponential backoff)        │  │
│  │  ├─ importFromServer() (merge logic)                │  │
│  │  ├─ getSyncStatus() (observable state)              │  │
│  │  └─ ensureLoaded() (load from storage)              │  │
│  │                                                       │  │
│  │  AuthService                                         │  │
│  │  ├─ register() / login()                            │  │
│  │  ├─ logout() (clear encryption key)                 │  │
│  │  ├─ getIdToken() (Firebase or null)                 │  │
│  │  └─ session (userId + email)                        │  │
│  │                                                       │  │
│  │  PermissionsService                                  │  │
│  │  ├─ requestCameraPermission()                       │  │
│  │  ├─ requestLocationPermission()                     │  │
│  │  └─ openAppSettings()                               │  │
│  │                                                       │  │
│  │  CameraService + LocationService                     │  │
│  │  ├─ Integrados con PermissionsService                │  │
│  │  └─ Guarda foto/GPS en Filesystem y store            │  │
│  │                                                       │  │
│  │  EncryptionService                                   │  │
│  │  ├─ setKeyFromToken(idToken)                        │  │
│  │  ├─ encryptString(data) → JSON{iv, ciphertext}      │  │
│  │  └─ decryptString(json) → data                      │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│           ↓              ↓              ↓                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      INFRASTRUCTURE LAYER                            │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  HTTP Communication Layer                            │  │
│  │  ├─ ApiService (DTOs, timeout: 15s, validation)     │  │
│  │  └─ AuthInterceptor (adds Bearer token)             │  │
│  │           ↓ (HTTPS)                                  │  │
│  │      Backend API Server                              │  │
│  │                                                       │  │
│  │  Local Storage Layer                                 │  │
│  │  ├─ Capacitor Preferences (encrypted AES-GCM)       │  │
│  │  │   ├─ tasks_<userId>_v1 (encrypted)               │  │
│  │  │   └─ syncQueue_<userId>_v1 (encrypted)           │  │
│  │  └─ Filesystem Plugin (photos/ directory)           │  │
│  │                                                       │  │
│  │  Capacitor Plugins                                   │  │
│  │  ├─ Camera (photo capture)                          │  │
│  │  ├─ Geolocation (GPS)                               │  │
│  │  ├─ Preferences (key-value store)                   │  │
│  │  ├─ Filesystem (photos storage)                     │  │
│  │  └─ App (settings, exit)                            │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         MODELS & CONTRACTS                           │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  Task (local model)                                  │  │
│  │  ├─ id, title, description, done                    │  │
│  │  ├─ localPhotoPath, accuracy                        │  │
│  │  ├─ latitude, longitude                             │  │
│  │  ├─ syncStatus, lastSyncError                       │  │
│  │  └─ createdAt, updatedAt (for conflict resolution)  │  │
│  │                                                       │  │
│  │  SyncQueueItem (offline queue)                       │  │
│  │  ├─ id, operation, taskId, payload                  │  │
│  │  ├─ retries, maxRetries (default: 5)                │  │
│  │  ├─ nextRetryAt (for backoff timing)                │  │
│  │  └─ lastError                                        │  │
│  │                                                       │  │
│  │  DTOs (API contracts)                                │  │
│  │  ├─ CreateTaskDTO { title, description, ... }       │  │
│  │  ├─ UpdateTaskDTO { same fields }                   │  │
│  │  └─ SyncResponseDTO { task: Task }                  │  │
│  │                                                       │  │
│  │  SyncStatus (state observable)                       │  │
│  │  ├─ syncing: boolean                                 │  │
│  │  ├─ queueLength: number                              │  │
│  │  ├─ succeededCount, failedCount, pendingCount        │  │
│  │  └─ lastError?: string                               │  │
│  │                                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Flujo de Sincronización Detallado

### 2.1 Crear Tarea (Con Foto + GPS)

```
User clicks "Create Task"
         ↓
TaskDetailPage.form.submit()
         ↓
save() [async]
         ↓
form.valid? NO → show validation errors, exit
         ↓ YES
taskService.addTask(task) [async]
         ↓
◇─────────────────────────────────────────────────────────┐
│                   TASK SERVICE                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 1. Encrypt fields if encryption key available          │
│    (uses AES-GCM, IV randomized)                       │
│                                                          │
│ 2. Save to Preferences: tasks_<userId>_v1              │
│    { id, title, localPhotoPath, accuracy, ... }        │
│                                                          │
│ 3. Set task.syncStatus = 'pending'                     │
│                                                          │
│ 4. Try sync immediately:                               │
│    trySyncCreate(task)                                  │
│    ├─ POST /api/tasks { ...task }                      │
│    ├─ timeout: 15s                                      │
│    ├─ header: Authorization: Bearer <idToken>          │
│    └─ SUCCESS?                                          │
│        ├─ YES: update task.syncStatus = 'synced'      │
│        │        merge remote response (id, timestamps) │
│        │        return task                             │
│        │                                                │
│        └─ NO: catch error                              │
│           ├─ Enqueue to syncQueue:                     │
│           │  SyncQueueItem {                            │
│           │    operation: 'create',                     │
│           │    taskId: task.id,                         │
│           │    payload: task,                           │
│           │    retries: 0,                              │
│           │    maxRetries: 5,                           │
│           │    nextRetryAt: now + 2^0 = 1s              │
│           │  }                                          │
│           │                                             │
│           ├─ Save to Preferences: syncQueue_<userId>_v1 │
│           │  (also encrypted)                           │
│           │                                             │
│           ├─ Persist task.syncStatus = 'failed'        │
│           │  task.lastSyncError = error message         │
│           │                                             │
│           └─ Emit syncStatus$ observable               │
│              { syncing: false, queueLength: 1, ... }   │
│                                                          │
└─────────────────────────────────────────────────────────┘
         ↓
save() returns task or throws
         ↓
ON SUCCESS:
  showToast('Tarea creada')
  navigateTo('/tasks')
         ↓
ON ERROR:
  showErrorMessage(error)
  stay on form
```

### 2.2 Sincronización en Background

```
Every 30 seconds OR when user clicks "Sync" button
         ↓
processSyncQueue() [async]
         ↓
Get all items from syncQueue_<userId>_v1
         ↓
FOR EACH SyncQueueItem:
         ↓
  Is it ready to retry? (now >= nextRetryAt)?
  ├─ NO: skip, check next
  │
  └─ YES: Attempt operation
     ├─ operation = 'create'?
     │  └─ POST /api/tasks with timeout 15s
     │
     ├─ operation = 'update'?
     │  └─ PUT /api/tasks/:id with timeout 15s
     │
     └─ operation = 'delete'?
        └─ DELETE /api/tasks/:id with timeout 15s
         ↓
  SUCCESS?
  ├─ YES: 
  │  ├─ Remove from syncQueue
  │  ├─ Update task.syncStatus = 'synced'
  │  ├─ Merge response (timestamps, remote id)
  │  ├─ Save to Preferences
  │  └─ totalSucceeded++
  │
  └─ NO (timeout or HTTP error):
     ├─ retries < maxRetries?
     │  ├─ YES:
     │  │  ├─ retries++
     │  │  ├─ nextRetryAt = now + (2^retries) seconds
     │  │  │   Examples:
     │  │  │   retries=0 → wait 1s   (2^0)
     │  │  │   retries=1 → wait 2s   (2^1)
     │  │  │   retries=2 → wait 4s   (2^2)
     │  │  │   retries=3 → wait 8s   (2^3)
     │  │  │   retries=4 → wait 16s  (2^4)
     │  │  │   retries=5 → wait 32s  (2^5) MAX CAP = 1 hour
     │  │  │
     │  │  ├─ lastError = error message
     │  │  ├─ Save back to Preferences
     │  │  └─ totalFailed++
     │  │
     │  └─ NO (maxRetries exceeded):
     │     ├─ Mark as 'failed' (permanent)
     │     ├─ Remove from active queue
     │     ├─ Move to deadletter/failed log
     │     ├─ User can manually retry later
     │     └─ totalFailed++
         ↓
END FOR EACH
         ↓
Emit syncStatus$ observable:
{
  syncing: false,
  queueLength: remaining items,
  succeededCount: totalSucceeded,
  failedCount: totalFailed,
  pendingCount: queueLength,
  lastError: last error message or null
}
         ↓
Update tasks$ in TasksPage
  ├─ Show green checkmark on synced tasks
  ├─ Show red X on failed tasks
  └─ Show loading spinner on pending tasks
```

### 2.3 Importar Tareas del Servidor

```
User clicks "Importar Tareas" button
         ↓
TasksPage.importFromServer()
         ↓
showAlert('¿Importar tareas del servidor?')
  ├─ [Cancelar]  [OK]
  │
  └─ User clicks OK
     ↓
taskService.importFromServer(userId, (tasksFromServer) => {
  // Callback for user confirmation of conflicts
  return true; // confirm merge
})
         ↓
◇─────────────────────────────────────────────────────────┐
│                   TASK SERVICE                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 1. GET /api/sync?userId=<userId>                       │
│    Returns: { tasks: Task[] }                           │
│    timeout: 15s                                         │
│    header: Authorization: Bearer <idToken>             │
│                                                          │
│ 2. Merge local + remote:                               │
│    ├─ For each remote task:                            │
│    │  ├─ Local version exists?                         │
│    │  │  ├─ YES:                                       │
│    │  │  │  ├─ Compare updatedAt timestamps           │
│    │  │  │  ├─ Remote is newer? → Use remote          │
│    │  │  │  ├─ Local is newer? → Keep local           │
│    │  │  │  └─ Same version? → Skip                    │
│    │  │  │                                              │
│    │  │  └─ NO: Import remote task                    │
│    │  │                                                 │
│    │  └─ Call confirmation callback:                  │
│    │     callback(remoteTask) → user confirms?       │
│    │       ├─ YES: Merge                             │
│    │       └─ NO: Skip                                │
│    │                                                   │
│    └─ Save merged tasks to Preferences                │
│       tasks_<userId>_v1 (encrypted)                    │
│                                                         │
│ 3. Update tasks$ observable                           │
│                                                         │
│ 4. Return merged count to UI                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
         ↓
showToast(`Importadas ${count} tareas`)
         ↓
TasksPage updates view with new tasks
```

### 2.4 Conflicto de Datos (Timestamp Resolution)

```
Scenario: User edits task offline, server has newer version

Local State:
{
  id: 'task-123',
  title: 'Old Title',
  updatedAt: 1702470000000,  ← Local edit time
  syncStatus: 'pending'
}

Remote State (from server):
{
  id: 'task-123',
  title: 'Newer Title',
  updatedAt: 1702470030000,  ← Server edit time (30s later)
  syncStatus: 'synced'
}

Resolution Logic:
  if (remote.updatedAt > local.updatedAt)
    USE REMOTE  ✓ Newer always wins
  else if (remote.updatedAt === local.updatedAt)
    KEEP LOCAL  ✓ Avoid back-and-forth
  else
    KEEP LOCAL  ✓ Local is newer

Result:
{
  id: 'task-123',
  title: 'Newer Title',    ← Remote value
  updatedAt: 1702470030000,
  syncStatus: 'synced'
}
```

---

## 3. Flujo de Encriptación

### 3.1 Login → Clave de Encriptación

```
User enters email/password
         ↓
AuthService.login(email, password)
         ↓
Validate local (SHA-256 hash match) OR
Call Firebase Auth if config provided
         ↓ SUCCESS
Set this.currentUser = { id, email }
         ↓
EncryptionService.setKeyFromToken(idToken)
         ↓
◇─────────────────────────────────────────────────────────┐
│              ENCRYPTION SERVICE                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 1. Receive idToken (JWT from Firebase or UUID)         │
│                                                          │
│ 2. Derive encryption key:                              │
│    SHA-256(idToken) → 32-byte key                      │
│                                                          │
│ 3. Store key in memory:                                │
│    this.encryptionKey = key                            │
│    (lost on app close, regain on login)                │
│                                                          │
│ 4. Key ready for encryption/decryption                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
         ↓
Store session in Preferences (encrypted if key available)
         ↓
Show home page with tasks list
```

### 3.2 Encriptar Dato

```
taskService.addTask(task)
         ↓
Detect encryption available?
  ├─ NO key: save plaintext (offline mode, graceful)
  │
  └─ Key available:
     ↓
     const plaintext = JSON.stringify(task)
     ↓
     encryptionService.encryptString(plaintext)
     ↓
     ◇──────────────────────────────────────────┐
     │  ENCRYPTION SERVICE                      │
     ├──────────────────────────────────────────┤
     │                                           │
     │ 1. Generate random IV (16 bytes)         │
     │    iv = crypto.getRandomValues(...)      │
     │                                           │
     │ 2. Encrypt with AES-GCM:                 │
     │    cipher = await crypto.subtle.encrypt( │
     │      {name: 'AES-GCM', iv: iv},          │
     │      key,                                │
     │      Uint8Array.from(plaintext)          │
     │    )                                      │
     │                                           │
     │ 3. Encode to base64:                     │
     │    cipher_b64 = btoa(String.fromCharCode │
     │      ...new Uint8Array(cipher)           │
     │    )                                      │
     │    iv_b64 = btoa(String.fromCharCode(... │
     │                                           │
     │ 4. Return JSON:                          │
     │    {                                      │
     │      iv: iv_b64,                         │
     │      ciphertext: cipher_b64              │
     │    }                                      │
     │                                           │
     └──────────────────────────────────────────┘
     ↓
     Result: { iv: "...", ciphertext: "..." }
     ↓
     Save to Preferences: tasks_<userId>_v1
     (stored as JSON string)
```

### 3.3 Desencriptar Dato

```
taskService.loadTasks()
         ↓
Get from Preferences: tasks_<userId>_v1
         ↓
Is encrypted (has .iv field)?
  ├─ NO: return plaintext JSON
  │
  └─ YES: decrypt
     ↓
     encryptionService.decryptString(encryptedJson)
     ↓
     ◇──────────────────────────────────────────┐
     │  ENCRYPTION SERVICE                      │
     ├──────────────────────────────────────────┤
     │                                           │
     │ 1. Extract iv and ciphertext from JSON:  │
     │    { iv: "...", ciphertext: "..." }      │
     │                                           │
     │ 2. Decode from base64:                   │
     │    cipher = atob(...ciphertext)          │
     │    iv_bytes = new Uint8Array(           │
     │      cipher.charCodeAt(...)              │
     │    )                                      │
     │                                           │
     │ 3. Decrypt with AES-GCM:                 │
     │    plaintext = await crypto.subtle.     │
     │      decrypt(                            │
     │        {name: 'AES-GCM', iv: iv_bytes},  │
     │        key,                              │
     │        cipher_bytes                      │
     │      )                                    │
     │                                           │
     │ 4. Convert to string:                    │
     │    result = String.fromCharCode(        │
     │      ...new Uint8Array(plaintext)        │
     │    )                                      │
     │                                           │
     │ 5. Parse JSON:                           │
     │    task = JSON.parse(result)             │
     │                                           │
     └──────────────────────────────────────────┘
     ↓
     Return plaintext task object
```

### 3.4 Logout → Limpiar Clave

```
User clicks "Salir"
         ↓
AuthService.logout()
         ↓
Clear currentUser
         ↓
EncryptionService.clearKey()
         ↓
◇──────────────────────────────────────────┐
│  ENCRYPTION SERVICE                      │
├──────────────────────────────────────────┤
│                                          │
│ this.encryptionKey = null                │
│ (Key removed from memory)                │
│                                          │
│ Note: Encrypted data still in storage,   │
│ but unreadable without key.              │
│                                          │
│ On next login: key re-derived from token │
│                                          │
└──────────────────────────────────────────┘
         ↓
Delete session from Preferences
         ↓
Navigate to login page
```

---

## 4. Flujo de Permisos

### 4.1 Capturar Foto

```
User clicks "Tomar Foto"
         ↓
CameraService.takePhoto()
         ↓
permissionsService.requestCameraPermission()
         ↓
◇──────────────────────────────────────────┐
│  PERMISSIONS SERVICE                     │
├──────────────────────────────────────────┤
│                                          │
│ 1. Check current permission:             │
│    Camera.checkPermissions()              │
│    ├─ granted? → return true             │
│    │                                      │
│    └─ not granted/prompt/denied?         │
│       ↓                                   │
│ 2. Request permission:                   │
│    Camera.requestPermissions()            │
│    ├─ User grants? → return true        │
│    │                                      │
│    └─ User denies? → return false       │
│       └─ showToast(                      │
│           'Permiso denegado. Ve a       │
│            Configuración > Cámara'       │
│         )                                │
│                                          │
└──────────────────────────────────────────┘
         ↓
Result: true or false
         ↓
if (permission granted):
  ├─ Camera.getPhoto()
  ├─ Save to Filesystem ('photos/' dir)
  └─ Return photo URI
else:
  ├─ showToast('Permiso requerido')
  └─ Return null
```

### 4.2 Obtener Ubicación GPS

```
User clicks "Actualizar Ubicación"
         ↓
LocationService.getCurrentPosition()
         ↓
permissionsService.requestLocationPermission()
         ↓
Result: true or false
         ↓
if (permission granted):
  ├─ Geolocation.getCurrentPosition({
  │   enableHighAccuracy: true,
  │   timeout: 15000,
  │   maximumAge: 0
  │ })
  │
  ├─ Parse response:
  │  ├─ latitude (round to 6 decimals)
  │  ├─ longitude (round to 6 decimals)
  │  └─ accuracy (round to 2 decimals in meters)
  │
  └─ Return { latitude, longitude, accuracy }
else:
  ├─ showToast('Permiso requerido')
  └─ Return null
```

---

## 5. Flujo de Validación de Formulario

```
User types in TaskDetailPage form
         ↓
FormGroup (Reactive Forms)
  ├─ title: ['', [required, minlength(3), maxlength(255)]]
  └─ description: ['', [maxlength(2000)]]
         ↓
On every keystroke:
  ├─ Validate form.get('title')
  │  ├─ Is empty? Show "Campo requerido"
  │  ├─ < 3 chars? Show "Mínimo 3 caracteres"
  │  ├─ > 255 chars? Show "Máximo 255 caracteres"
  │  └─ Valid? Clear error message
  │
  └─ Validate form.get('description')
     ├─ > 2000 chars? Show error
     └─ Valid? Clear error
         ↓
form.valid? 
  ├─ NO: Disable save button
  │
  └─ YES: Enable save button
         ↓
User clicks save
         ↓
form.valid?
  ├─ NO: Show all errors, exit
  │
  └─ YES: Trim inputs, call taskService.addTask()
```

---

## 6. Observables & State Management

```
TaskService (BehaviorSubjects)

tasks$ ─────────────────────────────────────┐
  │ tasks[]                                  │
  │ updated on: add/update/delete/sync       │
  │ subscribed by: TasksPage, TaskDetailPage │
  │                                           │
  ├─ {                                       │
  │   id: 'task-1',                         │
  │   title: '...',                         │
  │   syncStatus: 'pending' | 'synced'      │
  │   ...                                    │
  │ }[]                                     │
  │                                          │
syncing$ ───────────────────────────────────┤
  │ boolean                                  │
  │ true while processSyncQueue() running    │
  │                                          │
syncStatus$ ─────────────────────────────────┤
  │ {                                        │
  │   syncing: boolean,                      │
  │   queueLength: number,                   │
  │   succeededCount: number,                │
  │   failedCount: number,                   │
  │   pendingCount: number,                  │
  │   lastError?: string                     │
  │ }                                        │
  │ subscribed by: TasksPage (render status) │
```

---

## 7. Data Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    USER INTERACTION                      │
└──────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────┐
│                    PAGES (UI Layer)                      │
│     TasksPage            TaskDetailPage                  │
│  ├─ tasks$               ├─ form.valueChanges()          │
│  ├─ syncStatus$          ├─ save() → service.addTask()   │
│  └─ importFromServer()   └─ cancel()                     │
└──────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────┐
│                 DOMAIN SERVICES                          │
│                  (Business Logic)                        │
│                                                          │
│  TaskService                  AuthService               │
│  ├─ tasks$ (BehaviorSubject)  ├─ login/register         │
│  ├─ syncing$ (BehaviorSubject)├─ logout                 │
│  ├─ syncStatus$ (Observable)  └─ getIdToken()           │
│  ├─ addTask()                                            │
│  ├─ updateTask()              PermissionsService        │
│  ├─ deleteTask()              ├─ requestCameraPerms     │
│  ├─ trySyncCreate/Update/Del  └─ requestLocationPerms   │
│  ├─ processSyncQueue()                                   │
│  ├─ importFromServer()        EncryptionService         │
│  └─ getSyncStatus()           ├─ setKeyFromToken()      │
│                              ├─ encryptString()         │
│  ApiService                  └─ decryptString()         │
│  ├─ createTask()                                        │
│  ├─ updateTask()             CameraService             │
│  ├─ deleteTask()             ├─ takePhoto()            │
│  └─ getSync()                └─ [integrates PermSvc]    │
│                                                          │
│  ────────────────────────────────────────────────────  │
│  HTTP Interceptor (AuthInterceptor)                     │
│  ├─ Injects Bearer token on all requests                │
│  └─ From AuthService.getIdToken()                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────┐
│           INFRASTRUCTURE LAYER                           │
│                                                          │
│  Capacitor Preferences    Filesystem       Capacitor    │
│  ├─ tasks_<userId>_v1    ├─ photos/      ├─ Camera      │
│  ├─ syncQueue_<userId>   └─ [photo URIs] ├─ Geolocation │
│  └─ [encrypted]                          └─ App         │
│                                                          │
│  HttpClient + timeout(15s)                              │
│  └─ POST/PUT/DELETE/GET /api/tasks                      │
│                                                          │
└──────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────┐
│            BACKEND API (Remote)                          │
│  ├─ Validates Authorization: Bearer <token>             │
│  ├─ CRUD operations with database                       │
│  └─ Returns Task[] with timestamps                      │
└──────────────────────────────────────────────────────────┘
```

---

## 8. Estado de Sincronización Visual

```
ONLINE SCENARIO:
  Create Task → trySyncCreate() → POST /api/tasks → SUCCESS
                └──→ task.syncStatus = 'synced' ✅
                └──→ tasks$ emits → UI shows green checkmark

OFFLINE SCENARIO:
  Create Task → trySyncCreate() → POST /api/tasks → TIMEOUT
                ├──→ task.syncStatus = 'pending' ⏳
                ├──→ Enqueue to syncQueue
                └──→ syncStatus$ emits { queueLength: 1, ... }
                     └──→ UI shows pending badge

BACKGROUND SYNC (30s interval):
  processSyncQueue()
  └──→ Item ready to retry?
       ├─ NO: skip
       │
       └─ YES: POST /api/tasks
          ├─ SUCCESS: Remove from queue, syncStatus = 'synced' ✅
          │           syncStatus$ emits { queueLength: 0 }
          │           UI removes badge
          │
          └─ FAIL: retries++, nextRetryAt = now + 2^retries
             └──→ syncStatus$ emits { lastError: "..." }
                  └──→ UI shows error message, red X badge
```

---

**Última actualización**: Diciembre 13, 2025  
**Versión**: 1.0.0-rc1
