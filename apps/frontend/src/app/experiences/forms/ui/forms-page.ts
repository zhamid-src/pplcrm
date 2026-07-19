import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import type { PcIconNameType } from '@icons/icons.index';
import { CdkDrag, CdkDragHandle, CdkDragPlaceholder, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FORM_TEMPLATES, FormField, FormType, UpdateFormType, debounce } from '../../../../../../../libs/common/src';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { EmptyState } from '@uxcommon/components/empty-state/empty-state';
import { ModalShell } from '@uxcommon/components/modal-shell/modal-shell';
import { Table } from '@uxcommon/components/table/table';
import { Icon } from '@icons/icon';
import { ListsService } from '@experiences/lists/services/lists-service';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { GridHeaderComponent } from '@uxcommon/components/grid-header/grid-header';
import { AuthService } from '../../../auth/auth-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { FormDetail, FormSubmissionRow, FormsService } from '../services/forms-service';
import { FormRenderComponent } from './form-render';
import { SettingsService } from '@experiences/settings/services/settings-service';
import { environment } from '../../../../environments/environment';
import { publicPageUrl } from '../../../shared/public-pages';
import { StatusBadge } from '@uxcommon/components/status-badge/status-badge';

interface TemplateCard {
  type: FormType;
  icon: PcIconNameType;
  title: string;
  description: string;
}

/** Step-1 cards that leave the Forms flow for a dedicated builder (fundraising/event/shift). */
interface BuilderCard {
  icon: PcIconNameType;
  title: string;
  description: string;
  cta: string;
  route: string;
}

const DEFAULT_TEMPLATE_CARD: TemplateCard = {
  type: 'signup',
  icon: 'user-plus',
  title: 'Signup',
  description: 'Name, email, phone and availability. Grow your volunteer roster.',
};

/** Step-1 cards of the New-form flow — same card idiom as the automation trigger picker. */
const TEMPLATE_CARDS: readonly TemplateCard[] = [
  DEFAULT_TEMPLATE_CARD,
  {
    type: 'pledge',
    icon: 'banknotes',
    title: 'Pledge',
    description: 'Name, email and an amount. Collect commitments to give.',
  },
  {
    type: 'rsvp',
    icon: 'ticket',
    title: 'RSVP',
    description: 'Name, email and seats. Count heads before an event.',
  },
  {
    type: 'request',
    icon: 'map-pin',
    title: 'Request',
    description: 'Name, email, address and notes. Take requests like yard signs.',
  },
  {
    type: 'survey',
    icon: 'chat-bubble-bottom-center-text',
    title: 'Survey',
    description: 'Name, issues and an open answer. Hear what people think.',
  },
];

const BUILDER_CARDS: readonly BuilderCard[] = [
  {
    icon: 'document-currency-dollar',
    title: 'Fundraising form',
    description: 'A public giving page with preset amounts. Donations create donor records.',
    cta: 'Create a fundraising form',
    route: '/donation-pages/add',
  },
  {
    icon: 'ticket',
    title: 'Event page',
    description: 'An event with its own public page. RSVPs and attendance in one place.',
    cta: 'Create an event page',
    route: '/events/pages/add',
  },
  {
    icon: 'add-schedule',
    title: 'Volunteer shift',
    description: 'A signup slot with a time and place. Hours land on volunteer profiles.',
    cta: 'Create a volunteer shift',
    route: '/events/shifts/add',
  },
];

