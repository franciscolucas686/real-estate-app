import { forwardRef, type ChangeEvent, type ComponentProps } from 'react';
import { onlyDigits } from '@/shared/digits';
import { Input } from '@/ui/input';

/**
 * `Input` restrito a dígitos, seja qual for o caminho de entrada — digitação, colagem,
 * texto arrastado, autofill ou a fileira de pontuação do teclado do celular. O `onChange`
 * do consumidor só enxerga dígitos, então sanear não é algo que um call site possa
 * esquecer de fazer.
 *
 * Componente separado em vez de uma prop `digitsOnly` no `Input`: `Input` hoje não carrega
 * prop customizada nenhuma, e um booleano que passa no typecheck mas não é consumido cai
 * silenciosamente no DOM.
 *
 * Deliberadamente não é `type="number"`. Aquele tipo admite `e`, `+`, `-` e `.`, perde o
 * papel `searchbox` pelo qual os specs das páginas consultam o campo, normaliza os zeros à
 * esquerda que códigos reais têm, e lança em `setSelectionRange`. `inputMode="numeric"` dá
 * o teclado numérico sem nada disso, e fica antes de `...props` para que um call site ainda
 * possa pedir `tel`.
 */
export const NumericInput = forwardRef<HTMLInputElement, ComponentProps<'input'>>(
  function NumericInput({ onChange, ...props }, ref) {
    function handleChange(event: ChangeEvent<HTMLInputElement>) {
      const el = event.currentTarget;
      const digits = onlyDigits(el.value);

      /*
       * Corrigir o nó é o que *faz* o saneamento, não um conserto cosmético depois dele: o
       * evento é repassado inteiro, e o consumidor lê `event.target.value` — é assim que
       * todo call site já escreve. Sanear só numa variável local deixaria o valor original
       * chegar lá. Escrever aqui também mantém o primitivo correto em uso não-controlado,
       * onde não há estado de ninguém para reconciliar o campo.
       *
       * A escrita passa pelo value tracker do próprio React (ele redefine o descriptor de
       * `value` no nó), então o tracker segue em dia e a próxima tecla idêntica não é
       * engolida como "não mudou".
       *
       * O caret é uma segunda coisa, e não sai de graça: atribuir `value` colapsa o cursor
       * para o fim do campo. Sem o `setSelectionRange`, corrigir um dígito no meio de
       * `575301` e errar uma tecla mandava o cursor para a ponta e o resto da digitação
       * saía fora de ordem. Cada metade tem o seu caso em `numeric-input.spec.tsx`.
       */
      if (digits !== el.value) {
        // `selectionStart` é null em tipos de input sem API de seleção, onde
        // `setSelectionRange` lança em vez de não fazer nada.
        const caret = el.selectionStart;
        const nextCaret = caret === null ? null : onlyDigits(el.value.slice(0, caret)).length;

        el.value = digits;
        if (nextCaret !== null) el.setSelectionRange(nextCaret, nextCaret);
      }

      onChange?.(event);
    }

    return <Input ref={ref} inputMode="numeric" {...props} onChange={handleChange} />;
  },
);
