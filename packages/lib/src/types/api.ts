import { z } from 'zod';

export const ApiEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    ok: z.literal(true),
    data: dataSchema,
    warnings: z.array(z.string()),
  });

export const ApiErrorSchema = z.object({
  error: z.string(),
  ok: z.literal(false),
});

export type ApiResponse<T> = {
  ok: true;
  data: T;
  warnings: string[];
};
