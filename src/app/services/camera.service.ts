import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { PermissionsService } from './permissions.service';

function dataUrlToBase64(dataUrl: string): string {
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : parts[0];
}

@Injectable({ providedIn: 'root' })
export class CameraService {
  constructor(private permissions: PermissionsService) {}

  async takePhoto(): Promise<string | null> {
    try {
      // Request camera permission first
      const hasPermission = await this.permissions.requestCameraPermission();
      if (!hasPermission) {
        console.warn('Camera permission denied');
        return null;
      }

      const photo = await Camera.getPhoto({
        quality: 75,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      const dataUrl = photo.dataUrl;
      if (!dataUrl) return null;

      const base64 = dataUrlToBase64(dataUrl);
      const fileName = `photo_${crypto.randomUUID()}.jpeg`;

      await Filesystem.writeFile({
        path: `photos/${fileName}`,
        data: base64,
        directory: Directory.Data,
      });

      // Construct URI from directory path
      const path = `photos/${fileName}`;
      return path;
    } catch (e) {
      console.error('Camera error:', e);
      return null;
    }
  }
}
