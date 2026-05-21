import { FormProvider, useFormContext } from 'react-hook-form';
import { TextInput } from '@/components/primitives/input';
import { useSignInMutation } from '@/features/auth/api/use-sign-in';
import { useSignInForm } from '@/features/auth/hooks/use-sign-in-form';
import { ApiRequestError } from '@/lib/api-client';
import type { SignInFormInput } from '@/features/auth/types';

function EmailField() {
  const {
    register,
    formState: { errors },
  } = useFormContext<SignInFormInput>();

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-muted-foreground" htmlFor="sign-in-email">
        Email
      </label>
      <TextInput
        autoComplete="email"
        data-testid="auth-email-input"
        id="sign-in-email"
        invalid={Boolean(errors.email)}
        type="email"
        {...register('email')}
      />
      {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
    </div>
  );
}

function PasswordField() {
  const {
    register,
    formState: { errors },
  } = useFormContext<SignInFormInput>();

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-muted-foreground" htmlFor="sign-in-password">
        Password
      </label>
      <TextInput
        autoComplete="current-password"
        data-testid="auth-password-input"
        id="sign-in-password"
        invalid={Boolean(errors.password)}
        type="password"
        {...register('password')}
      />
      {errors.password ? (
        <p className="text-xs text-destructive">{errors.password.message}</p>
      ) : null}
    </div>
  );
}

type SignInFormProps = {
  onSuccess: () => void;
};

export function SignInForm({ onSuccess }: SignInFormProps): React.JSX.Element {
  const form = useSignInForm();
  const { mutateAsync: signIn, isPending } = useSignInMutation();
  const {
    handleSubmit,
    setError,
    formState: { errors },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signIn(values);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError('root', { message: err.message });
      } else {
        setError('root', { message: 'Something went wrong. Please try again.' });
      }
    }
  });

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={onSubmit}>
        <fieldset className="space-y-5" disabled={isPending}>
          <EmailField />
          <PasswordField />

          {errors.root ? (
            <div
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3"
              data-testid="auth-error-root"
            >
              <p className="text-sm text-destructive">{errors.root.message}</p>
            </div>
          ) : null}

          <button
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="auth-sign-in-button"
            type="submit"
          >
            {isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </fieldset>
      </form>
    </FormProvider>
  );
}
