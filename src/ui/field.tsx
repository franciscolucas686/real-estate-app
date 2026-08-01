import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/shared/cn';

export interface FieldProps extends Omit<ComponentProps<'label'>, 'children'> {
  label: string;
  children: ReactNode;
  /**
   * Required when the children are a *group* of controls rather than one input — chips, a
   * segmented toggle, a dual-thumb slider.
   *
   * This is not cosmetic. A `<label>` can only be associated with a single labelable
   * element, and one wrapping several buttons forwards clicks to the first labelable
   * descendant it finds, which silently breaks every button in the group. Verified: getting
   * this wrong fails 6 specs.
   */
  asGroup?: boolean;
}

/**
 * Label + control, with the label actually associated with what it labels.
 *
 * It used to render a bare `<label>` as a *sibling* of the control with no `htmlFor` —
 * there were only two `htmlFor` in the whole `src`. So clicking a label didn't focus its
 * field, screen readers announced unlabelled inputs, and tests had to reach for
 * placeholders and positional indexes (`getAllByPlaceholderText('0')[5]`) because
 * `getByLabelText` had nothing to match. That indexing is what made the 1300-line property
 * wizard dangerous to refactor: reordering the DOM silently broke assertions.
 *
 * Single controls use a wrapping `<label>` rather than `useId` + `htmlFor`, because wrapping
 * works no matter what the caller passes — including a fragment or an input already carrying
 * its own id from react-hook-form's `register()`.
 */
export function Field({ label, children, className, asGroup = false, ...props }: FieldProps) {
  if (asGroup) {
    return (
      <fieldset className={cn('flex min-w-0 flex-col gap-1.5', className)}>
        <legend className="text-sm font-medium text-foreground">{label}</legend>
        {children}
      </fieldset>
    );
  }

  return (
    <label className={cn('flex min-w-0 flex-col gap-1.5', className)} {...props}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
