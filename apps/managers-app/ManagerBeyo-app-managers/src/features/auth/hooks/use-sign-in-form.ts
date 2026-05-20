import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { SignInFormSchema, type SignInFormInput } from '@/features/auth/types';

export function useSignInForm() {
  return useForm<SignInFormInput>({
    resolver: zodResolver(SignInFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
}
