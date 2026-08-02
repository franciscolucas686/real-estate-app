import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLogin } from '@/features/auth/use-auth';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { loginSchema, type LoginFormValues } from '@/features/auth/auth.schema';
import { getErrorMessage } from '@/shared/api/api-error';
import { SuccessSplash } from '@/ui/success-splash';
import { Input } from '@/ui/input';

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

  // A reading beat for the confirmation, nothing more. It used to double as the wait for
  // the session refetch — a guess that 900ms was enough for `/auth/me` to come back, which
  // a desktop on a warm backend always won and a phone did not. The wait now lives in
  // `useLogin`, which keeps the mutation pending until `['me']` has refetched, so by the
  // time this timer starts the session is already known and the dashboard mounts with it.
  //
  // Owning the timer in an effect (rather than starting it inside the submit handler)
  // means unmounting early — back button, session expiry — cancels it, instead of
  // navigating out from under whatever mounted next.
  useEffect(() => {
    if (!splashVisible) return;
    const timer = setTimeout(() => navigate('/dashboard', { replace: true }), 900);
    return () => clearTimeout(timer);
  }, [splashVisible, navigate]);

  async function onSubmit(values: LoginFormValues) {
    try {
      // Resolves only once the session query has settled — see `useLogin`.
      await login.mutateAsync(values);
      setSplashVisible(true);
    } catch {
      // error handled below via login.error
    }
  }

  return (
    // The bottom padding is the mobile nav's own height — 78px (pt-2 + a 54px item + pb-4)
    // plus the safe-area inset — so `justify-center` centres inside what is actually
    // visible. The screen is `overflow-hidden` with no scroll, so anything the fixed bar
    // covers is unreachable, not merely hidden: the submit button would be untappable.
    <div className="relative flex min-h-dvh max-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-4 pb-[calc(env(safe-area-inset-bottom,0px)+78px)] md:min-h-0 md:max-h-none md:flex-1 md:pb-0">
      {/* Pulls the card off dead centre. Only above `md`, where there is no bottom bar to
          balance it against — below, the nav already carries that visual weight. */}
      <div className="w-full max-w-sm md:mb-16">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <img src="/logo.png" alt="Logo" className="h-20 object-contain" />
        </div>

        <h1 className="mb-8 text-center text-2xl font-bold text-foreground">
          Entrar na plataforma
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground md:text-base">
              E-mail
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              className="h-16"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm font-medium text-danger">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground md:text-base">
              Senha
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••"
                className="h-16 w-full pr-12"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 p-2 ml-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors md:hover:text-foreground"
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
            <p
              role="alert"
              className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
            >
              {getErrorMessage(login.error)}
            </p>
          )}

          <button
            type="submit"
            disabled={login.isPending || splashVisible}
            className="mt-2 flex h-14 w-full items-center justify-center rounded-full bg-action text-base font-semibold text-white transition-colors active:bg-action-hover disabled:opacity-60 md:hover:bg-action-hover"
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
