import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_UNPOOLED: z.string().min(1).optional(),
  META_APP_ID: z.string().min(1).optional(),
  META_APP_SECRET: z.string().min(1).optional(),
  META_VERIFY_TOKEN: z.string().min(1).optional(),
  META_GRAPH_VERSION: z.string().min(1).default("v21.0"),
  TMDB_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(1).optional(),
  AUTH_GOOGLE_ID: z.string().min(1).optional(),
  AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
