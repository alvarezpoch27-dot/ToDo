/**
 * Task model - Tipado estricto
 */
export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  photoUrl?: string;
  localPhotoPath?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  done: boolean;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
  remoteId?: string;
  syncStatus?: 'pending' | 'synced' | 'failed';
  lastSyncError?: string;
  order?: number;
}

/**
 * DTO para envío a API remota
 */
export interface ApiTaskDTO {
  id: string;
  userId: string;
  title: string;
  description: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}
