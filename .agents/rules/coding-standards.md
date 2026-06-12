# 🧱 PeopleCRM Workspace Rules

This rules file defines the coding guidelines, framework paradigms, and architecture standards for the PeopleCRM project. All agents working in this workspace must adhere strictly to these patterns.

---

## 📁 Repository Structure & Imports

* **Monorepo Architecture (Nx)**: Keep logic separated:
  * `apps/frontend/` – Angular single-page application.
  * `apps/backend/` – Fastify 5 + tRPC backend.
  * `common/` – Shared types, database definitions, and Zod validation schemas.
* **Path Aliases**: Never use relative paths to cross boundary boundaries. Use TypeScript compiler aliases:
  * `@common` → Shared models & schemas.
  * `@uxcommon/*` → Frontend shared assets, components, and directives.
  * `@icons/*` → Icon components.
  * `@experiences/*` → Feature domains.

---

## 🎨 Frontend Standards (Angular 22 + TailwindCSS v4 + DaisyUI v5)

* **Signals Everywhere**: Use Angular Signals for all state, inputs, outputs, derivations, side effects, and DOM queries:
  * Use `signal()`, `computed()`, `effect()`, `input.required()`, `output()`, and `viewChild()`.
  * **Avoid RxJS** except for true asynchronous data streams (e.g. ActivatedRoute query parameter subscriptions).
* **Dependency Injection**: Use class-level `inject()` calls. Do not use standard class constructors for injection.
* **Modern Control Flow**: Use native Angular control flow syntax (`@if`, `@for`, `@switch`, `@empty`) instead of legacy structural directives (`*ngIf`, `*ngFor`).
* **Signal-Based Forms**: 
  * Wrap form payloads in `form(payload, (p) => { ... })` from `@angular/forms/signals`.
  * Bind fields via `[formField]` and evaluate validity using `.invalid()`. Use native signal validators like `required` and `pattern`.
* **Icons**: 
  * Use `<pc-icon name="...">` (validated by `PcIconNameType`).
  * Do NOT use width/height utility classes on `<pc-icon>`. Use the `[size]` input instead (e.g., `[size]="4"`).
* **Loading States (`createLoadingGate`)**: 
  * Wrap all asynchronous API/tRPC requests in `createLoadingGate()` to prevent spinner flickering on fast loads (under 300ms).
  * Wrap async sequences in `const end = this._loading.begin(); try { ... } finally { end(); }`.
  * To prevent Flash of Unstyled Content (FOUT), design templates to check data existence (e.g., `@if (!detail())`) for initial skeletons, and use the `loading()` signal for disabling buttons and subsequent progress indicators.
* **Activity & Audit Logs**: Every page or component that modifies data must display an integrated activity log track at the bottom using `<pc-record-activities [entity]="..." [entityId]="...">`.
* **Toasts & Notifications**: Trigger user feedback alerts using `AlertService` (`.showSuccess()` / `.showError()`). Do not use raw window alerts or custom dialogs.

---

## ⚙️ Backend Standards (Fastify 5 + tRPC + Kysely)

* **API Endpoints**: 
  * Expose all internal client-server endpoints via tRPC routers.
  * Only use Fastify REST routes for external webhooks, file binary downloads/uploads, or when REST is explicitly required.
  * Throw standard `TRPCError` instances (e.g., `BAD_REQUEST`, `NOT_FOUND`) to return error statuses.
* **Type-Safe Database Access (Kysely)**:
  * Explicitly type payload operations with `OperationDataType<'table', 'insert' | 'update'>` and `Models`.
  * Always append `.returningAll()` or `.returning('id')` to insert/update queries.
  * Execute multi-table updates within database transactions:
    ```typescript
    await this.getRepo().transaction().execute(async (trx) => { ... });
    ```
* **Background Jobs**: Offload heavy or long-running tasks (e.g., SMTP emails, syncs, file cleanups) to the background queue by inserting job payloads into the `background_jobs` table inside database transactions.
* **Security & Hardening**:
  * Validate all inputs using Zod to block injection vulnerabilities.
  * Sanitize and scrub error messages to prevent backend schema or stack trace data leaks.

---

## 🎨 UI/UX & Design Guidelines

* **Visual Aesthetics**: Maintain a modern, flat, clean, and beautiful user interface that evokes confidence and professionalism.
* **Palette & Theme**: Use curated CSS custom property theme tokens (e.g. HSL tailored color variables) instead of raw default colors.
* **Tasteful Animations**:
  * Implement subtle, micro-animations for interface updates and view entries.
  * Use the custom structural `AnimateIf` directive to animate DOM entry and exit actions:
    ```html
    <div *pcAnimateIf="mySignal; enter: 'animate-left'; exit: 'animate-exit-right'">
      ...
    </div>
    ```
  * Leverage pre-defined transition utilities in `styles.css` (`.animate-up`, `.animate-down`, `.animate-left`, `.animate-right`, `.animate-drop`).
* **Grids & Data Presentation**:
  * Always use the `<pc-datagrid>` component for displaying datasets that require sorting, filtering, exporting, or inline edits.
  * Avoid building custom tables manually for complex grid configurations.
* **DaisyUI & CSS Over JS/Libraries**:
  * Prefer using native CSS transitions and DaisyUI components (e.g., `<pc-swap>`, DaisyUI's `swap` layout) rather than importing heavy third-party JavaScript animations or libraries.
  * Keep bundle sizes small by avoiding redundant dependencies if native styling or lightweight elements can achieve the target UI.

---

## 🧪 Quality & Verification Pipeline

* **ESLint & Formatting**: Run Prettier (`npx prettier --write`) and `nx lint` before committing. Ensure all local lint errors/warnings are resolved.
* **Build Verification**: Always run local builds to verify code compilation stability:
  * `npx nx build frontend`
  * `npx nx build backend`
* **Test Suites**: Verify modifications by running testing targets:
  * `npx nx test frontend`
  * `npx nx test backend`
  * `npx nx e2e`
