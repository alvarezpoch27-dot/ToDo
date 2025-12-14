import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Logger } from '../utils/logger.util';
import { environment } from '../../../environments/environment';

/**
 * Servicio de Cámara
 * - Captura de fotos
 * - Manejo de permisos
 * - Guardado en Filesystem
 */
@Injectable({ providedIn: 'root' })
export class CameraService {
  private logger = new Logger('CameraService', environment.debug);

  /**
   * Capturar foto desde cámara
   */
  async capturePhoto(): Promise<string> {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (!image.base64String) {
        throw new Error('No image data received');
      }

      const fileName = `photo_${Date.now()}.jpg`;
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: image.base64String,
        directory: Directory.Cache,
      });

      this.logger.info(`Photo captured: ${savedFile.uri}`);
      return savedFile.uri;
    } catch (error) {
      this.logger.error('Camera capture failed', error);
      throw new Error('Error capturando foto');
    }
  }

  /**
   * Seleccionar foto desde galería
   */
  async selectPhoto(): Promise<string> {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
      });

      if (!image.base64String) {
        throw new Error('No image data received');
      }

      const fileName = `gallery_${Date.now()}.jpg`;
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: image.base64String,
        directory: Directory.Cache,
      });

      this.logger.info(`Photo selected: ${savedFile.uri}`);
      return savedFile.uri;
    } catch (error) {
      this.logger.error('Photo selection failed', error);
      throw new Error('Error seleccionando foto');
    }
  }

  /**
   * Leer foto desde archivo
   */
  async readPhoto(filePath: string): Promise<string> {
    try {
      const file = await Filesystem.readFile({
        path: filePath,
        encoding: Encoding.UTF8,
      });

      return file.data as string;
    } catch (error) {
      this.logger.error(`Error reading photo ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Eliminar foto
   */
  async deletePhoto(filePath: string): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path: filePath,
        directory: Directory.Cache,
      });
      this.logger.debug(`Photo deleted: ${filePath}`);
    } catch (error) {
      this.logger.warn(`Error deleting photo ${filePath}`, error);
    }
  }
}
