import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Logger } from '../utils/logger.util';
import { GpsLocation } from '../models';
import { environment } from '../../../environments/environment';

/**
 * Servicio de Geolocalización
 * - Captura de ubicación GPS
 * - Manejo de precisión
 * - Fallback a coordenadas manuales
 */
@Injectable({ providedIn: 'root' })
export class GpsService {
  private logger = new Logger('GpsService', environment.debug);

  /**
   * Obtener ubicación actual
   */
  async getCurrentLocation(): Promise<GpsLocation> {
    try {
      const permission = await this.checkPermission();
      if (!permission) {
        throw new Error('Permiso de ubicación denegado');
      }

      const position: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      });

      const location: GpsLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy || 0,
        timestamp: new Date().toISOString(),
      };

      this.logger.info(
        `Location captured: lat=${location.latitude}, lng=${location.longitude}`
      );
      return location;
    } catch (error) {
      this.logger.error('Error getting location', error);
      throw new Error('Error obteniendo ubicación');
    }
  }

  /**
   * Verificar permisos de ubicación
   */
  async checkPermission(): Promise<boolean> {
    try {
      const permission = await Geolocation.checkPermissions();
      this.logger.debug(`Location permission: ${permission.location}`);
      return permission.location === 'granted';
    } catch (error) {
      this.logger.error('Error checking location permission', error);
      return false;
    }
  }

  /**
   * Solicitar permisos de ubicación
   */
  async requestPermission(): Promise<boolean> {
    try {
      const permission = await Geolocation.requestPermissions();
      this.logger.debug(`Location permission requested: ${permission.location}`);
      return permission.location === 'granted';
    } catch (error) {
      this.logger.error('Error requesting location permission', error);
      return false;
    }
  }

  /**
   * Rastrear ubicación (background)
   */
  async watchPosition(
    callback: (location: GpsLocation) => void,
    onError: (error: Error) => void
  ): Promise<string> {
    try {
      const permission = await this.checkPermission();
      if (!permission) {
        throw new Error('Permission denied');
      }

      const id = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 0,
        },
        (position, err) => {
          if (err) {
            onError(new Error(String(err)));
            return;
          }

          if (position) {
            const location: GpsLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy || 0,
              timestamp: new Date().toISOString(),
            };
            callback(location);
          }
        }
      );

      this.logger.info('Position watch started');
      return id.toString();
    } catch (error) {
      this.logger.error('Error watching position', error);
      throw error;
    }
  }

  /**
   * Detener rastreo de ubicación
   */
  async clearWatch(id: string): Promise<void> {
    try {
      await Geolocation.clearWatch({ id });
      this.logger.debug('Position watch cleared');
    } catch (error) {
      this.logger.warn('Error clearing position watch', error);
    }
  }
}
