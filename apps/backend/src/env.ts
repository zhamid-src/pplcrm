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
  APP_URL: z.string().url().default('http://localhost:4200'),
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
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_WEBHOOK_VERIFICATION_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  WEBAUTHN_RP_ID: z.string().optional().default('localhost'),
  WEBAUTHN_RP_NAME: z.string().optional().default('PeopleCRM'),
  // Base domain that tenant subdomains hang off of (`<slug>.<baseDomain>`). Public form pages resolve
  // the tenant from the Host header against this. Dev default is 'localhost' so `<slug>.localhost` works.
  PUBLIC_FORMS_BASE_DOMAIN: z.string().optional().default('localhost'),
  // Controls how Fastify derives `req.ip` from the X-Forwarded-For chain. Never trust the raw header
  // for security decisions (rate limiting) — a client can spoof it. Set this to your real topology:
  //   'false' (default) — trust nothing; `req.ip` is the socket address (correct for local/dev).
  //   '<n>'             — trust n proxy hops closest to the server (e.g. '1' behind a single LB).
  //   '<ip,cidr,…>'     — trust these proxy addresses/subnets.
  TRUST_PROXY: z.string().optional().default('false'),
  // How many background jobs the worker may process concurrently. One slow job (a large sync or
  // import) must not block latency-sensitive mail behind it, so we run a small bounded pool of
  // claimers (each uses `SELECT … FOR UPDATE SKIP LOCKED`, so concurrent claiming is safe). Keep
  // this comfortably below the Postgres pool size. Default 4.
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(64).default(4),
  // Max connections in the shared pg pool. The API server, the job worker (up to
  // WORKER_CONCURRENCY concurrent claimers), the webhook worker, and LISTEN/NOTIFY
  // listeners all draw from this pool, so keep it comfortably above WORKER_CONCURRENCY
  // and well under Postgres max_connections. Default 20 (pg's own default is 10).
  DB_POOL_MAX: z.coerce.number().int().min(1).max(200).default(20),
  // Money-touching mock paths (unsigned donation-webhook parsing, mock donation writer) require an
  // EXPLICIT opt-in, never merely "NODE_ENV !== production" — an unset NODE_ENV must not silently
  // accept forged payment data (SECURITY-REVIEW 4.2). Only ever set this in local dev.
  ALLOW_MOCK_PAYMENTS: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

/** Coerce TRUST_PROXY into the shape Fastify's `trustProxy` option accepts. */
function parseTrustProxy(raw: string): boolean | number | string {
  const value = raw.trim();
  if (value === '' || value.toLowerCase() === 'false') return false;
  if (value.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

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
  appUrl: parsedEnv.APP_URL,
  publicFormsBaseDomain: parsedEnv.PUBLIC_FORMS_BASE_DOMAIN,
  trustProxy: parseTrustProxy(parsedEnv.TRUST_PROXY),
  workerConcurrency: parsedEnv.WORKER_CONCURRENCY,
  dbPoolMax: parsedEnv.DB_POOL_MAX,
  allowMockPayments: parsedEnv.ALLOW_MOCK_PAYMENTS,
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
  sendgridApiKey: parsedEnv.SENDGRID_API_KEY,
  sendgridWebhookVerificationKey: parsedEnv.SENDGRID_WEBHOOK_VERIFICATION_KEY,
  googleMapsApiKey: parsedEnv.GOOGLE_MAPS_API_KEY ?? process.env['VITE_GOOGLE_MAPS_API_KEY'] ?? '',
  webAuthnRpId: parsedEnv.WEBAUTHN_RP_ID,
  webAuthnRpName: parsedEnv.WEBAUTHN_RP_NAME,
};
