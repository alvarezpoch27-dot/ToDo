export const environment = {
  production: false,
  
  apiUrl: '', // Set to actual backend URL when available (e.g., 'https://api.tasktrack.com')

  // Firebase configuration (optional; leave empty if using local auth)
  firebase: undefined as any, // Configure when using Firebase; see commented example in auth.service.ts
  
  // Example Firebase config (uncomment and fill when ready):
  // firebase: {
  //   apiKey: 'YOUR_API_KEY',
  //   authDomain: 'YOUR_AUTH_DOMAIN',
  //   projectId: 'YOUR_PROJECT_ID',
  //   storageBucket: 'YOUR_STORAGE_BUCKET',
  //   messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  //   appId: 'YOUR_APP_ID',
  // }
};
