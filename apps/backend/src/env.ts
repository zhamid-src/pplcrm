import { z } from 'zod';

const envSchema = z.object({
  HOST: z.string().default('localhost'),
  PORT: z.coerce.number().default(3000),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
  DB_PORT: z.coerce.number().default(5432),
  DB_HOST: z.string().default('localhost'),
  DB_SSL: z.string().optional().transform((val) => val === 'true'),
  API_URL: z.string().url().default('http://localhost:3000'),
  SHARED_SECRET: z.string().min(1, 'SHARED_SECRET is required'),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  host: parsedEnv.HOST,
  port: parsedEnv.PORT,
  db: {
    user: parsedEnv.DB_USER,
    database: parsedEnv.DB_NAME,
    password: parsedEnv.DB_PASSWORD,
    port: parsedEnv.DB_PORT,
    host: parsedEnv.DB_HOST,
    ssl: parsedEnv.DB_SSL,
  },
  apiUrl: parsedEnv.API_URL,
  sharedSecret: parsedEnv.SHARED_SECRET,
};
