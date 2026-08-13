import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Check, CheckCircle, Loader2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLogout } from '@/features/auth/use-auth';
import { PageContainer } from '@/layout/page-container';
import { BOTTOM_NAV_CLEARANCE } from '@/layout/app-nav';
import { cn } from '@/shared/cn';
import { onlyDigits } from '@/shared/digits';
import { Input } from '@/ui/input';
import { fetchWhatsappNumbers } from '@/features/settings/whatsapp-service';
import { fetchSiteSettings } from '@/features/settings/site-settings-service';
import { settingsKeys } from '@/features/settings/query-keys';
import {
  useCreateWhatsappNumber,
  useDeleteWhatsappNumber,
  useUpdateSiteSettings,
} from '@/features/settings/use-settings-mutations';
import { formatPhone, formatPhoneAdaptive } from '@/shared/format';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SettingsSkeleton } from '@/features/settings/settings-skeleton';
import { SuccessSplash } from '@/ui/success-splash';
import {
  siteSettingsSchema,
  whatsappNumberSchema,
  type SiteSettingsFormValues,
  type WhatsappNumberFormValues,
} from '@/features/settings/site-settings.schema';
import { getErrorMessage } from '@/shared/api/api-error';

export function Settings() {
  const navigate = useNavigate();
  const logout = useLogout();
  const queryClient = useQueryClient();

  const [saved, setSaved] = useState(false);
  // A ref, not state: this only guards a one-time `reset()` and is never read during render,
  // so setting it in the effect bought a second render pass for nothing. The lint rule that
  // flags it was previously silent here — the compiler-based analysis bailed on the
  // component while the three writes were hand-rolled try/catch/finally blocks.
  const initialized = useRef(false);
  const [splashVisible, setSplashVisible] = useState(false);
  const [logoutSplashVisible, setLogoutSplashVisible] = useState(false);

  // Three writes, three mutations. Each used to carry a hand-rolled pending flag and error
  // string — six `useState`s for what `isPending`, `error` and `variables` already give.
  const saveContact = useUpdateSiteSettings();
  const addNumber = useCreateWhatsappNumber();
  const deleteNumber = useDeleteWhatsappNumber();

  const savingContact = saveContact.isPending;
  const addingNumber = addNumber.isPending;
  // Which row is spinning is the mutation's own input, not a second copy of it.
  const deletingId = deleteNumber.isPending ? deleteNumber.variables : null;

  const contactError = saveContact.error ? getErrorMessage(saveContact.error) : '';
  const addNumberError = addNumber.error ? getErrorMessage(addNumber.error) : '';
  const deleteError = deleteNumber.error ? getErrorMessage(deleteNumber.error) : '';

  // Both success flows hold a splash open, then redirect. Owning the timers in
  // effects (rather than starting them inside the handlers) means unmounting early
  // cancels them, instead of navigating out from under whatever mounted next.
  useEffect(() => {
    if (!splashVisible) return;
    const timer = setTimeout(() => navigate('/dashboard'), 1500);
    return () => clearTimeout(timer);
  }, [splashVisible, navigate]);

  useEffect(() => {
    if (!logoutSplashVisible) return;
    const timer = setTimeout(() => navigate('/login', { replace: true }), 900);
    return () => clearTimeout(timer);
  }, [logoutSplashVisible, navigate]);

  const { data: numbers = [], isLoading } = useQuery({
    queryKey: settingsKeys.whatsappNumbers(),
    queryFn: fetchWhatsappNumbers,
    retry: false,
  });

  const { data: siteSettings, isLoading: loadingSettings } = useQuery({
    queryKey: settingsKeys.siteSettings(),
    queryFn: fetchSiteSettings,
    retry: false,
  });

  const {
    control: contactControl,
    register: registerContact,
    handleSubmit: handleContactSubmit,
    setValue: setContactValue,
    reset: resetContact,
    formState: { errors: contactErrors },
  } = useForm<SiteSettingsFormValues>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: { email: '', phone: '', whatsapp: '', hours: '' },
  });

  const {
    control: newNumberControl,
    handleSubmit: handleNewNumberSubmit,
    reset: resetNewNumber,
    formState: { errors: newNumberErrors },
  } = useForm<WhatsappNumberFormValues>({
    resolver: zodResolver(whatsappNumberSchema),
    defaultValues: { number: '' },
  });

  useEffect(() => {
    if (siteSettings && !initialized.current) {
      resetContact({
        email: siteSettings.email,
        phone: onlyDigits(siteSettings.phone).slice(0, 11),
        whatsapp: onlyDigits(siteSettings.whatsapp).slice(0, 11),
        hours: siteSettings.hours,
      });
      initialized.current = true;
    }
  }, [siteSettings, resetContact]);

  // The three handlers swallow the rejection rather than rethrow: the message is already on
  // screen through `mutation.error`, and letting it escape an event handler would surface as
  // an unhandled rejection instead.
  async function onSaveContact(values: SiteSettingsFormValues) {
    try {
      await saveContact.mutateAsync(values);
      setSaved(true);
      setSplashVisible(true);
    } catch {
      /* surfaced by `contactError` */
    }
  }

  async function onAddNumber(values: WhatsappNumberFormValues) {
    try {
      const { created } = await addNumber.mutateAsync({
        number: values.number,
        isFirst: numbers.length === 0,
      });
      // Mirror the promoted number into the contact field the operator is looking at, so it
      // doesn't stay blank until the refetch lands.
      if (numbers.length === 0) {
        setContactValue('whatsapp', onlyDigits(created.number).slice(0, 11));
      }
      resetNewNumber({ number: '' });
    } catch {
      /* surfaced by `addNumberError` */
    }
  }

  async function handleDeleteNumber(id: string) {
    try {
      await deleteNumber.mutateAsync(id);
    } catch {
      /* surfaced by `deleteError` */
    }
  }

  async function handleLogout() {
    await logout.mutateAsync();
    queryClient.clear();
    setLogoutSplashVisible(true);
  }

  if (isLoading || loadingSettings) return <SettingsSkeleton />;

  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col bg-background md:min-h-full md:pb-10',
        BOTTOM_NAV_CLEARANCE,
      )}
    >
      <PageContainer
        maxWidth="reading"
        className="sticky top-0 z-10 flex items-center gap-3 bg-background pt-[calc(env(safe-area-inset-top,16px)+12px)] pb-3"
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex size-12 items-center justify-center rounded-full transition-colors md:hover:bg-action hover:text-white"
          aria-label="Voltar"
        >
          <ChevronLeft size={24} />
        </button>
        {/* Steps up from `md` like the dashboard and the gallery — the three console page
            titles now share one treatment instead of three different sizes. */}
        <h1 className="text-lg font-bold text-foreground md:text-2xl">Configurações</h1>
      </PageContainer>

      <PageContainer maxWidth="reading" className="flex flex-col gap-6 pt-4">
        {/* WhatsApp numbers (API) */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            WhatsApp da página dos imóveis
          </p>
          <div className="flex flex-col gap-2">
            {numbers.map((n) => (
              <div
                key={n.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{formatPhone(n.number)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteNumber(n.id)}
                  disabled={deletingId === n.id}
                  className="text-danger transition-opacity active:opacity-70 disabled:opacity-60 md:hover:opacity-70"
                  aria-label="Remover número"
                >
                  {deletingId === n.id ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <Trash2 size={24} />
                  )}
                </button>
              </div>
            ))}
            {deleteError && <p className="text-sm font-medium text-danger">{deleteError}</p>}

            <form
              onSubmit={handleNewNumberSubmit(onAddNumber)}
              className="flex flex-col gap-2"
              noValidate
            >
              <div className="flex gap-2">
                <Controller
                  control={newNumberControl}
                  name="number"
                  render={({ field }) => (
                    <Input
                      inputMode="numeric"
                      placeholder="(11) 99999-9999"
                      value={formatPhone(field.value)}
                      onChange={(e) => field.onChange(onlyDigits(e.target.value).slice(0, 11))}
                      disabled={addingNumber}
                      className="h-11 flex-1 px-3"
                    />
                  )}
                />
                <button
                  type="submit"
                  disabled={addingNumber}
                  aria-label="Adicionar número"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-action text-white transition-colors disabled:opacity-60 md:hover:bg-action-hover"
                >
                  {addingNumber ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <Plus size={24} />
                  )}
                </button>
              </div>
              {newNumberErrors.number && (
                <p className="text-sm font-medium text-danger">{newNumberErrors.number.message}</p>
              )}
              {addNumberError && (
                <p className="text-sm font-medium text-danger">{addNumberError}</p>
              )}
            </form>
          </div>
        </section>

        {/* Contact config (API) */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Dados de contato
          </p>
          <form
            onSubmit={handleContactSubmit(onSaveContact)}
            className="flex flex-col gap-3"
            noValidate
          >
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                WhatsApp da página de contato
              </label>
              <Controller
                control={contactControl}
                name="whatsapp"
                render={({ field }) => (
                  <Input
                    inputMode="numeric"
                    value={formatPhone(field.value)}
                    onChange={(e) => field.onChange(onlyDigits(e.target.value).slice(0, 11))}
                    placeholder="(11) 99999-9999"
                    className="h-11 w-full px-3"
                  />
                )}
              />
              {contactErrors.whatsapp && (
                <p className="mt-1 text-sm font-medium text-danger">
                  {contactErrors.whatsapp.message}
                </p>
              )}
            </div>

            {/* E-mail/Telefone: stacked on mobile, side by side once there's room */}
            <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">E-mail</label>
                <Input
                  type="email"
                  placeholder="contato@imobiliaria.com"
                  className="h-11 w-full px-3"
                  {...registerContact('email')}
                />
                {contactErrors.email && (
                  <p className="mt-1 text-sm font-medium text-danger">
                    {contactErrors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Telefone</label>
                <Controller
                  control={contactControl}
                  name="phone"
                  render={({ field }) => (
                    <Input
                      inputMode="numeric"
                      value={formatPhoneAdaptive(field.value)}
                      onChange={(e) => field.onChange(onlyDigits(e.target.value).slice(0, 11))}
                      placeholder="(11) 99999-9999"
                      className="h-11 w-full px-3"
                    />
                  )}
                />
                {contactErrors.phone && (
                  <p className="mt-1 text-sm font-medium text-danger">
                    {contactErrors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Horário de atendimento
              </label>
              <Input
                placeholder="Seg–Sex: 9h às 18h"
                className="h-11 w-full px-3"
                {...registerContact('hours')}
              />
            </div>

            {contactError && (
              <p
                role="alert"
                className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
              >
                {contactError}
              </p>
            )}

            {/*
              The button swapping its own label to "Salvo" is a visual-only confirmation —
              a screen reader gets nothing, because changing a button's text isn't an
              announcement. This polite live region carries the outcome without stealing
              focus, and it is separate from the button so the button's accessible name
              stays stable while the message changes.
            */}
            <p aria-live="polite" className="sr-only">
              {savingContact
                ? 'Salvando dados de contato…'
                : saved
                  ? 'Dados de contato salvos.'
                  : ''}
            </p>

            <div className="pt-2 flex items-center justify-center">
              <button
                type="submit"
                disabled={savingContact}
                aria-busy={savingContact || undefined}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-action text-sm font-semibold text-white transition-colors active:bg-action-hover disabled:opacity-60 md:hover:bg-action-hover"
              >
                {savingContact ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : saved ? (
                  <>
                    <Check size={24} /> Salvo
                  </>
                ) : (
                  'Salvar dados de contato'
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Logout */}
        <section className="mb-6">
          <button
            type="button"
            onClick={handleLogout}
            disabled={logout.isPending || logoutSplashVisible}
            className="flex h-14 w-full items-center justify-center rounded-xl border border-danger text-sm font-semibold text-danger transition-colors active:bg-danger/10 disabled:opacity-60 md:hover:bg-danger/10"
          >
            {logout.isPending ? 'Saindo...' : 'Sair da conta'}
          </button>
        </section>
      </PageContainer>

      <SuccessSplash visible={splashVisible}>
        <CheckCircle size={64} className="text-action" />
        <p className="text-xl font-bold text-foreground">Dados de contato salvos!</p>
      </SuccessSplash>

      <SuccessSplash visible={logoutSplashVisible}>
        <CheckCircle size={64} className="text-action" />
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-xl font-bold text-foreground">Logout realizado</p>
          <p className="text-sm text-muted-foreground">Até a próxima!</p>
        </div>
      </SuccessSplash>
    </div>
  );
}
