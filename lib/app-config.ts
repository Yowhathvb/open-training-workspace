import 'server-only';

const REQUIRED_ENV_KEYS = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
  'FIREBASE_DATABASE_URL',
] as const;

export function isEnvConfigured(env: NodeJS.ProcessEnv = process.env) {
  return REQUIRED_ENV_KEYS.every((key) => {
    const value = env[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

