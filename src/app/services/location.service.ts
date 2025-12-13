import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { PermissionsService } from './permissions.service';

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  constructor(private permissions: PermissionsService) {}

  async getCurrentPosition(): Promise<{ latitude: number; longitude: number; accuracy?: number } | null> {
    try {
      // Request location permission first
      const hasPermission = await this.permissions.requestLocationPermission();
      if (!hasPermission) {
        console.warn('Location permission denied');
        return null;
      }

      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      });

      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const acc = pos.coords.accuracy ?? undefined;

      return {
        latitude: round6(lat),
        longitude: round6(lon),
        accuracy: acc == null ? undefined : Math.round(acc * 100) / 100,
      };
    } catch (e) {
      console.error('Location error:', e);
      return null;
    }
  }
}
