import { twMerge } from 'tailwind-merge';

type ClassValue = string | false | null | undefined;

/**
 * Merges Tailwind classes, resolving conflicts in favour of the last one.
 *
 * This is a one-line wrapper over `twMerge`, and that is the point: `twMerge` was
 * being imported directly in 29 files, which meant there was no single place to
 * change how class composition works. Anything that has to apply everywhere later —
 * a `clsx` upgrade for object/array syntax, a dev-time warning for raw hex or
 * off-token values, prefixing for style isolation — now has exactly one seam.
 *
 * Falsy entries are dropped so `cn('base', isActive && 'active')` reads naturally;
 * `twMerge` already tolerates them, but flattening here keeps the contract explicit
 * if the implementation is ever swapped.
 */
export function cn(...classes: ClassValue[]): string {
  return twMerge(classes.filter(Boolean).join(' '));
}
