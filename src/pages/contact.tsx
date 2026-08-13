import { useQuery } from '@tanstack/react-query';
import { FaWhatsapp } from 'react-icons/fa';
import { Phone, Mail, Clock, ChevronRight } from 'lucide-react';
import { PageContainer } from '@/layout/page-container';
import { buildWhatsAppUrl, formatPhone } from '@/shared/format';
import { fetchSiteSettings } from '@/features/settings/site-settings-service';
import { settingsKeys } from '@/features/settings/query-keys';

export function Contact() {
  // Same key the console writes through, from the factory rather than a matching literal:
  // this page and `settings.tsx` read the same record, so saving there has to reach here.
  const { data: contact, isLoading } = useQuery({
    queryKey: settingsKeys.siteSettings(),
    queryFn: fetchSiteSettings,
  });

  if (isLoading || !contact) {
    return (
      <div
        data-slot="page-contact"
        className="flex max-h-dvh flex-col overflow-hidden pb-24 md:max-h-full"
      >
        <PageContainer withSafeAreaTop maxWidth="content" className="py-6">
          <h1 className="text-2xl font-bold text-foreground py-4">Como podemos ajudar?</h1>
        </PageContainer>
        <PageContainer maxWidth="content" className="flex flex-col gap-3 md:grid md:grid-cols-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-[72px] rounded-2xl border border-border bg-surface-raised animate-pulse"
            />
          ))}
        </PageContainer>
      </div>
    );
  }

  const whatsUrl = contact.whatsapp
    ? buildWhatsAppUrl(contact.whatsapp, undefined)
    : `https://wa.me/`;

  return (
    <div
      data-slot="page-contact"
      className="flex max-h-dvh flex-col overflow-hidden pb-24 md:max-h-full"
    >
      <PageContainer withSafeAreaTop maxWidth="content" className="py-6">
        <h1 className="text-2xl font-bold text-foreground py-4">Como podemos ajudar?</h1>
      </PageContainer>

      <PageContainer
        maxWidth="content"
        className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4"
      >
        {/* WhatsApp card */}
        <a
          href={whatsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-2xl border border-border bg-surface-raised px-5 py-4 transition-colors active:bg-border md:hover:border-foreground-subtle/30 md:hover:bg-border/20"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-whatsapp/10 text-whatsapp">
            <FaWhatsapp size={22} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">WhatsApp</p>
            <p className="text-xs text-foreground-subtle">
              {formatPhone(contact.whatsapp) || 'Conversar agora'}
            </p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </a>

        {/* Email card */}
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-4 rounded-2xl border border-border bg-surface-raised px-5 py-4 transition-colors active:bg-border md:hover:border-foreground-subtle/30 md:hover:bg-border/20"
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
            className="flex items-center gap-4 rounded-2xl border border-border bg-surface-raised px-5 py-4 transition-colors active:bg-border md:hover:border-foreground-subtle/30 md:hover:bg-border/20"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-action/10 text-action">
              <Phone size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Telefone</p>
              <p className="text-xs text-foreground-subtle">{formatPhone(contact.phone)}</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </a>
        )}

        {/* Hours card */}
        {contact.hours && (
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface-raised px-5 py-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-action/10 text-action">
              <Clock size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Horário de atendimento</p>
              <p className="text-xs text-foreground-subtle">{contact.hours}</p>
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  );
}
