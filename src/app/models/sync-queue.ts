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
}

export interface SyncQueue {
  items: SyncQueueItem[];
  lastSyncAt: number;
}
