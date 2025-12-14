/**
 * Cola de sincronización para operaciones offline
 */
export interface SyncQueueItem {
  id: string;
  taskId: string;
  operation: 'create' | 'update' | 'delete';
  payload: unknown;
  retryCount: number;
  timestamp: string;
  lastError?: string;
}

export interface SyncStatus {
  syncing: boolean;
  queueLength: number;
  succeededCount: number;
  failedCount: number;
  pendingCount: number;
}
