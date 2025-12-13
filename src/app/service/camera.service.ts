import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Injectable({ providedIn: 'root' })
export class CameraService {
  async takePhoto(): Promise<string | null> {
    try {
      const photo = await Camera.getPhoto({
        quality: 75,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      return photo.dataUrl ?? null;
    } catch {
      return null;
    }
  }
}
