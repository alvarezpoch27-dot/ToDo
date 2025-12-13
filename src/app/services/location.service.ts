import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  async getCurrentPosition(): Promise<{ latitude: number; longitude: number; accuracy?: number } | null> {
    try {
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
    } catch {
      // on any error (permission denied, timeout) return null so caller can save task without coords
      return null;
    }
  }
}
