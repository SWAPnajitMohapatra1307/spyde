// client/src/config/env.ts

interface AppConfig {
  apiBaseUrl: string;
  appEnv: 'development' | 'test' | 'production';
  publicVerifyHost: string;
  isProduction: boolean;
}

const getEnv = (key: string, fallback: string = ''): string => {
  return (import.meta.env[key] as string) || fallback;
};

export const config: AppConfig = {
  apiBaseUrl: getEnv('VITE_API_BASE_URL', ''),
  appEnv: (getEnv('VITE_APP_ENV', 'development') as AppConfig['appEnv']),
  publicVerifyHost: getEnv('VITE_PUBLIC_VERIFY_HOST', window.location.origin),
  isProduction: import.meta.env.PROD,
};