import { FaWhatsapp } from 'react-icons/fa';
import { Phone, Mail, Clock, ChevronRight } from 'lucide-react';
import { PageContainer } from '../components/ui/page-container';
import { buildWhatsAppUrl } from '../utils/format';

const KEYS = {
  whatsapp: 'contact_whatsapp',
  email: 'contact_email',
  phone: 'contact_phone',
  hours: 'contact_hours',
} as const;

const DEFAULTS = {
  whatsapp: '',
  email: '',
  phone: '',
  hours: 'Seg–Sex: 9h às 18h | Sáb: 9h às 13h',
};

export function getContactConfig() {
  return {
    whatsapp: localStorage.getItem(KEYS.whatsapp) ?? DEFAULTS.whatsapp,
    email: localStorage.getItem(KEYS.email) ?? DEFAULTS.email,
    phone: localStorage.getItem(KEYS.phone) ?? DEFAULTS.phone,
    hours: localStorage.getItem(KEYS.hours) ?? DEFAULTS.hours,
  };
}

export function saveContactConfig(config: Partial<typeof DEFAULTS>) {
  Object.entries(config).forEach(([k, v]) => {
    if (v !== undefined) localStorage.setItem(KEYS[k as keyof typeof KEYS], v);
  });
}

export function Contact() {
  const contact = getContactConfig();
  const whatsUrl = contact.whatsapp
    ? buildWhatsAppUrl(contact.whatsapp, undefined)
    : `https://wa.me/`;

  return (
    <div data-slot="page-contact" className="flex max-h-dvh flex-col overflow-hidden pb-24">
      <PageContainer withSafeAreaTop className="py-6">
        <h1 className="text-2xl font-bold text-foreground py-4">Como podemos ajudar?</h1>
      </PageContainer>

      <PageContainer className="flex flex-col gap-3">
        {/* WhatsApp card */}
        <a
          href={whatsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-2xl border border-border bg-surface-raised px-5 py-4 active:bg-border"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <FaWhatsapp size={22} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">WhatsApp</p>
            <p className="text-xs text-foreground-subtle">
              {contact.whatsapp || 'Conversar agora'}
            </p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </a>

        {/* Email card */}
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-4 rounded-2xl border border-border bg-surface-raised px-5 py-4 active:bg-border"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-action/10 text-action">
              <Mail size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">E-mail</p>
              <p className="text-xs text-foreground-subtle">{contact.email}</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </a>
        )}

        {/* Phone card */}
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="flex items-center gap-4 rounded-2xl border border-border bg-surface-raised px-5 py-4 active:bg-border"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-action/10 text-action">
              <Phone size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Telefone</p>
              <p className="text-xs text-foreground-subtle">{contact.phone}</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </a>
        )}

        {/* Hours card */}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface-raised px-5 py-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-action/10 text-action">
            <Clock size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Horário de atendimento</p>
            <p className="text-xs text-foreground-subtle">{contact.hours}</p>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
