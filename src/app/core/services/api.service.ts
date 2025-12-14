import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { Preferences } from '@capacitor/preferences';
import { Logger } from '../utils/logger.util';
import { environment } from '../../../environments/environment';
import { ApiResponse, Task, ApiTaskDTO, GpsLocation } from '../models';
import { AuthService } from './auth.service';

const SYNC_QUEUE_KEY = 'tt_sync_queue_v2';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Servicio API
 * - Comunicación con servidor remoto
 * - Cola de sincronización offline
 * - Reintentos exponenciales
 * - Manejo de conflictos
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl: string;
  private logger = new Logger('ApiService', environment.debug);

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {
    this.baseUrl = environment.apiUrl || 'http://localhost:3000/api';
  }

  // =====================
  // OPERACIONES CRUD
  // =====================

  /**
   * Obtener todas las tareas del usuario
   */
  async getTasks(): Promise<Task[]> {
    try {
      const url = `${this.baseUrl}/tasks`;
      const response = await this.http.get<ApiResponse<Task[]>>(url).toPromise();

      if (!response?.success) {
        throw new Error(response?.error || 'Error obteniendo tareas');
      }

      this.logger.info(`Tareas obtenidas: ${response.data?.length || 0}`);
      return response.data || [];
    } catch (error) {
      this.logger.error('Error fetching tasks', error);
      throw error;
    }
  }

  /**
   * Obtener tarea por ID
   */
  async getTask(id: string): Promise<Task | null> {
    try {
      const url = `${this.baseUrl}/tasks/${id}`;
      const response = await this.http.get<ApiResponse<Task>>(url).toPromise();

      if (!response?.success) {
        return null;
      }

      return response.data || null;
    } catch (error) {
      this.logger.error(`Error fetching task ${id}`, error);
      return null;
    }
  }

  /**
   * Crear tarea en servidor
   */
  async createTask(task: Partial<Task>): Promise<Task> {
    try {
      const url = `${this.baseUrl}/tasks`;
      const dto: ApiTaskDTO = {
        id: task.id || '',
        userId: task.userId || '',
        title: task.title || '',
        description: task.description || '',
        done: task.done || false,
        createdAt: task.createdAt || new Date().toISOString(),
        updatedAt: task.updatedAt || new Date().toISOString(),
        photoUrl: task.photoUrl,
        latitude: task.latitude,
        longitude: task.longitude,
        accuracy: task.accuracy,
      };

      const response = await this.http
        .post<ApiResponse<Task>>(url, dto)
        .pipe(
          retry(MAX_RETRIES),
          catchError((error) => this.handleError(error))
        )
        .toPromise();

      if (!response?.success || !response.data) {
        throw new Error(response?.error || 'Error creando tarea');
      }

      this.logger.info(`Tarea creada: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error('Error creating task', error);
      throw error;
    }
  }

  /**
   * Actualizar tarea en servidor
   */
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    try {
      const url = `${this.baseUrl}/tasks/${id}`;
      const response = await this.http
        .put<ApiResponse<Task>>(url, updates)
        .pipe(
          retry(MAX_RETRIES),
          catchError((error) => this.handleError(error))
        )
        .toPromise();

      if (!response?.success || !response.data) {
        throw new Error(response?.error || 'Error actualizando tarea');
      }

      this.logger.info(`Tarea actualizada: ${id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error updating task ${id}`, error);
      throw error;
    }
  }

  /**
   * Eliminar tarea en servidor
   */
  async deleteTask(id: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/tasks/${id}`;
      const response = await this.http
        .delete<ApiResponse>(url)
        .pipe(
          retry(MAX_RETRIES),
          catchError((error) => this.handleError(error))
        )
        .toPromise();

      if (!response?.success) {
        throw new Error(response?.error || 'Error eliminando tarea');
      }

      this.logger.info(`Tarea eliminada: ${id}`);
    } catch (error) {
      this.logger.error(`Error deleting task ${id}`, error);
      throw error;
    }
  }

  // =====================
  // SINCRONIZACIÓN OFFLINE
  // =====================

  /**
   * Encolar operación para sync offline
   */
  async enqueueSync(
    operation: 'create' | 'update' | 'delete',
    taskId: string,
    payload: unknown
  ): Promise<void> {
    try {
      const queue = await this.loadSyncQueue();

      queue.push({
        id: crypto.randomUUID(),
        taskId,
        operation,
        payload,
        retryCount: 0,
        timestamp: new Date().toISOString(),
      });

      await Preferences.set({
        key: SYNC_QUEUE_KEY,
        value: JSON.stringify(queue),
      });

      this.logger.debug(`Operación encolada: ${operation} ${taskId}`);
    } catch (error) {
      this.logger.error('Error enqueuing sync', error);
    }
  }

  /**
   * Procesar cola de sincronización
   */
  async processSyncQueue(): Promise<{ succeeded: number; failed: number }> {
    try {
      const queue = await this.loadSyncQueue();
      if (queue.length === 0) {
        return { succeeded: 0, failed: 0 };
      }

      this.logger.info(`Procesando cola de sync: ${queue.length} operaciones`);

      let succeeded = 0;
      let failed = 0;
      const newQueue: any[] = [];

      for (const item of queue) {
        try {
          await this.executeSyncItem(item);
          succeeded++;
        } catch (error) {
          this.logger.warn(`Error en sync item ${item.id}`, error);
          item.retryCount++;
          item.lastError = String(error);

          // Reintentar hasta MAX_RETRIES
          if (item.retryCount < MAX_RETRIES) {
            newQueue.push(item);
            failed++;
          } else {
            this.logger.error(`Sync item fallido permanentemente: ${item.id}`);
            failed++;
          }
        }
      }

      // Guardar cola actualizada
      if (newQueue.length > 0) {
        await Preferences.set({
          key: SYNC_QUEUE_KEY,
          value: JSON.stringify(newQueue),
        });
      } else {
        await Preferences.remove({ key: SYNC_QUEUE_KEY });
      }

      this.logger.info(`Sync completado: ${succeeded} exitosas, ${failed} fallidas`);
      return { succeeded, failed };
    } catch (error) {
      this.logger.error('Error processing sync queue', error);
      return { succeeded: 0, failed: 0 };
    }
  }

  /**
   * Obtener cola de sincronización actual
   */
  async getSyncQueue(): Promise<any[]> {
    return this.loadSyncQueue();
  }

  // =====================
  // PRIVADOS
  // =====================

  private async loadSyncQueue(): Promise<any[]> {
    try {
      const { value } = await Preferences.get({ key: SYNC_QUEUE_KEY });
      if (!value) return [];
      return JSON.parse(value);
    } catch {
      return [];
    }
  }

  private async executeSyncItem(item: any): Promise<void> {
    switch (item.operation) {
      case 'create':
        await this.createTask(item.payload);
        break;
      case 'update':
        await this.updateTask(item.taskId, item.payload);
        break;
      case 'delete':
        await this.deleteTask(item.taskId);
        break;
      default:
        throw new Error(`Unknown operation: ${item.operation}`);
    }
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'Error HTTP desconocido';

    if (error.error instanceof ErrorEvent) {
      message = `Error: ${error.error.message}`;
    } else {
      message = `Error ${error.status}: ${error.statusText}`;
    }

    this.logger.error(message, error);
    return throwError(() => new Error(message));
  }
}
