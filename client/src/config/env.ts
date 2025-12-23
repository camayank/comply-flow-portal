// Environment configuration

export const config = {
  // API Configuration
  apiUrl: import.meta.env.VITE_API_URL || '/api/v1',
  wsUrl: import.meta.env.VITE_WS_URL ||
    `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`,

  // App Configuration
  appName: import.meta.env.VITE_APP_NAME || 'Comply Flow Portal',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  environment: import.meta.env.MODE || 'development',

  // Feature Flags
  features: {
    enableNotifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS !== 'false',
    enableWebSocket: import.meta.env.VITE_ENABLE_WEBSOCKET !== 'false',
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableChat: import.meta.env.VITE_ENABLE_CHAT !== 'false',
  },

  // External Services
  razorpay: {
    keyId: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
  },

  // Google Services
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    mapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  },

  // Sentry (Error Tracking)
  sentry: {
    dsn: import.meta.env.VITE_SENTRY_DSN || '',
    enabled: import.meta.env.VITE_SENTRY_ENABLED === 'true',
  },

  // Analytics
  analytics: {
    googleAnalyticsId: import.meta.env.VITE_GA_ID || '',
  },

  // Development
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',
  isTest: import.meta.env.MODE === 'test',
};

export default config;
