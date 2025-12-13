import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Task } from '../models/task';

export type RemoteTask = Task & { remoteId: string };

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  isEnabled(): boolean {
    return !!environment.apiUrl && environment.apiUrl.trim().length > 0;
  }

  async listTasks(userId: string): Promise<RemoteTask[]> {
    if (!this.isEnabled()) return [];
    const url = `${environment.apiUrl}/tasks?userId=${encodeURIComponent(userId)}`;
    return firstValueFrom(this.http.get<RemoteTask[]>(url));
  }

  async createTask(userId: string, task: Task): Promise<RemoteTask> {
    if (!this.isEnabled()) throw new Error('API no configurada.');
    const url = `${environment.apiUrl}/tasks`;
    return firstValueFrom(this.http.post<RemoteTask>(url, { ...task, userId }));
  }

  async updateTask(userId: string, remoteId: string, task: Task): Promise<RemoteTask> {
    if (!this.isEnabled()) throw new Error('API no configurada.');
    const url = `${environment.apiUrl}/tasks/${encodeURIComponent(remoteId)}`;
    return firstValueFrom(this.http.put<RemoteTask>(url, { ...task, userId, remoteId }));
  }

  async deleteTask(userId: string, remoteId: string): Promise<void> {
    if (!this.isEnabled()) throw new Error('API no configurada.');
    const url = `${environment.apiUrl}/tasks/${encodeURIComponent(remoteId)}?userId=${encodeURIComponent(userId)}`;
    await firstValueFrom(this.http.delete<void>(url));
  }
}
