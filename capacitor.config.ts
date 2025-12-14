import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.tasktrack.app',
  appName: 'TaskTrack Pro',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos'],
    },
    Geolocation: {
      permissions: ['location'],
    },
    Permissions: {
      camera: {
        display: 'TaskTrack necesita acceso a la cámara',
      },
      geolocation: {
        display: 'TaskTrack necesita acceso a tu ubicación',
      },
    },
  },
};

export default config;