@Component({
  selector: 'pc-forms-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    StatusBadge,
    Icon,
    FormRenderComponent,
    RouterLink,
    NgTemplateOutlet,
    DatePipe,
    Table,
    GridHeaderComponent,
    EmptyState,
    ModalShell,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
  ],
  templateUrl: './forms-page.html',
})
export class FormsPageComponent implements OnInit {
  private readonly formsSvc = inject(FormsService);
  private readonly listsSvc = inject(ListsService);
  private readonly router = inject(Router);
  private readonly settings = inject(SettingsService);
  private readonly alerts = inject(AlertService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly auth = inject(AuthService);

  private readonly _loading = createLoadingGate();
  protected readonly loading = this._loading.visible;

  protected readonly forms = signal<FormDetail[]>([]);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly mode = signal<'browse' | 'edit' | 'create'>('browse');
  protected readonly tab = signal<'form' | 'responses'>('form');
  protected readonly archivedOpen = signal(false);
  protected readonly mutating = signal(false);
  protected readonly orgName = signal('Your organization');
  protected readonly lists = signal<{ id: string; name: string }[]>([]);

  protected readonly submissions = signal<FormSubmissionRow[]>([]);
  protected readonly submissionsTotal = signal(0);
  protected readonly submissionsLoading = signal(false);

  // New-form flow state (mode 'create': step 1 picks a template card, step 2 names it).
  protected readonly newFormName = signal('');
  protected readonly newFormType = signal<FormType>('signup');
  protected readonly newFormStep = signal<1 | 2>(1);
  protected readonly newFormError = signal<string | null>(null);
  protected readonly creating = signal(false);
  private readonly embedDialog = viewChild<ModalShell>('embedDialog');
  private readonly confirmEmailDialog = viewChild<ModalShell>('confirmEmailDialog');

  protected readonly templateCards = TEMPLATE_CARDS;
  protected readonly builderCards = BUILDER_CARDS;
  protected readonly chosenTemplate = computed(
    () => TEMPLATE_CARDS.find((c) => c.type === this.newFormType()) ?? DEFAULT_TEMPLATE_CARD,
  );

  protected readonly selected = computed(() => this.forms().find((f) => f.id === this.selectedId()) ?? null);
  protected readonly activeForms = computed(() => this.forms().filter((f) => f.status !== 'archived'));
  protected readonly archivedForms = computed(() => this.forms().filter((f) => f.status === 'archived'));

  protected readonly totalSubmissions = computed(() =>
    this.forms().reduce((sum, f) => sum + (f.submission_count ?? 0), 0),
  );

  protected readonly countSentence = computed(() => {
    const total = this.forms().length;
    const subs = this.totalSubmissions();
    const archived = this.archivedForms().length;
    const parts = [
      `${total} ${total === 1 ? 'form' : 'forms'}`,
      `${subs} ${subs === 1 ? 'submission' : 'submissions'}`,
    ];
    if (archived > 0) parts.push(`${archived} archived`);
    return parts.join(' · ');
  });

  protected readonly publicUrl = computed(() => {
    const form = this.selected();
    if (!form?.slug) return '';
    return publicPageUrl(this.auth.getUser()?.tenant_slug, `f/${form.slug}`);
  });

  private readonly saveDebounced = debounce(() => void this.flushPatch(), 400);
  private pendingPatch: UpdateFormType = {};

  public ngOnInit(): void {
    void Promise.all([this.loadForms(), this.loadOrg(), this.loadLists()]);
  }

  // ── Loading ────────────────────────────────────────────────────────────

  private async loadForms(): Promise<void> {
    const end = this._loading.begin();
    try {
      const rows = await this.formsSvc.listForms();
      this.forms.set(rows);
      const first = rows[0];
      if (!this.selectedId() && first) {
        this.selectedId.set(first.id);
      }
    } catch {
      this.alerts.showError('Could not load your forms. Please try again.');
    } finally {
      end();
    }
  }

  private async loadOrg(): Promise<void> {
    try {
      await this.settings.load();
      const name = this.settings.getValue<string>('organization.name', '');
      if (name) this.orgName.set(name);
    } catch {
      /* org name is decorative; fall back to the default */
    }
  }

  private async loadLists(): Promise<void> {
    try {
      const res = await this.listsSvc.getAllWithCounts();
      const rows = (res?.rows ?? []) as Array<Record<string, unknown>>;
      this.lists.set(rows.map((r) => ({ id: String(r['id']), name: String(r['name'] ?? '') })));
    } catch {
      /* audience list picker degrades gracefully to empty */
    }
  }

  // ── Selection / navigation ─────────────────────────────────────────────

  protected select(id: string): void {
    // Donation forms live in this list but keep their Stripe-backed editor and /d/:slug public page.
    // Selecting one hands off to the fundraising editor instead of the living-funnel inline pane.
    const form = this.forms().find((f) => f.id === id);
    if (form && this.isDonationForm(form)) {
      void this.router.navigate(['/donation-pages', id]);
      return;
    }
    if (this.selectedId() === id) return;
    this.selectedId.set(id);
    this.tab.set('form');
    this.submissions.set([]);
    this.submissionsTotal.set(0);
  }

  protected setTab(tab: 'form' | 'responses'): void {
    this.tab.set(tab);
    if (tab === 'responses') void this.loadSubmissions();
  }

  protected enterEdit(): void {
    if (!this.selected()) return;
    this.mode.set('edit');
    this.tab.set('form');
  }

  protected exitEdit(): void {
    this.mode.set('browse');
  }

  protected toggleArchived(): void {
    this.archivedOpen.update((v) => !v);
  }

  // ── Status verbs ───────────────────────────────────────────────────────

  protected async publish(): Promise<void> {
    await this.runVerb(
      (id) => this.formsSvc.publish(id),
      (f) => `Published “${f.name}”. The link now accepts responses.`,
    );
  }

  protected async unpublish(): Promise<void> {
    await this.runVerb(
      (id) => this.formsSvc.unpublish(id),
      (f) => `Unpublished “${f.name}”. The public link is paused.`,
    );
  }

  protected async archiveForm(): Promise<void> {
    await this.runVerb(
      (id) => this.formsSvc.archive(id),
      (f) => `Archived “${f.name}”. The public link now shows a closed notice.`,
    );
    this.mode.set('browse');
  }

  protected async restore(): Promise<void> {
    await this.runVerb(
      (id) => this.formsSvc.restore(id),
      (f) => `Restored “${f.name}” as a draft.`,
    );
  }

  private async runVerb(
    action: (id: string) => Promise<FormDetail>,
    message: (f: FormDetail) => string,
  ): Promise<void> {
    const id = this.selectedId();
    if (!id || this.mutating()) return;
    this.mutating.set(true);
    try {
      const updated = await action(id);
      this.replaceForm(updated);
      this.alerts.showSuccess(message(updated));
    } catch {
      this.alerts.showError('That action didn’t go through. Please try again.');
    } finally {
      this.mutating.set(false);
    }
  }

  // ── New form flow (create mode) ────────────────────────────────────────

  protected openNewForm(): void {
    this.newFormName.set('');
    this.newFormType.set('signup');
    this.newFormStep.set(1);
    this.newFormError.set(null);
    this.mode.set('create');
  }

  protected cancelNewForm(): void {
    this.mode.set('browse');
  }

  protected selectTemplate(type: FormType): void {
    this.newFormType.set(type);
    this.newFormError.set(null);
    this.newFormStep.set(2);
  }

  protected backToTemplates(): void {
    this.newFormStep.set(1);
  }

  protected openBuilder(card: BuilderCard): void {
    void this.router.navigateByUrl(card.route);
  }

  protected async createForm(): Promise<void> {
    const name = this.newFormName().trim();
    if (!name) {
      this.newFormError.set('Give your form a name so you can find it later.');
      return;
    }
    if (this.creating()) return;
    this.creating.set(true);
    try {
      const type = this.newFormType();
      const created = await this.formsSvc.createForm({ name, type });
      this.forms.update((list) => [created, ...list]);
      this.selectedId.set(created.id);
      this.mode.set('edit');
      this.tab.set('form');
      this.alerts.showSuccess(
        `Draft created from the ${this.chosenTemplate().title} template. Adjust its fields, then publish.`,
      );
    } catch {
      this.newFormError.set('Could not create the form. Please try again.');
    } finally {
      this.creating.set(false);
    }
  }

  // ── Live editing (debounced patch) ─────────────────────────────────────

  protected editName(value: string): void {
    this.patch({ name: value });
  }

  protected editDescription(value: string): void {
    this.patch({ description: value });
  }

  protected editRedirect(value: string): void {
    this.patch({ redirect_url: value });
  }

  protected editSubmitLabel(value: string): void {
    this.patch({ submit_label: value });
  }

  protected toggleConfirmEmail(on: boolean): void {
    this.patch({ confirm_email_on: on });
  }

  protected toggleNotifyTeam(on: boolean): void {
    this.patch({ notify_team_on: on });
  }

  protected toggleField(key: string, on: boolean): void {
    const form = this.selected();
    if (!form) return;
    if (key === 'email') {
      this.alerts.showInfo('Email stays on every form. It’s how each response is matched to a person.');
      return;
    }
    const fields = form.fields.map((f) => (f.key === key ? { ...f, on, required: on ? f.required : false } : f));
    this.patch({ fields });
  }

  protected toggleRequired(key: string): void {
    const form = this.selected();
    if (!form) return;
    if (key === 'email') {
      this.alerts.showInfo('Email is always required. A response can’t create a person without it.');
      return;
    }
    const fields = form.fields.map((f) => (f.key === key ? { ...f, required: !f.required, on: true } : f));
    this.patch({ fields });
  }

  /**
   * Reorder the field list by drag. Array order is render order on the public page and the embed,
   * so this saves through the same debounced patch path as the on/required toggles. Email may be
   * moved freely: normForm() keeps a field's stored position and only re-asserts the on+required
   * invariant, so reordering never breaks the identity key.
   */
  protected reorderField(event: CdkDragDrop<FormField[]>): void {
    const form = this.selected();
    if (!form || event.previousIndex === event.currentIndex) return;
    const fields = [...form.fields];
    moveItemInArray(fields, event.previousIndex, event.currentIndex);
    this.patch({ fields });
  }

  protected addTag(raw: string): void {
    const form = this.selected();
    if (!form) return;
    const tag = raw
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    if (!tag) return;
    if (form.target_tags.includes(tag)) {
      this.alerts.showInfo(`“${tag}” is already applied to responses.`);
      return;
    }
    this.patch({ target_tags: [...form.target_tags, tag] });
  }

  protected removeTag(tag: string): void {
    const form = this.selected();
    if (!form) return;
    this.patch({ target_tags: form.target_tags.filter((t) => t !== tag) });
  }

  protected addList(id: string): void {
    const form = this.selected();
    if (!form || !id || form.target_lists.includes(id)) return;
    this.patch({ target_lists: [...form.target_lists, id] });
  }

  protected removeList(id: string): void {
    const form = this.selected();
    if (!form) return;
    this.patch({ target_lists: form.target_lists.filter((l) => l !== id) });
  }

  protected listName(id: string): string {
    return this.lists().find((l) => l.id === id)?.name ?? id;
  }

  private patch(p: UpdateFormType): void {
    const form = this.selected();
    if (!form) return;
    // Optimistic local update so the preview reflects the change immediately.
    this.replaceForm({ ...form, ...(p as Partial<FormDetail>) });
    Object.assign(this.pendingPatch, p);
    this.saveDebounced();
  }

  private async flushPatch(): Promise<void> {
    const id = this.selectedId();
    const patch = this.pendingPatch;
    this.pendingPatch = {};
    if (!id || Object.keys(patch).length === 0) return;
    try {
      const updated = await this.formsSvc.updateLive(id, patch);
      this.replaceForm(updated);
    } catch {
      this.alerts.showError('Couldn’t save that change. Check your connection and try again.');
    }
  }

  // ── Archive / delete (edit mode) ───────────────────────────────────────

  protected canDelete(form: FormDetail): boolean {
    return form.status === 'draft' && (form.submission_count ?? 0) === 0;
  }

  protected async deleteDraft(): Promise<void> {
    const form = this.selected();
    if (!form || !this.canDelete(form)) return;
    const ok = await this.confirm.confirm({
      title: `Delete “${form.name}”?`,
      message: 'This draft has no responses. Deleting it can’t be undone; archiving is the reversible option.',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await this.formsSvc.deleteDraft(form.id);
      this.forms.update((list) => list.filter((f) => f.id !== form.id));
      this.selectedId.set(this.forms()[0]?.id ?? null);
      this.mode.set('browse');
      this.alerts.showSuccess(`Deleted “${form.name}”.`);
    } catch {
      this.alerts.showError('Could not delete the form. Please try again.');
    }
  }

  // ── Public link ────────────────────────────────────────────────────────

  protected openPublicLink(): void {
    const url = this.publicUrl();
    if (url) window.open(url, '_blank', 'noopener');
  }

  protected async copyLink(): Promise<void> {
    const url = this.publicUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      this.alerts.showSuccess('Public link copied to your clipboard.');
    } catch {
      this.alerts.showError('Couldn’t copy the link. Copy it manually from the address bar.');
    }
  }

  // ── Embed dialog ───────────────────────────────────────────────────────

  protected readonly embedMode = signal<'iframe' | 'html'>('iframe');
  protected readonly embedCode = computed(() =>
    this.embedMode() === 'iframe' ? this.iframeSnippet() : this.rawHtmlSnippet(),
  );

  protected openEmbed(): void {
    this.embedMode.set('iframe');
    this.embedDialog()?.show();
  }

  protected closeEmbed(): void {
    this.embedDialog()?.close();
  }

  protected async copyEmbed(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.embedCode());
      this.alerts.showSuccess('Embed code copied to your clipboard.');
    } catch {
      this.alerts.showError('Couldn’t copy. Select the code and copy it manually.');
    }
  }

  private iframeSnippet(): string {
    const form = this.selected();
    if (!form) return '';
    return `<iframe src="${this.publicUrl()}" width="100%" height="640" style="border:0" title="${this.escapeAttr(form.name)}"></iframe>`;
  }

  private rawHtmlSnippet(): string {
    const form = this.selected();
    if (!form) return '';
    const tenantSlug = this.auth.getUser()?.tenant_slug ?? '';
    const action = `${environment.apiUrl.replace(/\/$/, '')}/api/forms/submit/${form.slug}?t=${encodeURIComponent(tenantSlug)}`;
    const lines: string[] = [`<form action="${action}" method="POST">`];
    for (const field of form.fields.filter((f) => f.on)) {
      const req = field.required ? ' required' : '';
      const star = field.required ? ' *' : '';
      const label = this.escapeAttr(field.label);
      if (field.type === 'area') {
        lines.push(`  <label>${label}${star}<br><textarea name="${field.key}"${req}></textarea></label>`);
      } else if (field.type === 'select') {
        lines.push(`  <label>${label}${star}<br><select name="${field.key}"${req}>`);
        for (const opt of field.options ?? []) lines.push(`    <option>${this.escapeAttr(opt)}</option>`);
        lines.push(`  </select></label>`);
      } else if (field.type === 'checks') {
        lines.push(`  <fieldset><legend>${label}${star}</legend>`);
        for (const opt of field.options ?? []) {
          lines.push(
            `    <label><input type="checkbox" name="${field.key}" value="${this.escapeAttr(opt)}"> ${this.escapeAttr(opt)}</label>`,
          );
        }
        lines.push(`  </fieldset>`);
      } else {
        const type = field.key === 'email' ? 'email' : 'text';
        lines.push(`  <label>${label}${star}<br><input type="${type}" name="${field.key}"${req}></label>`);
      }
    }
    lines.push(`  <button type="submit">${this.escapeAttr(form.submit_label || 'Submit')}</button>`);
    lines.push(`</form>`);
    return lines.join('\n');
  }

  private escapeAttr(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Confirmation-email dialog ──────────────────────────────────────────

  protected readonly confirmSubjectDraft = signal('');
  protected readonly confirmBodyDraft = signal('');

  protected openConfirmEmail(): void {
    const form = this.selected();
    if (!form) return;
    this.confirmSubjectDraft.set(form.confirm_subject ?? '');
    this.confirmBodyDraft.set(form.confirm_body ?? '');
    this.confirmEmailDialog()?.show();
  }

  protected closeConfirmEmail(): void {
    this.confirmEmailDialog()?.close();
  }

  protected saveConfirmEmail(): void {
    this.patch({ confirm_subject: this.confirmSubjectDraft(), confirm_body: this.confirmBodyDraft() });
    this.closeConfirmEmail();
    this.alerts.showSuccess('Confirmation email updated.');
  }

  // ── Responses ──────────────────────────────────────────────────────────

  private async loadSubmissions(): Promise<void> {
    const id = this.selectedId();
    if (!id) return;
    this.submissionsLoading.set(true);
    try {
      const res = await this.formsSvc.getSubmissions(id);
      this.submissions.set(res.items);
      this.submissionsTotal.set(res.total);
    } catch {
      this.alerts.showError('Could not load responses. Please try again.');
    } finally {
      this.submissionsLoading.set(false);
    }
  }

  protected answerSummary(row: FormSubmissionRow): string {
    const skip = new Set(['email', 'full_name', 'first_name', 'last_name']);
    const parts: string[] = [];
    for (const [key, value] of Object.entries(row.answers)) {
      if (skip.has(key) || value == null || value === '') continue;
      parts.push(Array.isArray(value) ? value.join(' · ') : String(value));
      if (parts.length >= 2) break;
    }
    return parts.join(' · ');
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  protected requiredFieldsPresent(form: FormDetail): boolean {
    return form.fields.some((f) => f.on && f.required);
  }

  private replaceForm(updated: FormDetail): void {
    this.forms.update((list) => list.map((f) => (f.id === updated.id ? { ...f, ...updated } : f)));
  }

  protected isDonationForm(form: FormDetail): boolean {
    return form.form_type === 'donation' || form.form_type === 'recurring_donation';
  }

  protected typeChip(form: FormDetail): string {
    if (form.form_type === 'recurring_donation') return 'Recurring donation';
    if (form.form_type === 'donation') return 'Donation';
    if (!form.type) return 'Form';
    return form.type.charAt(0).toUpperCase() + form.type.slice(1);
  }

  protected templateSubmitLabel(type: FormType): string {
    return FORM_TEMPLATES[type].submitLabel;
  }
}
