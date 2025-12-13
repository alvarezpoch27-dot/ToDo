/**
 * DTOs para crear/actualizar tareas
 * Separar entrada/validación de persistencia es buena práctica
 */

export interface TaskCreateDto {
  title: string;
  description?: string;
  photoUrl?: string;
  localPhotoPath?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export interface TaskUpdateDto {
  title?: string;
  description?: string;
  photoUrl?: string;
  localPhotoPath?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  done?: boolean;
}
