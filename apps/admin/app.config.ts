import type { ExpoConfig } from 'expo/config';

export default (): ExpoConfig => {
  const apiBaseUrl=process.env.EXPO_PUBLIC_API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://10.0.2.2:4000' : '');
  if(process.env.NODE_ENV === 'production' && !/^https:\/\//i.test(apiBaseUrl)) throw new Error('EXPO_PUBLIC_API_BASE_URL must be HTTPS in production');
  return ({
  name: 'Pickup Dealer', slug: 'dealer-console', version: '1.0.0', orientation: 'portrait', userInterfaceStyle: 'dark',
  scheme: 'dealer-console', newArchEnabled: true, runtimeVersion: {policy:'appVersion'},
  android: { package: 'com.pickup.admin', versionCode: 1, permissions: ['ACCESS_FINE_LOCATION','ACCESS_COARSE_LOCATION','RECORD_AUDIO','POST_NOTIFICATIONS','READ_SMS'] },
  ios: { bundleIdentifier: 'com.pickup.admin', supportsTablet: true, infoPlist: {
    NSLocationWhenInUseUsageDescription: 'Location is used only for pickup verification and stops after order completion.',
    NSMicrophoneUsageDescription: 'Microphone is used for AI voice and authorised support calls.',
    NSCameraUsageDescription: 'Camera is used to capture or upload requested media.',
  } },
  plugins: [
    'expo-location',
    'expo-image-picker',
    'expo-notifications',
    'expo-dev-client',
    '@config-plugins/react-native-webrtc',
    'expo-secure-store',
    ['expo-audio', { microphonePermission: 'Allow $(PRODUCT_NAME) to use the microphone for AI voice and support calls.' }],
    ['expo-splash-screen', { backgroundColor: '#06100d', image: './assets/splash.png', resizeMode: 'contain', imageWidth: 160 }],
    ...(process.env.EXPO_PUBLIC_FIREBASE_ANDROID_APP_ID ? [] : []),
  ],
  extra: { apiBaseUrl, googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '' },
  });
};
