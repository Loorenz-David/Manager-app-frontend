import { z } from "zod";

// Empty means same-origin: API calls go to /api on the domain the studio was loaded
// from, as in the other apps. Must still be defined, so a build that forgot to set it
// fails loudly instead of calling an unintended backend.
const EnvSchema = z.object({
  VITE_API_BASE_URL: z.union([z.literal(""), z.string().url()]),
});

const parsed = EnvSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed. Check VITE_API_BASE_URL.");
}

export const env = parsed.data;
