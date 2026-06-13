---
trigger: always_on
---

# 🎨 PeopleCRM Frontend Standards (Angular 22 + TailwindCSS v4 + DaisyUI v5)

This rules file defines the UI/UX standards, components, and state management guidelines for the frontend application.

---

- **Signals Everywhere**: Use Angular Signals for all state, inputs, outputs, derivations, side effects, and DOM queries:
  - Use `signal()`, `computed()`, `effect()`, `input.required()`, `output()`, and `viewChild()`.
  - **Avoid RxJS** except for true asynchronous data streams (e.g. ActivatedRoute query parameter subscriptions).
- **Dependency Injection**: Use class-level `inject()` calls. Do not use standard class constructors for injection.
- **Modern Control Flow**: Use native Angular control flow syntax (`@if`, `@for`, `@switch`, `@empty`) instead of legacy structural directives (`*ngIf`, `*ngFor`).
- **Signal-Based Forms**:
  - Wrap form payloads in `form(payload, (p) => { ... })` from `@angular/forms/signals`.
  - Bind fields via `[formField]` and evaluate validity using `.invalid()`. Use native signal validators like `required` and `pattern`.
- **Icons**:
  - Use `<pc-icon name="...">` (validated by `PcIconNameType`).
  - Do NOT use width/height utility classes on `<pc-icon>`. Use the `[size]` input instead (e.g., `[size]="4"`).
  - Do use full integers with <pc-icon [size]>, instead of decimals (eg. do NOT use [size]="3.5)
- **Loading States (`createLoadingGate`)**:
  - Wrap all asynchronous API/tRPC requests in `createLoadingGate()` to prevent spinner flickering on fast loads (under 300ms).
  - Wrap async sequences in `const end = this._loading.begin(); try { ... } finally { end(); }`.
  - To prevent Flash of Unstyled Content (FOUT), design templates to check data existence (e.g., `@if (!detail())`) for initial skeletons, and use the `loading()` signal for disabling buttons and subsequent progress indicators.
- **Activity & Audit Logs**: Every page or component that modifies data must display an integrated activity log track at the bottom using `<pc-record-activities [entity]="..." [entityId]="...">`.
- **Toasts & Notifications**: Trigger user feedback alerts using `AlertService` (`.showSuccess()` / `.showError()`). Do not use raw window alerts or custom dialogs.
- **DIALOG**: Use our dialog for confirmation, not the browser dialog.
