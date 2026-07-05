---
name: pplcrm-forms
description: "How the North Star 'living funnel' Forms experience works end-to-end — the web_forms lifecycle (draft/published/archived), the FormField model + normForm() email-identity invariant + creation templates, the two-mode forms-page (browse + live edit), form_submissions, the cross-tenant public /f/:slug page, and why donation forms stay on a separate path. USE WHEN editing anything under experiences/forms, the web-forms backend module, web_forms/form_submissions schema, the public form page, or reconciling forms with donations. EXAMPLES: 'add a field type to forms', 'why is the email field locked', 'the public /f/:slug page 404s', 'do donation forms show in the Forms page'."
---

# PeopleCRM Forms (living-funnel model)

A form is a **living page with a lifecycle**, not a static field editor. Status is the single source
of truth: `draft → published → archived` on `web_forms.status` (there is no boolean). The old
grid + form-editor model is gone; `forms-grid.ts` and `form-editor.ts` were deleted.

## The five product rules (resolve most design questions)

1. **Email is the identity key.** Every form always has an `email` field, always on + required. A
   submission upserts a person by email. Enforced server-side by `normForm()`, not just the UI.
2. **One verb per state transition.** Publish / Unpublish / Archive / Restore / Delete — five distinct
   tRPC mutations, never a status dropdown. Restore always lands in **draft** (reopening a link is a
   deliberate act).
3. **Archive, don't delete.** `deleteDraft` hard-rejects unless `status='draft' && submissions=0`;
   everything else is archived (public link → closed notice, data intact).
4. **Responses are people.** `form_submissions` (answers jsonb + `person_id` FK) is written inside the
   existing submit transaction; the Responses tab links each row to the person record.
5. **Types are chips, not nav.** `type ∈ signup|pledge|rsvp|request|survey` is a creation template +
   display chip. One Forms page.

## Where things live

- **Shared model** — `libs/common/src/lib/schemas/web-forms.schema.ts`: `FormFieldObj`
  (`{ key,label,type:'text'|'area'|'select'|'checks',options?,placeholder?,help?,on,required }`),
  `FORM_TEMPLATES`, `fieldsForTemplate(type)`, and **`normForm(rawFields)`** — the single source of
  truth that coerces stored JSON into a valid `FormField[]`, guarantees name+email exist, **forces
  email on+required**, and appends the standard optional catalog (mobile/street1/city/zip). Both API
  and editor call it, so the preview always matches what saves. New lifecycle schemas: `CreateFormObj`,
  `UpdateFormObj`, `FormSubmissionObj`. Legacy `AddWebFormObj`/`UpdateWebFormObj` still exist for the
  donation path.
- **Backend** — `apps/backend/src/app/modules/web-forms/`: `controller.ts` (lifecycle methods +
  `submitFormPublic` + `getPublicFormBySlug`), `repositories/web-forms.repo.ts`
  (`listForms`/`getFormSubmissions`/`countSubmissions`/`slugExists`/`getBySlugAnyTenant`),
  `trpc.router.ts` (`list`/`getForEdit`/`create`/`updateLive`/`publish`/`unpublish`/`archive`/
  `restore`/`deleteDraft`/`submissions`), `routes/web-forms-public.route.ts` (public REST:
  `GET /f/:slug` JSON config, `GET /view/:formId` + `POST /submit/:formId` server-rendered/submit,
  all under the `/api/forms` prefix).
- **Frontend** — `apps/frontend/src/app/experiences/forms/ui/`: `forms-page.ts/html` (the two-mode
  browse + live-edit shell), `form-render.ts` (read-only preview card, reused in the pane),
  `public-form.ts` (the unauthenticated `/f/:slug` page, registered in `app.routes.ts` — NOT the
  dashboard shell). `services/forms-service.ts` carries both the legacy grid contract and the new
  lifecycle methods.

## Non-obvious traps

- **Two field shapes coexist.** New forms store `FormField[]` objects; donation/older forms store the
  legacy `string[]` (`"mobile:required"`). Any code reading `web_forms.fields` must handle both — see
  the required-field validation in `submitFormPublic` and `normForm` (which silently drops non-object
  entries).
- **Donations are separate, on purpose.** `form_type ∈ donation|recurring_donation` keeps the legacy
  `add`/`update` path, the Stripe checkout in `submitFormPublic`, and the `/donation-pages`
  (fundraising) UI. `listForms` **filters donation types out**; `form_submissions` is **not** written
  for them. `type` (the template chip) is NULL for donation forms. Don't merge the two type sets.
- **`status` mapping.** The legacy add/update path accepts `active` and maps it to `published`
  (`mapLegacyStatus`), because the fundraising UI still sends `active`. The DB CHECK only allows
  `draft|published|archived`; the column default is `draft`.
- **Public `/f/:slug` resolves the tenant from the subdomain, then scopes the form lookup.** Form slug
  is unique **per tenant**; the tenant is identified by the Host (`<tenantSlug>.<baseDomain>`, base from
  `env.publicFormsBaseDomain` / `environment.publicFormsBaseDomain`, default `localhost` in dev). The
  route reads `?t=<tenantSlug>` (the SPA passes its own subdomain — robust across hosts) or falls back
  to `tenantSlugFromHost(req.hostname)`, resolves it via `getTenantIdBySlug` (the `tenants` table is
  tenant-safety allow-listed), then calls the **tenant-scoped** `getBySlugPublic(tenantId, slug)`. There
  is no cross-tenant form query — do not reintroduce one. Tenant slugs are DNS-safe, globally unique,
  generated at signup (`createTenant` → `generateTenantSlug`, `@common/slugifyHandle` +
  `RESERVED_SUBDOMAINS`), exposed to the SPA via `currentUser.tenant_slug`, and used to build the
  public URL in `forms-page` (`https://<tenantSlug>.<baseDomain>/f/<formSlug>`). Ships behind wildcard
  DNS + cert; in dev, `<slug>.localhost` works in Chrome.
- **`full_name` split.** New forms collect one `full_name`; `submitFormPublic` splits it on the last
  space into first/last so the person record still gets a name. The person model has no full_name.
- **Live edit has no Save.** `forms-page` debounces `forms.updateLive`; every control mutates
  immediately and the preview re-renders. The confirmation-email + embed dialogs are the exceptions
  (explicit Save / Copy).

## After changes

Update the Forms Help Center article (`experiences/help/data/articles/engagement.ts`, id `forms`) and
run `npx vitest run src/app/experiences/help`. Then the `pplcrm-quality-gate` pipeline. Schema changes
go through `pplcrm-migrations`; new queries through `pplcrm-tenant-safety`.
