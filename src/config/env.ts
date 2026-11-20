import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z
    .string()
    .default("5000")
    .transform((val) => parseInt(val, 10)),
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z
    .string()
    .default("postgresql://username:password@localhost:5432/quotewise"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  JWT_SECRET: z
    .string()
    .default("quotewise-jwt-secret-key-change-in-production-min32chars"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  COOKIE_NAME: z.string().default("token"),
  REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
