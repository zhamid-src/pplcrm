---
name: pplcrm-angular-components
description: "Conventions for building component-internal state, forms, loading, and icons in the Angular 22 frontend (signals-only, the form() signal-forms helper, createLoadingGate, pc-icon). USE WHEN adding or editing a component under apps/frontend/src/app/**, wiring an add/edit form, gating a spinner on a tRPC call, or placing a pc-icon. EXAMPLES: 'why is my form always invalid', 'the spinner flickers on fast responses', 'what values can pc-icon name take'."
---

# PeopleCRM Angular Component Conventions

Component-internal conventions only: state, forms, loading gates, icons. For page assembly
(detail-layout, breadcrumbs, record nav, activity log placement) see `pplcrm-page-layout-ux`.
For the Zod `AddXObj`/`UpdateXObj` triad that feeds these forms see `pplcrm-schemas-validation`.

Canonical live reference for everything below:
`apps/frontend/src/app/experiences/users/ui/user-edit.ts` and `.html`.

## `form()` is Angular's signal-forms API, not a project helper

`form()` and every validator come from `@angular/forms/signals` — nothing form-related is
defined in this repo:

```ts
// user-edit.ts
import { form, required, email, disabled } from '@angular/forms/signals';
```

The same module also provides `submit`, `minLength`, `pattern`, `validate`,
`validateStandardSchema`, and the `FormField` type — import them, do not hand-roll them.

## Form pattern: signal payload → `form()` → `[formField]` → `.invalid()`

Three moving parts. From `user-edit.ts`:

```ts
// 1. A plain signal holding the raw payload
protected readonly payload = signal({
  email: '',
  first_name: '',
  last_name: '',
  role: '',
  verified: false,
});

// 2. form() wraps the signal; the schema fn wires validators per field
protected readonly form = form(this.payload, (p) => {
  required(p.email);
  email(p.email);
  required(p.first_name);
  disabled(p.role, () => this.currentUserRole() === 'admin' && this.isOwnerBeingEdited());
  disabled(p.verified, () => true);
});
```

Bind each field in the template with `[formField]` — pass the **field node** (`form.email`, no
call parens), not the payload value. From `user-edit.html`:

```html
<pc-input label="Email" type="email" [formField]="form.email"></pc-input>
<pc-select label="Role" [formField]="form.role"> ... </pc-select>
<pc-toggle label="Verified account" [formField]="form.verified"></pc-toggle>
```

`pc-input`/`pc-select`/`pc-toggle` (under `libs/uxcommon/src/components/`) already render the
field's error state — they read `formField()().invalid()` and `.errors()` internally (see
`input.ts`), so you do not write per-field error markup yourself.

Validate on submit by **calling** the form to get its root state. From `user-edit.ts`:

```ts
this.form().markAsTouched(); // force-show validation before first blur
if (this.form().invalid() || !this.id()) return;
// ... after a successful save:
this.form().reset(); // clears dirty/touched, re-syncs to payload
```

Gotcha: `[formField]="form.email"` in the template is the field node (no parens), but in
TypeScript you **call** it — `this.form()` gives the root field state exposing `.invalid()`,
`.markAsTouched()`, `.reset()`. Forgetting the `()` in TS is the usual "why won't `.invalid()`
resolve" mistake.

## Loading gate: suppress spinner flicker on sub-300ms responses

`createLoadingGate()` (`libs/uxcommon/src/loading-gate.ts`) returns `{ begin, visible }`.
`begin()` returns a disposer; the spinner only appears if the work outlasts `delay` (default
300ms) and, once shown, stays at least `minDuration` (default 300ms). This is why you must use
its begin/end contract instead of a naked boolean signal.

Wire-up and call site from `user-edit.ts`:

```ts
import { createLoadingGate } from '@uxcommon/loading-gate';

private readonly _loading = createLoadingGate();
protected readonly loading = this._loading.visible;   // signal<boolean> for the template

private async load() {
  const end = this._loading.begin();
  this.error.set(null);
  try {
    const user = await this.users.getById(this.id());
    this.detail.set(user);
    // ...
  } finally {
    end();                     // ALWAYS in finally — a skipped end() = stuck spinner
  }
}
```

`end()` in `finally` is mandatory. It is idempotent (guarded by an internal `done` flag), so
calling it twice is safe; never calling it leaves `pendingCount` above zero and the gate never
hides. Note: `loading` gates the initial skeleton; use a separate `saving`/`resettingPassword`
boolean signal (see `user-edit.ts`) to disable buttons during in-progress actions — don't reuse
the gate for both.

## pc-icon: required `name`, integer `[size]` only

`libs/uxcommon/src/components/icons/icon.ts`:

- `name` is `input.required<PcIconNameType>()` — required, and must be a valid `PcIconNameType`.
- `size` is `input<number>(6)`, default 6.

`PcIconNameType = keyof typeof icons`. The `icons` object has many entries — do **not**
memorize or paste a subset here, it will rot. Read the live list in
`libs/uxcommon/src/components/icons/icons.index.ts` (mostly Heroicons; `unknown` is the
fallback). A bad name silently falls back to the `unknown` icon.

Whole integers only for `[size]`. The size renders as Tailwind classes `w-${size} h-${size}`,
so `[size]="4"` → `w-4 h-4`. Do not pass decimals (`[size]="3.5"`) and do not put
width/height/`size-*` utilities on `<pc-icon>` — its class-scrubber strips them. Real usage:
`<pc-icon name="lock-closed"></pc-icon>` (`user-edit.html`).

## Signals-only state, `inject()` at the field level

No `Subject`/`BehaviorSubject`/manual subscriptions for state. Use `signal()`, `computed()`,
`effect()`, `input.required()`, `output()`. Inject dependencies as class fields with `inject()`,
never via the constructor. From `user-edit.ts`:

```ts
readonly id = input.required<string>();                      // required input

private readonly alerts = inject(AlertService);              // field-level inject()
private readonly users = inject(UserAdminService);

protected readonly detail = signal<IAuthUserDetail | null>(null);
protected readonly currentUserRole = computed(() => this.auth.getUser()?.role);
```

Reserve the constructor for `effect()` wiring, and use `untracked()` inside an effect when the
body should not re-subscribe to signals it reads (see the effect in `user-edit.ts`).

## Non-goals

- Page composition — `pc-detail-header`, `pc-breadcrumbs`, `<pc-record-activities>`, record
  prev/next nav, AlertService-vs-confirm-dialog decisions: **`pplcrm-page-layout-ux`**.
- The Zod `AddXObj`/`UpdateXObj` schema triad the payload maps to: **`pplcrm-schemas-validation`**.
- tRPC procedure/service wiring behind `this.users.getById(...)`: **`pplcrm-trpc-backend`**.
- After changes, run the checks in **`pplcrm-quality-gate`** and then `/verify`.
