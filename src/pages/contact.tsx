import { FaWhatsapp } from 'react-icons/fa';
import { Phone, Mail } from 'lucide-react';
import { PageContainer } from '../components/ui/page-container';

const AGENCY_WHATSAPP = '15988193239';

export function Contact() {
  const whatsUrl = `https://wa.me/55${AGENCY_WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Tenho interesse em um imóvel.')}`;

  return (
    <div data-slot="page-contact" className="flex flex-col pb-24">
      <PageContainer className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-foreground">Contato</h1>
        <p className="mt-1 text-sm text-foreground-subtle">
          Entre em contato conosco. Estamos prontos para ajudar.
        </p>
      </PageContainer>

      <PageContainer className="flex flex-col gap-4">
        <a
          href={whatsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-14 items-center justify-center gap-2 rounded-full bg-whatsapp text-base font-semibold text-white transition-transform active:scale-[0.98]"
        >
          <FaWhatsapp size={22} />
          Falar no WhatsApp
        </a>

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-action/10 text-action">
              <Phone size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Telefone</p>
              <p className="text-sm text-foreground-subtle">{AGENCY_WHATSAPP}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-action/10 text-action">
              <Mail size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">E-mail</p>
              <p className="text-sm text-foreground-subtle">contato@imobiliaria.com</p>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
