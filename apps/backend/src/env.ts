import { z } from 'zod';

const envSchema = z.object({
  HOST: z.string().default('localhost'),
  PORT: z.coerce.number().default(3000),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
  DB_PORT: z.coerce.number().default(5432),
  DB_HOST: z.string().default('localhost'),
  DB_SSL: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  API_URL: z.string().url().default('http://localhost:3000'),
  SHARED_SECRET: z.string().min(1, 'SHARED_SECRET is required'),
  MS_CLIENT_ID: z.string().optional(),
  MS_CLIENT_SECRET: z.string().optional(),
  MS_TENANT_ID: z.string().optional().default('common'),
  MS_REDIRECT_URI: z.string().optional().default('http://localhost:3000/auth/ms/callback'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional().default('http://localhost:3000/auth/google/callback'),
  AZURE_STORAGE_CONNECTION_STRING: z.string().optional().default('UseDevelopmentStorage=true'),
  AZURE_STORAGE_CONTAINER: z.string().optional().default('uploads'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PLAN_GRASSROOTS_PRICE_ID: z.string().optional(),
  STRIPE_PLAN_REPRESENTATIVE_PRICE_ID: z.string().optional(),
  POSTMARK_SERVER_TOKEN: z.string().optional(),
  POSTMARK_FROM_EMAIL: z.string().email().default('pplcrm@campaignraven.com'),
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
  msClientId: parsedEnv.MS_CLIENT_ID,
  msClientSecret: parsedEnv.MS_CLIENT_SECRET,
  msTenantId: parsedEnv.MS_TENANT_ID,
  msRedirectUri: parsedEnv.MS_REDIRECT_URI,
  googleClientId: parsedEnv.GOOGLE_CLIENT_ID,
  googleClientSecret: parsedEnv.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: parsedEnv.GOOGLE_REDIRECT_URI,
  azureStorageConnectionString: parsedEnv.AZURE_STORAGE_CONNECTION_STRING,
  azureStorageContainer: parsedEnv.AZURE_STORAGE_CONTAINER,
  stripeSecretKey: parsedEnv.STRIPE_SECRET_KEY,
  stripeWebhookSecret: parsedEnv.STRIPE_WEBHOOK_SECRET,
  stripePlanGrassrootsPriceId: parsedEnv.STRIPE_PLAN_GRASSROOTS_PRICE_ID,
  stripePlanRepresentativePriceId: parsedEnv.STRIPE_PLAN_REPRESENTATIVE_PRICE_ID,
  postmarkServerToken: parsedEnv.POSTMARK_SERVER_TOKEN,
  postmarkFromEmail: parsedEnv.POSTMARK_FROM_EMAIL,
};

