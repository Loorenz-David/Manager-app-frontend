import { z } from "zod";

const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
});

const parsed = EnvSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed. Check VITE_API_BASE_URL.");
}

export const env = parsed.data;
