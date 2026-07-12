// Password breach utilities for signal-forms fields.
//
// Callers (signup-page, new-password-page) pass a called field node —
// `this.form.password()` — i.e. the FieldState. The structural type below is
// the slice of FieldState we read, so this file does not depend on the
// experimental signal-forms types directly.

type BreachError = { kind: string; pwnedPasswordOccurrence?: number };
type BreachFieldState = { errors: () => BreachError[] };

/** How many times the candidate password appears in known breaches, or null if none. */
export function passwordBreachNumber(field: BreachFieldState): number | null {
  const breachErr = field
    .errors()
    .find((e) => e.kind === 'pwnedPasswordOccurrence' || e.pwnedPasswordOccurrence !== undefined);
  return breachErr?.pwnedPasswordOccurrence ?? null;
}

export function passwordInBreach(field: BreachFieldState): boolean {
  return (passwordBreachNumber(field) ?? 0) > 0;
}
