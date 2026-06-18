import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Check } from 'lucide-react';
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

export function Settings() {
  const navigate = useNavigate();
  const logout = useLogout();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [saved, setSaved] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [newNumber, setNewNumber] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [addingNumber, setAddingNumber] = useState(false);

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

  useEffect(() => {
    if (siteSettings && !initialized) {
      setEmail(siteSettings.email);
      setPhone(siteSettings.phone.replace(/\D/g, '').slice(0, 11));
      setHours(siteSettings.hours);
      setWhatsapp(siteSettings.whatsapp.replace(/\D/g, '').slice(0, 11));
      setInitialized(true);
    }
  }, [siteSettings, initialized]);

  async function handleSaveContact() {
    try {
      await updateSiteSettings({ email, phone, hours, whatsapp });
      await queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      setSaved(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch {
      // silent
    }
  }

  async function handleAddNumber() {
    if (!newNumber.trim()) return;
    setAddingNumber(true);
    try {
      const created = await createWhatsappNumber({
        number: newNumber.replace(/\D/g, ''),
        label: newLabel.trim() || undefined,
        isActive: true,
      });
      if (numbers.length === 0) {
        const num = created.number.replace(/\D/g, '').slice(0, 11);
        setWhatsapp(num);
        await updateSiteSettings({ whatsapp: created.number });
        await queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      }
      setNewNumber('');
      setNewLabel('');
      await queryClient.refetchQueries({ queryKey: ['whatsapp-numbers'] });
    } catch {
      // silent
    } finally {
      setAddingNumber(false);
    }
  }

  async function handleDeleteNumber(id: string) {
    try {
      await deleteWhatsappNumber(id);
      await queryClient.refetchQueries({ queryKey: ['whatsapp-numbers'] });
    } catch {
      // silent
    }
  }

  async function handleLogout() {
    await logout.mutateAsync();
    queryClient.clear();
    navigate('/login', { replace: true });
  }

  if (isLoading || loadingSettings) return <SettingsSkeleton />;

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-10">
      <PageContainer className="sticky top-0 z-10 flex items-center gap-3 bg-background pt-[env(safe-area-inset-top,16px)] pb-3">
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
                  {n.label && <p className="text-xs text-muted-foreground">{n.label}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteNumber(n.id)}
                  className="text-danger active:opacity-70"
                  aria-label="Remover número"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <div className="flex gap-2">
              <input
                inputMode="numeric"
                placeholder="(11) 99999-9999"
                value={formatPhone(newNumber)}
                onChange={(e) => setNewNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                className="h-11 flex-1 rounded-xl border border-border bg-surface-raised px-3 text-sm outline-none focus:border-action"
              />
              <button
                type="button"
                onClick={handleAddNumber}
                disabled={addingNumber}
                aria-label="Adicionar número"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-action text-white disabled:opacity-60"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* Contact config (API) */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Dados de contato
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                WhatsApp da página de contato
              </label>
              <input
                inputMode="numeric"
                value={formatPhone(whatsapp)}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="(11) 99999-9999"
                className="h-11 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm outline-none focus:border-action"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">E-mail</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@imobiliaria.com"
                className="h-11 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm outline-none focus:border-action"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Telefone</label>
              <input
                inputMode="numeric"
                value={formatPhoneAdaptive(phone)}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="(11) 99999-9999"
                className="h-11 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm outline-none focus:border-action"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Horário de atendimento
              </label>
              <input
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Seg–Sex: 9h às 18h"
                className="h-11 w-full rounded-xl border border-border bg-surface-raised px-3 text-sm outline-none focus:border-action"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveContact}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-action text-sm font-semibold text-white transition-colors active:bg-action-hover"
            >
              {saved ? (
                <>
                  <Check size={18} /> Salvo
                </>
              ) : (
                'Salvar dados de contato'
              )}
            </button>
          </div>
        </section>

        {/* Logout */}
        <section className="pt-2">
          <button
            type="button"
            onClick={handleLogout}
            disabled={logout.isPending}
            className="flex h-12 w-full items-center justify-center rounded-full border border-danger text-sm font-semibold text-danger active:bg-danger/10 disabled:opacity-60"
          >
            {logout.isPending ? 'Saindo...' : 'Sair da conta'}
          </button>
        </section>
      </div>
    </div>
  );
}
