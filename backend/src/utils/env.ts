import dotenv from 'dotenv';
dotenv.config();

function getEnv(key: string, defaultValue?: string): string {
          const value = process.env[key] || defaultValue
          if (value === undefined) {
          throw new Error(`Environment variable ${key} is not set`);
          }
          return value;
}

export const EMAIL_HOST = getEnv('EMAIL_HOST');
export const EMAIL_PORT = getEnv('EMAIL_PORT', '465');
export const EMAIL_USER = getEnv('EMAIL_USER');
export const EMAIL_PASSWORD = getEnv('EMAIL_PASSWORD',);

