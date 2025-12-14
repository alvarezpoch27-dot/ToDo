import { Injectable } from '@angular/core';
// Capacitor permissions API surface varies by version; provide a runtime-compatible wrapper
const Permissions: any = (globalThis as any).Capacitor?.Permissions || (globalThis as any).Permissions || {
  query: async () => ({}),
  request: async () => ({}),
};
import { AlertController } from '@ionic/angular';
import { App } from '@capacitor/app';
import { Logger } from '../utils/logger.util';
import { environment } from '../../../environments/environment';

export type PermissionType = 'camera' | 'geolocation';
export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';

/**
 * Servicio de Permisos unificado
 * - Manejo consistente de permisos
 * - Alertas user-friendly
 * - Opción de "Ir a ajustes"
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private logger = new Logger('PermissionsService', environment.debug);

  constructor(private alertCtrl: AlertController) {}

  /**
   * Verificar permiso
   */
  async checkPermission(type: PermissionType): Promise<PermissionStatus> {
    try {
      switch (type) {
        case 'camera':
          return (await Permissions.query({ name: 'camera' })).camera || 'prompt';
        case 'geolocation':
          return (await Permissions.query({ name: 'geolocation' })).geolocation || 'prompt';
        default:
          return 'prompt';
      }
    } catch (error) {
      this.logger.error(`Error checking permission: ${type}`, error);
      return 'denied';
    }
  }

  /**
   * Solicitar permiso con manejo de flujo completo
   */
  async requestPermission(type: PermissionType): Promise<boolean> {
    try {
      const status = await this.checkPermission(type);

      if (status === 'granted') {
        return true;
      }

      if (status === 'denied' || status === 'prompt-with-rationale') {
        await this.showPermissionAlert(type);
        return false;
      }

      // status === 'prompt'
      const result = await Permissions.request({ name: type as any });
      const granted =
        (result as any)[type as any === 'camera' ? 'camera' : 'geolocation'] === 'granted';

      if (!granted) {
        await this.showPermissionAlert(type);
      }

      return granted;
    } catch (error) {
      this.logger.error(`Error requesting permission: ${type}`, error);
      return false;
    }
  }

  /**
   * Mostrar alerta explicativa
   */
  private async showPermissionAlert(type: PermissionType): Promise<void> {
    let title = '';
    let message = '';

    if (type === 'camera') {
      title = 'Permiso de Cámara';
      message =
        'TaskTrack necesita acceso a la cámara para capturar fotos de tus tareas. Habilita el permiso en ajustes.';
    } else if (type === 'geolocation') {
      title = 'Permiso de Ubicación';
      message =
        'TaskTrack necesita acceso a tu ubicación para asociar tareas a lugares. Habilita el permiso en ajustes.';
    }

    const alert = await this.alertCtrl.create({
      header: title,
      message,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Ir a Ajustes',
              handler: async () => {
                await this.openAppSettings();
              },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Abrir ajustes de la app
   */
  private async openAppSettings(): Promise<void> {
    try {
      // Try common platform-specific settings URLs with fallbacks
      const tryUrls = [
        'app-settings://', // Android common
        'app-settings:',
        'App-Prefs:root', // iOS older
      ];

      let opened = false;
      for (const url of tryUrls) {
        try {
          // App.openUrl may not be available in all Capacitor runtime mocks
          if ((App as any)?.openUrl) {
            // some platforms reject unknown schemes; try-catch per attempt
            // await returns a promise that resolves when the OS handles the URL
            // If it throws, we try the next option.
            // eslint-disable-next-line no-await-in-loop
            await (App as any).openUrl({ url });
            opened = true;
            break;
          }
        } catch (err) {
          this.logger.debug(`openAppSettings: scheme failed ${url}`, err);
          // continue to next
        }
      }

      if (!opened) {
        this.logger.warn('Unable to open app settings via URL schemes; instruct user to open settings manually');
      }
    } catch (error) {
      this.logger.error('Error opening app settings', error);
    }
  }
}
