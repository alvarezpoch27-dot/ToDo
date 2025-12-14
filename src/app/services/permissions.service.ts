import { Injectable } from '@angular/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Logger } from '../core/utils/logger.util';
import { environment } from '../../environments/environment';



@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private logger = new Logger('PermissionsService', environment.debug);
  // Returns true if permission granted; false if denied
  async requestCameraPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true; // web: no permission needed
    try {
      const perms = await Camera.checkPermissions();
      if (perms.camera === 'granted') return true;
      if (perms.camera === 'denied') {
        this.logger.warn('Camera permanently denied. Open settings?');
        return false;
      }
      // 'prompt' state: request permission
      const result = await Camera.requestPermissions({ permissions: ['camera'] });
      return result.camera === 'granted';
    } catch (e) {
      this.logger.error('Camera permission error', e);
      return false;
    }
  }

  async requestLocationPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true;
    try {
      const perms = await Geolocation.checkPermissions();
      if (perms.location === 'granted') return true;
      if (perms.location === 'denied') return false;
      const result = await Geolocation.requestPermissions();
      return result.location === 'granted';
    } catch (e) {
      this.logger.error('Location permission error', e);
      return false;
    }
  }

  async openAppSettings(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      // Try to open app settings using device browser plugin
      // Note: App.openUrl() in Capacitor only opens external URLs,
      // not app-settings:// URLs. For native settings access,
      // we recommend informing the user to open Settings manually.
      const platform = Capacitor.getPlatform();
      this.logger.info(`To change ${platform} permissions, please open Settings app manually.`);
    } catch (e) {
      this.logger.error('Could not open app settings', e);
    }
  }
}
