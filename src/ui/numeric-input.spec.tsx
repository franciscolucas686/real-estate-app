import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NumericInput } from '@/ui/numeric-input';

/**
 * Os dois campos de busca por código do imóvel dependem deste primitivo para que uma letra
 * não seja digitável, colável nem arrastável para dentro deles. As páginas afirmam o
 * resultado; aqui está o mecanismo, inclusive o caso do caret, que é a única razão de o
 * componente escrever no nó do DOM.
 */
function Harness({ onChange }: { onChange?: (value: string) => void } = {}) {
  const [value, setValue] = useState('');

  return (
    <NumericInput
      type="search"
      aria-label="Código"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        onChange?.(e.target.value);
      }}
    />
  );
}

describe('NumericInput', () => {
  it('descarta o que não é dígito enquanto se digita', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByRole('searchbox', { name: 'Código' }), '5a7b5');

    expect(screen.getByRole('searchbox', { name: 'Código' })).toHaveValue('575');
  });

  it('limpa o texto colado', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('searchbox', { name: 'Código' }));
    await user.paste('cód. 575301');

    expect(screen.getByRole('searchbox', { name: 'Código' })).toHaveValue('575301');
  });

  it('entrega ao consumidor apenas dígitos', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    await user.type(screen.getByRole('searchbox', { name: 'Código' }), '5-7');

    expect(onChange.mock.calls.map(([value]) => value)).toEqual(['5', '5', '57']);
  });

  /**
   * O único caso que falha se o `setSelectionRange` sair — os outros quatro só exercitam a
   * escrita no nó. Atribuir `value` colapsa o cursor para o fim do campo, então corrigir um
   * dígito no meio de um código e errar uma tecla mandava o cursor para a ponta e o resto
   * da digitação saía fora de ordem.
   */
  it('mantém o cursor no lugar quando a tecla é rejeitada', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByRole('searchbox', { name: 'Código' });
    await user.type(input, '5701');
    await user.type(input, 'a', { initialSelectionStart: 2, initialSelectionEnd: 2 });

    expect(input).toHaveValue('5701');
    expect((input as HTMLInputElement).selectionStart).toBe(2);
  });

  it('pede o teclado numérico sem abrir mão do type do call site', () => {
    render(<Harness />);

    // `type="search"` é o que dá o papel `searchbox` pelo qual as páginas consultam o
    // campo; `type="number"` o derrubaria junto com os zeros à esquerda dos códigos.
    expect(screen.getByRole('searchbox', { name: 'Código' })).toHaveAttribute(
      'inputmode',
      'numeric',
    );
  });
});
