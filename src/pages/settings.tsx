import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Check } from 'lucide-react';
import { useLogout } from '../hooks/use-auth';
import { PageContainer } from '../components/ui/page-container';
import { getContactConfig, saveContactConfig } from './contact';
import {
  fetchWhatsappNumbers,
  createWhatsappNumber,
  deleteWhatsappNumber,
} from '../services/whatsapp-service';
import type { WhatsappNumber } from '../types/api';
import { useQueryClient } from '@tanstack/react-query';

export function Settings() {
  const navigate = useNavigate();
  const logout = useLogout();
  const queryClient = useQueryClient();

  const contact = getContactConfig();
  const [email, setEmail] = useState(contact.email);
  const [phone, setPhone] = useState(contact.phone);
  const [hours, setHours] = useState(contact.hours);
  const [whatsapp, setWhatsapp] = useState(contact.whatsapp);
  const [saved, setSaved] = useState(false);

  const [numbers, setNumbers] = useState<WhatsappNumber[]>([]);
  const [newNumber, setNewNumber] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [addingNumber, setAddingNumber] = useState(false);

  useEffect(() => {
    fetchWhatsappNumbers()
      .then(setNumbers)
      .catch(() => {
        // admin secret not configured — skip silently
      });
  }, []);

  function handleSaveContact() {
    saveContactConfig({ email, phone, hours, whatsapp });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
      setNumbers((prev) => [...prev, created]);
      if (numbers.length === 0) {
        setWhatsapp(created.number);
        saveContactConfig({ whatsapp: created.number });
      }
      setNewNumber('');
      setNewLabel('');
    } catch {
      // silent
    } finally {
      setAddingNumber(false);
    }
  }

  async function handleDeleteNumber(id: string) {
    try {
      await deleteWhatsappNumber(id);
      setNumbers((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // silent
    }
  }

  async function handleLogout() {
    await logout.mutateAsync();
    queryClient.clear();
    navigate('/login', { replace: true });
  }

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
            WhatsApp
          </p>
          <div className="flex flex-col gap-2">
            {numbers.map((n) => (
              <div
                key={n.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{n.number}</p>
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
                placeholder="Número (ex: 5511999999999)"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
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

        {/* Contact config (localStorage) */}
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Dados de contato
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                WhatsApp de contato
              </label>
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="5511999999999"
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(15) 9 8819-3239"
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
