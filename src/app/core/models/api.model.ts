/**
 * Respuesta genérica de API
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Errores HTTP
 */
export interface HttpErrorDetails {
  status: number;
  statusText: string;
  url: string;
  message: string;
}

/**
 * Ubicación GPS
 */
export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}
