import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import type { PropertyOwnerDto } from '@/shared/api/types';
import { buildOwnerWhatsAppUrl, formatPhone } from '@/shared/format';
import { cn } from '@/shared/cn';

interface PropertyOwnerCardProps {
  /** `null` quando o imóvel é anterior à migração que criou as colunas. */
  owner: PropertyOwnerDto | null;
  propertyId: string;
  propertyCode: string;
  className?: string;
}

/**
 * O contato do dono do imóvel — dado de operação, não de vitrine.
 *
 * **Quem esconde isto do visitante é o backend, não este componente.** `owner` chega `null`
 * numa chamada anônima porque `findOne` não serializa o campo (ver `ownerContactFor` no
 * `api-real-estate`); o `isAuthenticated` no call site é ergonomia, não a proteção. Se um dia
 * este componente vazar para uma tela pública, não há dado a vazar junto.
 *
 * **Por que ele não se parece com o CTA da imobiliária.** Os dois são botões de WhatsApp na
 * mesma página, e confundi-los é ligar para a pessoa errada. As três diferenças são
 * deliberadas e trabalham juntas:
 * - *forma*: `rounded-xl` e `h-12` contra a pílula `rounded-full h-14` do CTA;
 * - *cor*: a família do WhatsApp (`--color-whatsapp` em borda, fundo e ícone) contra o azul
 *   `action`, que segue sendo o único botão **sólido** da página — a hierarquia não muda;
 * - *rótulo*: o próprio número, sob um cabeçalho que diz de quem ele é.
 *
 * **O número não é `text-whatsapp`, e isso não é descuido.** O token é `#1a9e4d`, calibrado
 * para 3:1 — o limiar de componente de UI, não o de texto. Ícone e borda podem usá-lo; o
 * número, que é texto de 14px, fica em `text-foreground` para cumprir os 4.5:1 da WCAG 1.4.3.
 */
export function PropertyOwnerCard({
  owner,
  propertyId,
  propertyCode,
  className,
}: PropertyOwnerCardProps) {
  return (
    <section
      data-slot="property-owner-card"
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-whatsapp/25 bg-whatsapp/5 p-4',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Lock size={14} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-foreground">Dados do proprietário</h2>
          <span className="text-2xs text-muted-foreground">Visível apenas para a equipe</span>
        </div>
      </div>

      {owner ? (
        <>
          <p className="text-sm text-foreground-subtle">
            {/* O nome fica fora do botão: o alvo de toque é o telefone, e um nome longo
                dentro dele empurraria o número para uma segunda linha. */}
            <span className="font-medium text-foreground">{owner.name}</span>
          </p>

          <a
            href={buildOwnerWhatsAppUrl(owner.phone, propertyCode)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Falar no WhatsApp com ${owner.name}, proprietário do imóvel`}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-whatsapp/40 bg-whatsapp/10 text-base font-semibold text-foreground transition-colors active:bg-whatsapp/20 md:hover:bg-whatsapp/20"
          >
            <FaWhatsapp size={20} className="text-whatsapp" aria-hidden="true" />
            {formatPhone(owner.phone)}
          </a>
        </>
      ) : (
        /* Imóvel cadastrado antes de os campos existirem. Dizer só "não informado" deixaria
           o operador sem saída; o link leva ao único lugar onde isso se resolve. */
        <p className="text-sm text-foreground-subtle">
          Proprietário não informado.{' '}
          <Link
            to={`/properties/${propertyId}/edit`}
            className="font-medium text-action underline underline-offset-2"
          >
            Adicionar no formulário
          </Link>
        </p>
      )}
    </section>
  );
}
