/**
 * Estructura para la cola de sincronización offline
 * Permite reintentar operaciones que fallaron sin conexión
 */

export type SyncOp = 'create' | 'update' | 'delete';

export interface SyncQueueItem {
  id: string; // UUID para este item en la cola
  taskId: string;
  op: SyncOp;
  payload: any;
  timestamp: number;
  retries: number;
  maxRetries?: number;
  lastError?: string;
  nextRetryAt?: number;
}

export interface SyncQueue {
  items: SyncQueueItem[];
  lastSyncAt: number;
  successCount?: number;
  failCount?: number;
  pendingCount?: number;
}

export interface SyncStatus {
  syncing: boolean;
  queueLength: number;
  succeededCount: number;
  failedCount: number;
  pendingCount: number;
  lastError?: string;
}
