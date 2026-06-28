import type { FormBuilder, NonNullableFormBuilder } from '@angular/forms';
import { Validators } from '@angular/forms';

// Consolidated form control builders and password breach utilities
export type AnyFormBuilder = FormBuilder | NonNullableFormBuilder;

export function emailControl(fb: AnyFormBuilder) {
  return fb.control('', { validators: [Validators.required, Validators.email] });
}

export function passwordBreachNumber(control: any) {
  let errs: any;
  if (control && typeof control.errors === 'function') {
    // It's a FieldState (Signal Forms)
    const activeErrors = control.errors() as any[];
    const breachErr = activeErrors.find(
      (e) => e.kind === 'pwnedPasswordOccurrence' || e.pwnedPasswordOccurrence !== undefined,
    );
    errs = breachErr;
  } else {
    // It's an AbstractControl (Reactive Forms)
    errs = control?.errors;
  }
  return errs?.pwnedPasswordOccurrence ?? null;
}

export function passwordControl(fb: AnyFormBuilder) {
  return fb.control('', { validators: [Validators.required, Validators.minLength(8)] });
}

export function passwordInBreach(control: any) {
  return !!passwordBreachNumber(control);
}
