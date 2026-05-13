import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '../hooks/use-auth';
import { Eye, EyeOff } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      navigate('/dashboard', { replace: true });
    } catch {
      // error handled by login.isError
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <img src="/logo.png" alt="Logo" className="h-20 object-contain" />
        </div>

        <h1 className="mb-8 text-center text-2xl font-bold text-foreground">
          Entrar na plataforma
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-12 rounded-xl border border-border bg-surface-raised px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-action"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="h-12 w-full rounded-xl border border-border bg-surface-raised px-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-action"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {login.isError && (
            <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              E-mail ou senha incorretos.
            </p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="mt-2 flex h-14 w-full items-center justify-center rounded-full bg-action text-base font-semibold text-white transition-colors active:bg-action-hover disabled:opacity-60"
          >
            {login.isPending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
