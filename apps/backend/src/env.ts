import { config as load } from 'dotenv';
import { join } from 'path';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const envFile = `.env.${nodeEnv}`;
load({ path: join(process.cwd(), envFile) });

export const env = {
  host: process.env.HOST ?? 'localhost',
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  db: {
    user: process.env.DB_USER ?? '',
    database: process.env.DB_NAME ?? '',
    password: process.env.DB_PASSWORD ?? '',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    host: process.env.DB_HOST ?? 'localhost',
    ssl: process.env.DB_SSL === 'true',
  },
  apiUrl: process.env.API_URL ?? 'http://localhost:3000',
  sharedSecret: process.env.SHARED_SECRET ?? '',
};
