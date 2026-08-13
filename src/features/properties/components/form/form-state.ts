import type { PropertyFormValues } from '@/features/properties/property.schema';

/**
 * The wizard's form shape, and the setter its step components take.
 *
 * `FormState` is an alias, not a second model: react-hook-form validates exactly this via
 * `zodResolver(propertyFormSchema)`. The name predates the Zod migration and is kept so the
 * step components' prop types did not have to change when it landed.
 */
export type FormState = PropertyFormValues;

export type Setter = <K extends keyof FormState>(key: K, value: FormState[K]) => void;
