import { FormBuilder, NonNullableFormBuilder, Validators } from '@angular/forms';

// Consolidated form control builders and password breach utilities
export type AnyFormBuilder = FormBuilder | NonNullableFormBuilder;

/**
 * Creates a standard email form control with required and email validators.
 */
export function emailControl(fb: AnyFormBuilder) {
  return fb.control('', { validators: [Validators.required, Validators.email] });
}

/**
 * Returns the number of times the provided control's value was found in data breaches.
 */
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

/**
 * Creates a password form control with required and minimum length validators.
 */
export function passwordControl(fb: AnyFormBuilder) {
  return fb.control('', { validators: [Validators.required, Validators.minLength(8)] });
}

/**
 * Indicates whether the provided control's value appears in known data breaches.
 */
export function passwordInBreach(control: any) {
  return !!passwordBreachNumber(control);
}
