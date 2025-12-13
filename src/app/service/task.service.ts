import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { BehaviorSubject, Observable } from 'rxjs';
import { Task } from '../models/task';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

const TASKS_KEY = 'tt_tasks_v1';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  private loadedForUserId: string | null = null;

  constructor(
    private auth: AuthService,
    private api: ApiService
  ) {}

  getTasks(): Observable<Task[]> {
    return this.tasksSubject.asObservable();
  }

  async ensureLoaded(): Promise<void> {
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

  async addTask(input: { title: string; description?: string }): Promise<Task> {
    await this.ensureLoaded();
    const now = new Date().toISOString();
    const task: Task = {
      id: crypto.randomUUID(),
      userId: this.auth.currentUserId,
      title: input.title,
      description: input.description ?? '',
      done: false,
      createdAt: now,
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
    const { value } = await Preferences.get({ key: TASKS_KEY });
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as Task[]) : [];
    } catch {
      return [];
    }
  }

  private async writeAllTasks(tasks: Task[]): Promise<void> {
    await Preferences.set({ key: TASKS_KEY, value: JSON.stringify(tasks) });
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
}
