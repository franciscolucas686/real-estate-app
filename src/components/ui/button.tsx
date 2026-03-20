import type { VariantProps } from 'tailwind-variants';
import { twMerge } from 'tailwind-merge';
import type { ComponentProps } from 'react';
import { buttonVariants } from './button.variants';

export interface ButtonProps
  extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      data-slot="button"
      data-disabled={disabled ? '' : undefined}
      className={twMerge(buttonVariants({ variant, size }), className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
