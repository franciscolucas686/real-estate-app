import type { ComponentProps } from 'react';
import { Slot } from '@radix-ui/react-slot';
import type { VariantProps } from 'tailwind-variants';
import { cn } from '@/shared/cn';
import { buttonVariants } from '@/ui/button.variants';

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  /**
   * Render the button's styling onto its single child instead of onto a `<button>`.
   *
   * This is how a navigation control gets button styling without losing link semantics:
   * `<Button asChild><Link to="/x">…</Link></Button>` produces an `<a href>`, so
   * ctrl/cmd-click, middle-click, "open in new tab" and "copy link address" all work, and
   * assistive tech announces a link. A `<button onClick={navigate}>` styled the same way
   * silently breaks every one of those.
   */
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  shape,
  disabled,
  asChild = false,
  type,
  children,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      // `type` was hardcoded to "button", which made this component unusable for form
      // submission — every real submit button in the app had to be hand-rolled with raw
      // classes. Defaulting instead of forcing keeps the safe behaviour without the dead
      // end. `type`/`disabled` are skipped under `asChild`, where the child may be an
      // `<a>` that accepts neither.
      {...(asChild ? {} : { type: type ?? 'button', disabled })}
      data-slot="button"
      data-disabled={disabled ? '' : undefined}
      // `shape` has to be destructured and forwarded like `variant`/`size`. It was neither:
      // `VariantProps` accepted it, so all 11 `shape="pill"` call sites typechecked, but the
      // prop fell through to `...props` and onto the DOM while the button silently rendered
      // the `control` default. That is how the circular FAB became a rounded square.
      className={cn(buttonVariants({ variant, size, shape }), className)}
      {...props}
    >
      {children}
    </Component>
  );
}
