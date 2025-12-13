export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  photoUrl?: string;
  localPhotoPath?: string;
  latitude?: number;
  accuracy?: number;
  longitude?: number;
  done: boolean;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
  isSynced?: boolean;
  remoteId?: string;
  order?: number;
}
