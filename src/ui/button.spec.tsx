import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '@/ui/button';

/**
 * These exist because `shape` was declared in `button.variants.ts` and used at 11 call
 * sites, but `Button` never passed it to `buttonVariants` — it fell through `...props` onto
 * the DOM instead. `VariantProps` made every one of those call sites typecheck, so nothing
 * caught it: not `tsc`, not the lint, and not the page specs, which address buttons by name
 * and never look at their classes. The dashboard's FAB rendered as a rounded square for the
 * life of the layering refactor.
 *
 * Asserting on class strings is normally the wrong altitude for a test. Here the class *is*
 * the contract — the whole failure mode was a prop that typechecked and did nothing — so
 * the only way to pin it is to check that the variant reached the output.
 */
describe('Button', () => {
  it('applies the shape variant', () => {
    render(<Button shape="pill">Salvar</Button>);

    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveClass('rounded-full');
  });

  it('falls back to the control shape', () => {
    render(<Button>Salvar</Button>);

    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveClass('rounded-xl');
  });

  it('does not leak shape onto the DOM', () => {
    render(<Button shape="pill">Salvar</Button>);

    expect(screen.getByRole('button', { name: 'Salvar' })).not.toHaveAttribute('shape');
  });

  it('applies the shape variant through asChild', () => {
    // `asChild` swaps the host for a Slot, so the class string is merged onto the child.
    // A shape that survives on `<button>` but not on the `<a>` would break the dashboard's
    // settings link, which is `asChild` + `size="icon"` + `shape="pill"`.
    render(
      <Button asChild shape="pill">
        <a href="/configuracoes">Configurações</a>
      </Button>,
    );

    expect(screen.getByRole('link', { name: 'Configurações' })).toHaveClass('rounded-full');
  });
});
