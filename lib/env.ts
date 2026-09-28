import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_UNPOOLED: z.string().min(1).optional(),
  META_APP_ID: z.string().min(1).optional(),
  META_APP_SECRET: z.string().min(1).optional(),
  META_INSTAGRAM_APP_SECRET: z.string().min(1).optional(),
  META_VERIFY_TOKEN: z.string().min(1).optional(),
  META_GRAPH_VERSION: z.string().min(1).default("v21.0"),
  TMDB_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(1).optional(),
  AUTH_GOOGLE_ID: z.string().min(1).optional(),
  AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  ALLOW_INSECURE_DEV_WEBHOOK: z.string().optional(),
  BYPASS_WEBHOOK_VERIFY: z.string().optional(),
  DEBUG_WEBHOOK_SIG: z.string().optional(),
  SEED_MOVIES_IG_BUSINESS_ID: z.string().optional(),
  SEED_MOVIES_ACCESS_TOKEN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
