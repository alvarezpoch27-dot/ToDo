import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { BehaviorSubject, Observable } from 'rxjs';
import { Task } from '../models/task';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { SyncQueue, SyncQueueItem } from '../models/sync-queue';

const TASKS_KEY_PREFIX = 'tasks_';
const LEGACY_TASKS_KEY = 'tt_tasks_v1';
const SYNC_QUEUE_KEY_PREFIX = 'syncQueue_';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  private loadedForUserId: string | null = null;
  private syncingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private auth: AuthService,
    private api: ApiService
  ) {
    this.setupLogoutListener();
    this.setupConnectionListener();
  }


  // listen for logout to clear in-memory cache (avoids circular DI)
  private setupLogoutListener(): void {
    try {
      window.addEventListener('tt:logout', () => {
        this.tasksSubject.next([]);
        this.loadedForUserId = null;
      });
    } catch {
      // ignore in non-browser environments
    }
  }

  private setupConnectionListener(): void {
    // Reintentar cola de sync cuando hay conexión
    try {
      window.addEventListener('online', () => this.syncNow().catch(() => {}));
    } catch {
      // ignore
    }
  }

  getTasks(): Observable<Task[]> {
    return this.tasksSubject.asObservable();
  }

  isSyncing(): Observable<boolean> {
    return this.syncingSubject.asObservable();
  }

  private ensureInit(): void {
    // one-time setup
    if ((this as any)._initDone) return;
    this.setupLogoutListener();
    (this as any)._initDone = true;
  }

  async ensureLoaded(): Promise<void> {
    this.ensureInit();
    const ok = await this.auth.isAuthenticated();
    if (!ok) {
      this.tasksSubject.next([]);
      this.loadedForUserId = null;
      return;
    }

    const userId = this.auth.currentUserId;
    if (this.loadedForUserId === userId && this.tasksSubject.value.length >= 0) return;

    const all = await this.readAllTasks();
    const mine = all.filter((t) => t.userId === userId && !t.deleted);
    this.tasksSubject.next(this.sortTasks(mine));
    this.loadedForUserId = userId;
  }

  getTaskById(id: string): Task | null {
    return this.tasksSubject.value.find((t) => t.id === id) ?? null;
  }

  async addTask(input: Partial<Task> & { title: string }): Promise<Task> {
    await this.ensureLoaded();
    const now = new Date().toISOString();
    const task: Task = {
      id: input.id ?? crypto.randomUUID(),
      userId: this.auth.currentUserId,
      title: input.title,
      description: input.description ?? '',
      photoUrl: input.photoUrl,
      latitude: input.latitude,
      longitude: input.longitude,
      done: input.done ?? false,
      createdAt: input.createdAt ?? now,
      updatedAt: now,
      isSynced: false,
    };

    const all = await this.readAllTasks();
    all.push(task);
    await this.writeAllTasks(all);
    this.tasksSubject.next(this.sortTasks(all.filter((t) => t.userId === task.userId && !t.deleted)));

    await this.trySyncCreate(task);

    return task;
  }

  async updateTask(id: string, patch: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    await this.ensureLoaded();
    const userId = this.auth.currentUserId;

    const all = await this.readAllTasks();
    const idx = all.findIndex((t) => t.id === id && t.userId === userId);
    if (idx === -1) throw new Error('Tarea no encontrada.');

    const updated: Task = {
      ...all[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
      isSynced: false,
    };

    all[idx] = updated;
    await this.writeAllTasks(all);
    this.tasksSubject.next(this.sortTasks(all.filter((t) => t.userId === userId && !t.deleted)));

    await this.trySyncUpdate(updated);
  }

  async deleteTask(id: string): Promise<void> {
    await this.ensureLoaded();
    const userId = this.auth.currentUserId;

    const all = await this.readAllTasks();
    const idx = all.findIndex((t) => t.id === id && t.userId === userId);
    if (idx === -1) return;

    
    const t = all[idx];
    all[idx] = { ...t, deleted: true, updatedAt: new Date().toISOString(), isSynced: false };
    await this.writeAllTasks(all);
    this.tasksSubject.next(this.sortTasks(all.filter((x) => x.userId === userId && !x.deleted)));

    await this.trySyncDelete(all[idx]);
  }

  async toggleDone(id: string): Promise<void> {
    await this.ensureLoaded();
    const task = this.getTaskById(id);
    if (!task) return;
    await this.updateTask(id, { done: !task.done });
  }

 
  async syncFromServer(): Promise<void> {
    await this.ensureLoaded();
    const userId = this.auth.currentUserId;

    
    if (!this.api.isEnabled()) return;

   
    const remoteTasks = await this.api.listTasks(userId);

    const all = await this.readAllTasks();
    const mine = all.filter((t) => t.userId === userId);

    const byRemoteId = new Map<string, Task>();
    for (const t of mine) {
      if (t.remoteId) byRemoteId.set(t.remoteId, t);
    }

    for (const rt of remoteTasks) {
      const local = rt.remoteId ? byRemoteId.get(rt.remoteId) : null;

      if (!local) {
       
        all.push({
          ...rt,
          userId,
          isSynced: true,
          deleted: false,
        });
      } else {
        
        const localTime = Date.parse(local.updatedAt);
        const remoteTime = Date.parse(rt.updatedAt);

        if (remoteTime > localTime) {
          const idx = all.findIndex((x) => x.id === local.id);
          if (idx !== -1) {
            all[idx] = { ...local, ...rt, userId, isSynced: true, deleted: false };
          }
        }
      }
    }

    await this.writeAllTasks(all);
    this.tasksSubject.next(this.sortTasks(all.filter((t) => t.userId === userId && !t.deleted)));
  }

  
  private sortTasks(tasks: Task[]): Task[] {
    // Ordenar solo por el campo 'order' (posición manual del usuario)
    return [...tasks].sort((a, b) => {
      const orderA = a.order ?? Infinity;
      const orderB = b.order ?? Infinity;
      return orderA - orderB;
    });
  }

  private async readAllTasks(): Promise<Task[]> {
    let key = LEGACY_TASKS_KEY;
    try {
      const uid = this.auth.currentUserId;
      if (uid) key = `${TASKS_KEY_PREFIX}${uid}_v1`;
    } catch {
      // fallback to legacy
    }

    const { value } = await Preferences.get({ key });
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as Task[]) : [];
    } catch {
      return [];
    }
  }

  private async writeAllTasks(tasks: Task[]): Promise<void> {
    let key = LEGACY_TASKS_KEY;
    try {
      const uid = this.auth.currentUserId;
      if (uid) key = `${TASKS_KEY_PREFIX}${uid}_v1`;
    } catch {
      // ignore
    }
    await Preferences.set({ key, value: JSON.stringify(tasks) });
  }

  private async trySyncCreate(task: Task): Promise<void> {
    if (!this.api.isEnabled()) return;
    try {
      const remote = await this.api.createTask(task.userId, task);
      await this.markSynced(task.id, remote.remoteId);
    } catch {
      
    }
  }

  private async trySyncUpdate(task: Task): Promise<void> {
    if (!this.api.isEnabled()) return;
    try {
      
      if (!task.remoteId) {
        const remote = await this.api.createTask(task.userId, task);
        await this.markSynced(task.id, remote.remoteId);
        return;
      }
      await this.api.updateTask(task.userId, task.remoteId, task);
      await this.markSynced(task.id, task.remoteId);
    } catch {
      
    }
  }

  private async trySyncDelete(task: Task): Promise<void> {
    if (!this.api.isEnabled()) return;
    try {
      if (task.remoteId) {
        await this.api.deleteTask(task.userId, task.remoteId);
      }
      await this.markSynced(task.id, task.remoteId);
    } catch {
      
    }
  }

  private async markSynced(localId: string, remoteId?: string): Promise<void> {
    const userId = this.auth.currentUserId;
    const all = await this.readAllTasks();
    const idx = all.findIndex((t) => t.id === localId && t.userId === userId);
    if (idx === -1) return;

    all[idx] = {
      ...all[idx],
      remoteId: remoteId ?? all[idx].remoteId,
      isSynced: true,
      updatedAt: new Date().toISOString(),
    };

    await this.writeAllTasks(all);
    this.tasksSubject.next(this.sortTasks(all.filter((t) => t.userId === userId && !t.deleted)));
  }

  async moveTaskUp(id: string): Promise<void> {
    await this.ensureLoaded();
    const userId = this.auth.currentUserId;
    const all = await this.readAllTasks();
    const tasks = all.filter((t) => t.userId === userId && !t.deleted);
    const sorted = this.sortTasks(tasks);

    const currentIdx = sorted.findIndex((t) => t.id === id);
    if (currentIdx <= 0) return;

    // Intercambiar órdenes
    const currentOrder = sorted[currentIdx].order ?? currentIdx;
    const prevOrder = sorted[currentIdx - 1].order ?? (currentIdx - 1);

    all.forEach((t) => {
      if (t.id === id) t.order = prevOrder;
      else if (t.id === sorted[currentIdx - 1].id) t.order = currentOrder;
    });

    await this.writeAllTasks(all);
    this.tasksSubject.next(this.sortTasks(all.filter((t) => t.userId === userId && !t.deleted)));
  }

  async moveTaskDown(id: string): Promise<void> {
    await this.ensureLoaded();
    const userId = this.auth.currentUserId;
    const all = await this.readAllTasks();
    const tasks = all.filter((t) => t.userId === userId && !t.deleted);
    const sorted = this.sortTasks(tasks);

    const currentIdx = sorted.findIndex((t) => t.id === id);
    if (currentIdx < 0 || currentIdx >= sorted.length - 1) return;

    // Intercambiar órdenes
    const currentOrder = sorted[currentIdx].order ?? currentIdx;
    const nextOrder = sorted[currentIdx + 1].order ?? (currentIdx + 1);

    all.forEach((t) => {
      if (t.id === id) t.order = nextOrder;
      else if (t.id === sorted[currentIdx + 1].id) t.order = currentOrder;
    });

    await this.writeAllTasks(all);
    this.tasksSubject.next(this.sortTasks(all.filter((t) => t.userId === userId && !t.deleted)));
  }

  // ===== SINCRONIZACIÓN =====

  async syncNow(): Promise<void> {
    if (this.syncingSubject.value) return;
    this.syncingSubject.next(true);

    try {
      // 1. Procesar cola offline si hay
      await this.processSyncQueue();

      // 2. Traer cambios del servidor
      await this.syncFromServer();
    } catch (e) {
      // silenciar errores de sync
    } finally {
      this.syncingSubject.next(false);
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (!this.api.isEnabled()) return;

    const userId = this.auth.currentUserId;
    const queue = await this.readSyncQueue();
    const succeededIds = new Set<string>();

    for (const item of queue.items) {
      if (succeededIds.has(item.id)) continue;

      try {
        if (item.op === 'create') {
          const remote = await this.api.createTask(userId, item.payload);
          await this.markSynced(item.taskId, remote.remoteId);
          succeededIds.add(item.id);
        } else if (item.op === 'update' && item.payload.remoteId) {
          await this.api.updateTask(userId, item.payload.remoteId, item.payload);
          await this.markSynced(item.taskId, item.payload.remoteId);
          succeededIds.add(item.id);
        } else if (item.op === 'delete' && item.payload.remoteId) {
          await this.api.deleteTask(userId, item.payload.remoteId);
          await this.markSynced(item.taskId, item.payload.remoteId);
          succeededIds.add(item.id);
        }
      } catch (e) {
        // reintentar en próximo sync
      }
    }

    // Guardar queue sin items que se sincronizaron
    const updated: SyncQueue = {
      items: queue.items.filter((i) => !succeededIds.has(i.id)),
      lastSyncAt: Date.now(),
    };
    await this.writeSyncQueue(updated);
  }

  private async addToSyncQueue(taskId: string, op: 'create' | 'update' | 'delete', payload: any): Promise<void> {
    const queue = await this.readSyncQueue();
    queue.items.push({
      id: crypto.randomUUID(),
      taskId,
      op,
      payload,
      timestamp: Date.now(),
      retries: 0,
    });
    await this.writeSyncQueue(queue);
  }

  private async readSyncQueue(): Promise<SyncQueue> {
    try {
      const userId = this.auth.currentUserId;
      const key = `${SYNC_QUEUE_KEY_PREFIX}${userId}_v1`;
      const { value } = await Preferences.get({ key });
      if (!value) return { items: [], lastSyncAt: 0 };
      return JSON.parse(value) as SyncQueue;
    } catch {
      return { items: [], lastSyncAt: 0 };
    }
  }

  private async writeSyncQueue(queue: SyncQueue): Promise<void> {
    try {
      const userId = this.auth.currentUserId;
      const key = `${SYNC_QUEUE_KEY_PREFIX}${userId}_v1`;
      await Preferences.set({ key, value: JSON.stringify(queue) });
    } catch {
      // silenciar
    }
  }

  // ===== FIN SINCRONIZACIÓN =====
}

