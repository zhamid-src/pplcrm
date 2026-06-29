import type { FormBuilder, NonNullableFormBuilder } from '@angular/forms';
import { Validators } from '@angular/forms';

// Consolidated form control builders and password breach utilities
export type AnyFormBuilder = FormBuilder | NonNullableFormBuilder;

export function emailControl(fb: AnyFormBuilder) {
  return fb.control('', { validators: [Validators.required, Validators.email] });
}

type BreachError = { kind: string; pwnedPasswordOccurrence?: number };
type SignalFieldState = { errors: () => BreachError[] };

export function passwordBreachNumber(control: unknown) {
  let errs: { pwnedPasswordOccurrence?: number } | null = null;
  if (control && typeof (control as SignalFieldState).errors === 'function') {
    // It's a FieldState (Signal Forms)
    const activeErrors = (control as SignalFieldState).errors();
    const breachErr = activeErrors.find(
      (e) => e.kind === 'pwnedPasswordOccurrence' || e.pwnedPasswordOccurrence !== undefined,
    );
    errs = breachErr ?? null;
  } else {
    // It's an AbstractControl (Reactive Forms)
    errs = (control as { errors?: { pwnedPasswordOccurrence?: number } | null } | null)?.errors ?? null;
  }
  return errs?.pwnedPasswordOccurrence ?? null;
}

export function passwordControl(fb: AnyFormBuilder) {
  return fb.control('', { validators: [Validators.required, Validators.minLength(8)] });
}

export function passwordInBreach(control: unknown) {
  return !!passwordBreachNumber(control);
}
