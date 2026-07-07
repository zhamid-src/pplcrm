# Forms — Implementation Plan (repo `main` → North Star prototype)

**For:** Opus implementing in `zhamid-src/pplcrm`.
**Prototype reference:** `PeopleCRM North Star.dc.html` → Forms screen (sidebar → CAMPAIGN → Forms). Open it and click around before writing code — every behavior described here is live in it, including edge states (drafts, archived, empty responses).
**Companion docs:** `DIRECTION-FOR-OPUS.md` (overall gaps + UX principles), `UX-GUIDELINES.md` (idioms: toasts, chips, coach-don't-block validation).

---

## 0. The model shift, in one paragraph

Today the repo has a form _editor_ (`experiences/forms/ui/form-editor.ts`) that saves field definitions, and a grid. The North Star treats a form as a **living funnel with a lifecycle**: draft → published → archived, with a public page, live-editable fields, responses that ARE people (not a separate table you browse), per-form audience wiring (lists + tags), a confirmation email, and distribution (link + embed). There is deliberately **no separate builder page** — settings edit the live form beside its preview.

Key product rules (these resolve most design questions during implementation):

1. **Email is the identity key.** Every form has an email field, always on, always required. A submission upserts a person by email. Clicking the locked Required pill explains this instead of refusing silently.
2. **One verb per state transition.** Publish / Unpublish / Archive / Restore / Delete are five distinct buttons shown contextually — never a status dropdown.
3. **Archive, don't delete.** A form with ≥1 submission can only be archived (public link → "closed" notice; data intact). Delete exists ONLY for zero-response drafts, behind a confirm dialog.
4. **Responses are windows onto People.** The Responses tab lists submissions, but each row links to the person record. Submissions store answers + a person FK; they are not a parallel contact store.
5. **Types are chips, not nav.** Signup / Pledge / RSVP / Request / Survey are creation templates + a display chip. One Forms page. (The old Shifts/Events/Fundraising nav items are gone — see DIRECTION doc.)

---

## 1. Data model (backend first)

### 1.1 `forms` table — extend (migration)

Current schema (`libs/common/src/lib/schemas/web-forms.schema.ts`) has name + fields. Add:

| column                             | type                                                 | default                 | notes                                                     |
| ---------------------------------- | ---------------------------------------------------- | ----------------------- | --------------------------------------------------------- |
| `status`                           | enum `draft \| published \| archived`                | `draft`                 | replaces any boolean; single source of truth              |
| `type`                             | enum `signup \| pledge \| rsvp \| request \| survey` | —                       | set at creation from template; display-only afterward     |
| `slug`                             | text, unique per tenant                              | slugified name          | public URL key; generate on create, keep stable on rename |
| `description`                      | text                                                 | ''                      | public-page intro paragraph                               |
| `submit_label`                     | text                                                 | from template           | button text ("Sign me up")                                |
| `redirect_url`                     | text                                                 | ''                      | blank = show thank-you card                               |
| `thanks_title` / `thanks_body`     | text                                                 | template defaults       | thank-you card copy                                       |
| `confirm_email_on`                 | bool                                                 | true                    |                                                           |
| `confirm_subject` / `confirm_body` | text                                                 | seeded from thanks copy | supports `[First name]` merge token                       |
| `notify_team_on`                   | bool                                                 | false                   | emails admins per response                                |
| `list_ids`                         | int[] (or join table)                                | []                      | lists responses join                                      |
| `tags`                             | text[]                                               | []                      | tags applied to responders                                |
| `archived_at`                      | timestamptz                                          | null                    |                                                           |

### 1.2 Field config — inside `fields` JSON

Each field: `{ key, label, type: 'text'|'area'|'select'|'checks', options?, placeholder?, help?, on: bool, required: bool }`.

- Every form's field list = its own fields **plus a standard optional catalog** (mobile, address, city, zip) with `on:false` — so the editor can offer "turn on Street address" for any form without schema work. See `normForm()` in the prototype logic class for the exact merge.
- Server-side invariant: the `email` field cannot be `on:false` or `required:false`. Enforce in the mutation, not just UI.

### 1.3 `form_submissions` table — new

`id, tenant_id, form_id FK, person_id FK, answers jsonb, created_at`. Plus `submission_count` denormalized on forms (or a count query) for list badges.

### 1.4 tRPC endpoints (`FormsController` / router)

- `forms.list` — active + archived, with submission counts.
- `forms.create({ name, type })` — builds fields from template (see §3.4), returns draft.
- `forms.update(id, patch)` — name/desc/fields/toggles/lists/tags/redirect/confirm email. Reject email-field violations.
- `forms.publish(id)` / `forms.unpublish(id)` / `forms.archive(id)` / `forms.restore(id)` — restore lands in `draft`, NOT published (deliberate: reopening a link is always an explicit act).
- `forms.delete(id)` — hard 400 unless `status='draft' && submissions=0`.
- `forms.submissions(id, cursor)` — paginated, joined with person name.
- `forms.exportCsv(id)` — or assemble client-side from submissions.
- **Public, unauthenticated:** `GET /f/:slug` (render or JSON for the public page) and `POST /f/:slug/submit`. Submit pipeline: validate required → upsert person by email → write submission → apply tags (`Source: <form name>` system tag + form's tags) → join lists → send confirmation email if on → notify team if on. Published forms only; archived/draft slugs return the "closed" page (200, friendly copy — see prototype's archived preview).

---

## 2. Frontend structure

Angular, `apps/frontend/src/app/experiences/forms/`. The screen has **two modes** — this is the core UX change; get it right before polishing anything:

### 2.1 Browse mode (default)

- Header: "Forms" + count sentence (`N forms · M submissions in the last 30 days · K archived`) + primary **New form**.
- Left rail (320px): form cards — name, **type chip** (outline, quiet) + **status chip** (Published=success / Draft=neutral), "218 submissions · Updated May 12". Selected card = primary border + 6% primary tint.
- Below the cards: **"Archived (N)"** disclosure (chevron rotates open) revealing archived cards at ~78% opacity.
- Right: the preview card (§2.3).

### 2.2 Edit mode (was "settings" — framed as navigation, not a toggle)

- Entered via **"Edit form"** (pencil icon) in the preview toolbar, or automatically after creating a new form.
- The form list and page header **disappear**. New header: "‹ All forms" back link, form name as H1 with a blue **"Editing"** chip, subtitle _"Changes apply to the live form instantly — nothing to save."_, and a primary **"Done editing"** button.
- Layout: settings column (340px) + live public preview. Below ~980px viewport, settings stack above the preview and its sections reflow into a multi-column grid.
- **No save button anywhere.** Every control mutates immediately (debounced `forms.update`); the preview re-renders live. This is the whole point of the design.

Settings column sections (order matters):

1. **FORM** — name, public description, redirect-after-submit URL (helper: "Blank shows the thank-you card on the right").
2. **AFTER SUBMIT** — two switches: Confirmation email (with an "Edit the confirmation email" link underneath when on → dialog: subject + body textarea + `[First name]` merge note, Save/Cancel) and Notify the team.
3. **FIELDS** — checkbox list. Row = checkbox + label + **Required/Optional pill** (click toggles; filled-primary when Required). Email row: checkbox disabled, pill locked; clicking the pill fires a toast explaining why. Unchecking a field also clears its `required`. Footer note: "Every response creates or updates a person either way."
4. **AUDIENCE** — "Add responses to a list" select → removable outline chips; tag input (Enter or Add button, normalize to kebab-case, dedupe with toast) → removable primary-tint chips; note showing the automatic `Source: <form name>` system tag in a mono chip.
5. **ARCHIVE** — explainer text that adapts (`fCanDel` in prototype): archivable-only vs deletable-draft. Buttons: outline **Archive form**, and **Delete draft** (error-outline) only when eligible → confirm dialog ("has no responses… can't be undone — archiving is the reversible option", error-filled confirm).

### 2.3 Preview card (both modes, right side)

Top-to-bottom:

1. **Actions row** — segmented **Form | Responses** tabs (Responses carries a count badge) on the left; on the right: Edit form (browse mode only) + the status verb: Publish (primary, drafts) / Unpublish (outline, published) / Restore (primary, archived).
2. **Public link row** — its own bar (subtle bg): `PUBLIC LINK` kicker, full URL in mono (ellipsize), then three icon buttons: **open in new tab**, **copy link**, **`</>` embed** (§2.6). All three dim with reason-tooltips on drafts ("Publish the form to get a live page") and archived forms.
3. **State banner** — draft: info-tint "Draft — only your team can see this preview. Publish to accept responses." / archived: neutral-tint "Archived — the public link shows a closed notice. Restore to edit or publish again."
4. **Form tab** — the rendered public form on a desk-gray backdrop: 440px card, org avatar + name, title, description, fields (labels get ` *` when required), submit button. Fully interactive: inline required-validation on submit (error border + icon + message per field, clears on input), thank-you card with a "Submit another test response" link, and a toast clarifying **test submissions don't count toward totals**. Archived forms render the "This form is closed" card instead.
5. **Responses tab** — table: Person (underlined link → person record) / Submitted / Answers (one-line highlight, e.g. "Weekend canvasses · Event day" — derive from 1-2 non-identity answers), "Showing latest N of M", **Export CSV** button, footer note "Each response created or updated a person, applied the form's tags and joined its lists." Empty states differ by status: draft ("Publish the form to open the link…"), published ("Share the link to start collecting…"), archived ("…responses stayed on people's records").

### 2.4 New form dialog

Name (required — coach inline + focus on miss, never disable the button) + **"Start from"** template select where each option lists its fields: `Signup — name, email, availability`, `Pledge — name, email, amount`, `RSVP — name, email, seats`, `Request — name, email, address, notes`, `Survey — name, issues, open answer`. Create → draft with template fields (all templates start from name+email), select it, **enter edit mode directly**, toast "Draft created from the X template — adjust its fields, then publish."

### 2.5 Public page (`/f/:slug`)

Standalone route, no app chrome: the same 440px card. Same validation UX. On success: redirect if `redirect_url`, else thank-you card. Unpublished/archived slug → closed card ("The <org> isn't taking new responses here" + contact line).

### 2.6 Embed dialog

`</>` icon → dialog with segmented **Embed (iframe) | Raw HTML form**, a `<pre>` code block, per-mode note, **Copy code**. iframe = fixed src/width/height/title snippet. Raw HTML = generated from the form's **current enabled fields** (inputs/textareas/selects/checkbox fieldsets, `required` attrs, `action=".../f/slug/submit" method="POST"`) — regenerate on open so it always matches. Copy the generator logic from the prototype's `ebCode` IIFE verbatim.

---

## 3. Migration & sequencing

Phase 1 — schema + API (§1) with the status enum and submission pipeline. Migrate existing forms: `status = 'published'` if currently live else `'draft'`; generate slugs; seed confirm copy from name.
Phase 2 — browse mode + preview card + publish/unpublish (replaces the current grid + editor entry).
Phase 3 — edit mode with live-editing settings (retire the old form-editor page; port anything reusable into the FIELDS section).
Phase 4 — responses tab + CSV + public page + submission pipeline end-to-end.
Phase 5 — archive/restore/delete, confirmation-email dialog, embed dialog.

Each phase ships independently; don't hold Phase 2 for 5.

## 4. Acceptance checklist (test against the prototype)

- [ ] Creating "June phone bank signup" from Signup template lands me in edit mode on a draft with name/email/mobile-off/availability fields.
- [ ] Checking "Street address" in FIELDS makes it appear in the preview immediately; its Optional pill click makes it Required and adds `*` + validation.
- [ ] Email's checkbox is disabled; clicking its Required pill toasts the explanation.
- [ ] Draft: link icons dimmed with tooltips; Publish → link row activates, banner clears, toast names the form.
- [ ] Submitting the preview with empty required fields: per-field inline errors, nothing submitted; valid test submit → thank-you card + "doesn't count" toast; Responses count unchanged.
- [ ] Real POST to `/f/slug/submit` creates/updates a person by email, applies `Source:` tag + form tags, joins lists, appears in Responses linking to that person.
- [ ] Archiving a published form: link → closed page, form moves under "Archived (N)", Restore returns it as a _draft_.
- [ ] Delete is only offered on zero-response drafts and confirms first; a form with submissions never shows Delete.
- [ ] Confirmation email edits persist per form; `[First name]` renders from the response.
- [ ] Raw-HTML embed snippet reflects current fields, including `required` attributes.
- [ ] Every mutation fires a toast that names what happened ("Published 'X' — the link now accepts responses"), per UX-GUIDELINES.
