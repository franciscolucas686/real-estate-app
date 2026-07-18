import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLogin } from '../hooks/use-auth';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { loginSchema, type LoginFormValues } from '../schemas/auth.schema';
import { getErrorMessage } from '../utils/api-error';
import { SuccessSplash } from '../components/ui/success-splash';

export function Login() {
  const navigate = useNavigate();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [splashVisible, setSplashVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      await login.mutateAsync(values);
      setSplashVisible(true);
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 900);
    } catch {
      // error handled below via login.error
    }
  }

  return (
    <div className="relative flex min-h-dvh max-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div className="w-full max-w-sm mb-16">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <img src="/logo.png" alt="Logo" className="h-20 object-contain" />
        </div>

        <h1 className="mb-8 text-center text-2xl font-bold text-foreground">
          Entrar na plataforma
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-md font-medium text-foreground">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              className="h-16 rounded-xl border border-border bg-surface-raised px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-action"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm font-medium text-danger">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-md font-medium text-foreground">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••"
                className="h-16 w-full rounded-xl border border-border bg-surface-raised px-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-action"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 p-2 ml-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={28} /> : <Eye size={28} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm font-medium text-danger">{errors.password.message}</p>
            )}
          </div>

          {login.isError && (
            <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {getErrorMessage(login.error)}
            </p>
          )}

          <button
            type="submit"
            disabled={login.isPending || splashVisible}
            className="mt-2 flex h-14 w-full items-center justify-center rounded-full bg-action text-base font-semibold text-white transition-colors active:bg-action-hover disabled:opacity-60"
          >
            {login.isPending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>

      <SuccessSplash visible={splashVisible}>
        <CheckCircle size={64} className="text-action" />
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-xl font-bold text-foreground">Login realizado</p>
          <p className="text-sm text-muted-foreground">Preparando seu dashboard...</p>
        </div>
      </SuccessSplash>
    </div>
  );
}
