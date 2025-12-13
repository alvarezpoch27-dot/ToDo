import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { Task } from '../models/task';

// Strict DTOs for API contracts
export interface CreateTaskDTO {
  title: string;
  description?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  localPhotoPath?: string;
  done?: boolean;
}

export interface UpdateTaskDTO {
  id: string;
  title: string;
  description?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  localPhotoPath?: string;
  done?: boolean;
  updatedAt: string;
}

export interface SyncResponseDTO {
  id: string;
  remoteId: string;
  title: string;
  description?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  done?: boolean;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
}

export type RemoteTask = SyncResponseDTO;

const API_TIMEOUT_MS = 15000;

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  isEnabled(): boolean {
    return !!environment.apiUrl && environment.apiUrl.trim().length > 0;
  }

  async listTasks(userId: string): Promise<SyncResponseDTO[]> {
    if (!this.isEnabled()) return [];
    try {
      const url = `${environment.apiUrl}/tasks?userId=${encodeURIComponent(userId)}`;
      return await firstValueFrom(
        this.http.get<SyncResponseDTO[]>(url).pipe(timeout(API_TIMEOUT_MS))
      );
    } catch (e: any) {
      console.error('listTasks error:', e);
      throw new Error(`Failed to list tasks: ${e?.message ?? 'Unknown error'}`);
    }
  }

  async createTask(userId: string, task: CreateTaskDTO): Promise<SyncResponseDTO> {
    if (!this.isEnabled()) throw new Error('API no configurada.');
    try {
      const url = `${environment.apiUrl}/tasks`;
      const payload = { ...task, userId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      return await firstValueFrom(
        this.http.post<SyncResponseDTO>(url, payload).pipe(timeout(API_TIMEOUT_MS))
      );
    } catch (e: any) {
      console.error('createTask error:', e);
      throw new Error(`Failed to create task: ${e?.message ?? 'Unknown error'}`);
    }
  }

  async updateTask(userId: string, remoteId: string, task: UpdateTaskDTO): Promise<SyncResponseDTO> {
    if (!this.isEnabled()) throw new Error('API no configurada.');
    try {
      const url = `${environment.apiUrl}/tasks/${encodeURIComponent(remoteId)}`;
      const payload = { ...task, userId, remoteId };
      return await firstValueFrom(
        this.http.put<SyncResponseDTO>(url, payload).pipe(timeout(API_TIMEOUT_MS))
      );
    } catch (e: any) {
      console.error('updateTask error:', e);
      throw new Error(`Failed to update task: ${e?.message ?? 'Unknown error'}`);
    }
  }

  async deleteTask(userId: string, remoteId: string): Promise<void> {
    if (!this.isEnabled()) throw new Error('API no configurada.');
    try {
      const url = `${environment.apiUrl}/tasks/${encodeURIComponent(remoteId)}?userId=${encodeURIComponent(userId)}`;
      await firstValueFrom(this.http.delete<void>(url).pipe(timeout(API_TIMEOUT_MS)));
    } catch (e: any) {
      console.error('deleteTask error:', e);
      throw new Error(`Failed to delete task: ${e?.message ?? 'Unknown error'}`);
    }
  }
}
