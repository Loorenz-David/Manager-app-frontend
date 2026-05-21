import { z } from 'zod';

export const SignInFormSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export type SignInFormInput = z.infer<typeof SignInFormSchema>;
