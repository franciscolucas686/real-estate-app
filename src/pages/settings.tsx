import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Check, CheckCircle, Loader2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLogout } from '../hooks/use-auth';
import { PageContainer } from '../components/ui/page-container';
import {
  fetchWhatsappNumbers,
  createWhatsappNumber,
  deleteWhatsappNumber,
} from '../services/whatsapp-service';
import { fetchSiteSettings, updateSiteSettings } from '../services/site-settings-service';
import { formatPhone, formatPhoneAdaptive } from '../utils/format';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SettingsSkeleton } from '../components/ui/skeletons';
import { SuccessSplash } from '../components/ui/success-splash';
import {
  siteSettingsSchema,
  whatsappNumberSchema,
  type SiteSettingsFormValues,
  type WhatsappNumberFormValues,
} from '../schemas/site-settings.schema';
import { getErrorMessage } from '../utils/api-error';

export function Settings() {
  const navigate = useNavigate();
  const logout = useLogout();
  const queryClient = useQueryClient();

  const [saved, setSaved] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [splashVisible, setSplashVisible] = useState(false);
  const [logoutSplashVisible, setLogoutSplashVisible] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState('');

  const [addingNumber, setAddingNumber] = useState(false);
  const [addNumberError, setAddNumberError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const { data: numbers = [], isLoading } = useQuery({
    queryKey: ['whatsapp-numbers'],
    queryFn: fetchWhatsappNumbers,
    retry: false,
  });

  const { data: siteSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ['site-settings'],
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
    if (siteSettings && !initialized) {
      resetContact({
        email: siteSettings.email,
        phone: siteSettings.phone.replace(/\D/g, '').slice(0, 11),
        whatsapp: siteSettings.whatsapp.replace(/\D/g, '').slice(0, 11),
        hours: siteSettings.hours,
      });
      setInitialized(true);
    }
  }, [siteSettings, initialized, resetContact]);

  async function onSaveContact(values: SiteSettingsFormValues) {
    setSavingContact(true);
    setContactError('');
    try {
      await updateSiteSettings(values);
      await queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      setSaved(true);
      setSplashVisible(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (e) {
      setContactError(getErrorMessage(e));
    } finally {
      setSavingContact(false);
    }
  }

  async function onAddNumber(values: WhatsappNumberFormValues) {
    setAddingNumber(true);
    setAddNumberError('');
    try {
      const created = await createWhatsappNumber({
        number: values.number,
        isActive: true,
      });
      if (numbers.length === 0) {
        const num = created.number.replace(/\D/g, '').slice(0, 11);
        setContactValue('whatsapp', num);
        await updateSiteSettings({ whatsapp: created.number });
        await queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      }
      await queryClient.refetchQueries({ queryKey: ['whatsapp-numbers'] });
      resetNewNumber({ number: '' });
    } catch (e) {
      setAddNumberError(getErrorMessage(e));
    } finally {
      setAddingNumber(false);
    }
  }

  async function handleDeleteNumber(id: string) {
    setDeletingId(id);
    setDeleteError('');
    try {
      await deleteWhatsappNumber(id);
      await queryClient.refetchQueries({ queryKey: ['whatsapp-numbers'] });
    } catch (e) {
      setDeleteError(getErrorMessage(e));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLogout() {
    await logout.mutateAsync();
    queryClient.clear();
    setLogoutSplashVisible(true);
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 900);
  }

  if (isLoading || loadingSettings) return <SettingsSkeleton />;

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-10">
      <PageContainer className="sticky top-0 z-10 flex items-center gap-3 bg-background pt-[calc(env(safe-area-inset-top,16px)+12px)] pb-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex size-11 items-center justify-center rounded-full"
          aria-label="Voltar"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Configurações</h1>
      </PageContainer>

      <div className="flex flex-col gap-6 px-6 pt-4">
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
                  className="text-danger active:opacity-70 disabled:opacity-60"
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
                    <input
                      inputMode="numeric"
                      placeholder="(11) 99999-9999"
                      value={formatPhone(field.value)}
                      onChange={(e) =>
                        field.onChange(e.target.value.replace(/\D/g, '').slice(0, 11))
                      }
                      disabled={addingNumber}
                      className="h-11 flex-1 rounded-xl border border-border bg-surface-raised px-3 text-sm outline-none focus:border-action disabled:opacity-60"
                    />
                  )}
                />
                <button
                  type="submit"
                  disabled={addingNumber}
                  aria-label="Adicionar número"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-action text-white disabled:opacity-60"
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
                  <input
                    inputMode="numeric"
                    value={formatPhone(field.value)}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="(11) 99999-9999"
                    className="h-11 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm outline-none focus:border-action"
                  />
                )}
              />
              {contactErrors.whatsapp && (
                <p className="mt-1 text-sm font-medium text-danger">
                  {contactErrors.whatsapp.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">E-mail</label>
              <input
                type="email"
                placeholder="contato@imobiliaria.com"
                className="h-11 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm outline-none focus:border-action"
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
                  <input
                    inputMode="numeric"
                    value={formatPhoneAdaptive(field.value)}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="(11) 99999-9999"
                    className="h-11 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm outline-none focus:border-action"
                  />
                )}
              />
              {contactErrors.phone && (
                <p className="mt-1 text-sm font-medium text-danger">
                  {contactErrors.phone.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Horário de atendimento
              </label>
              <input
                placeholder="Seg–Sex: 9h às 18h"
                className="h-11 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm outline-none focus:border-action"
                {...registerContact('hours')}
              />
            </div>

            {contactError && (
              <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                {contactError}
              </p>
            )}

            <div className="pt-2 flex items-center justify-center">
              <button
                type="submit"
                disabled={savingContact}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-action text-sm font-semibold text-white transition-colors active:bg-action-hover disabled:opacity-60"
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
        <section>
          <button
            type="button"
            onClick={handleLogout}
            disabled={logout.isPending || logoutSplashVisible}
            className="flex h-14 w-full items-center justify-center rounded-full border border-danger text-sm font-semibold text-danger active:bg-danger/10 disabled:opacity-60"
          >
            {logout.isPending ? 'Saindo...' : 'Sair da conta'}
          </button>
        </section>
      </div>

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
