import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ListsService } from '@experiences/lists/services/lists-service';
import { TagsService } from '@experiences/tags/services/tags-service';
import { Icon } from '@icons/icon';
import type { PcIconNameType } from '@icons/icons.index';
import { AlertService } from '@uxcommon/components/alerts/alert-service';

import { AuthService } from '../../../auth/auth-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { SettingsService } from '../../settings/services/settings-service';
import { VisualNewsletterEditorComponent } from './visual-newsletter-editor';
import { compileTemplateHtml, compileTemplatePlainText } from './newsletter-templates';
import { NewslettersService } from '../services/newsletters-service';

/** Sentence-case, heroicon-backed metadata for the four starting templates. */
const TEMPLATE_OPTIONS: ReadonlyArray<{
  id: TemplatePreset;
  name: string;
  description: string;
  icon: PcIconNameType;
}> = [
  {
    id: 'welcome',
    name: 'Welcome email',
    description: 'Warm greeting, hero image, social links & footer.',
    icon: 'envelope',
  },
  {
    id: 'product',
    name: 'Announcement',
    description: 'Hero, list of updates, CTA button & footer.',
    icon: 'megaphone',
  },
  {
    id: 'newsletter',
    name: 'Weekly digest',
    description: 'Heading divider, digest content & footer.',
    icon: 'queue-list',
  },
  {
    id: 'empty',
    name: 'Empty canvas',
    description: 'Start from scratch with a single heading block.',
    icon: 'document',
  },
];

const STEP_LABELS = ['Template', 'Content', 'Audience & details', 'Review & send'] as const;
const LOCKED_STEP_TOOLTIP = 'Complete the current step first';
const SUBJECT_COACH = "Add a subject line — it's the one field every recipient sees.";
const FROM_NAME_COACH = 'Add a from name so recipients know who the email is from.';
const FROM_ADDRESS_COACH = 'Choose a verified sender address.';
const SCHEDULE_COACH = 'Pick a send date and time, or switch to "Send now".';
const COMMS_SETTINGS_LINK = '/settings/communications';
const VERIFY_SENDER_LINK = '/settings/communications';

@Component({
  selector: 'pc-newsletter-add',
  imports: [ReactiveFormsModule, RouterLink, Icon, VisualNewsletterEditorComponent],
  templateUrl: './newsletter-add.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class NewsletterAddComponent implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly audienceEstimateSeed = signal(0);
  private readonly authSvc = inject(AuthService);
  private readonly confirmDlg = inject(ConfirmDialogService);
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
  private readonly fb = inject(FormBuilder);
  private readonly listsSvc = inject(ListsService);
  private readonly newslettersSvc = inject(NewslettersService);
  private readonly numberFormatter = new Intl.NumberFormat();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly settingsSvc = inject(SettingsService);
  private readonly tagsSvc = inject(TagsService);
  private readonly timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

  private readonly requiresScheduleDate = computed(() => {
    const timing = this.regularForm.get('timingMode')?.value;
    if (timing !== 'schedule') return false;
    const date = this.regularForm.get('scheduledDate')?.value;
    const time = this.regularForm.get('scheduledTime')?.value;
    return !date || !time;
  });

  private readonly subjectInput = viewChild<ElementRef<HTMLInputElement>>('subjectInput');
  private readonly fromNameInput = viewChild<ElementRef<HTMLInputElement>>('fromNameInput');
  private readonly fromAddressInput = viewChild<ElementRef<HTMLSelectElement>>('fromAddressInput');

  protected readonly availableLists = signal<Array<{ id: string; name: string; size: number }>>([]);
  protected readonly availableTags = signal<Array<{ id: string; name: string; usage: number }>>([]);
  protected readonly currentStep = signal<StepIndex>(1);
  protected readonly excludeListIds = signal<string[]>([]);
  protected readonly excludeTagsList = signal<string[]>([]);
  protected readonly includeListIds = signal<string[]>([]);
  protected readonly includeTagsList = signal<string[]>([]);
  protected readonly loadingLists = signal<boolean>(false);
  protected readonly loadingTags = signal<boolean>(false);
  protected readonly mode = signal<CreationMode>('options');
  protected readonly saving = signal(false);
  protected readonly selectedTemplate = signal<TemplatePreset>('welcome');
  protected readonly showDatePicker = signal(false);
  /** Set true once the user has changed anything in the wizard, so the leave guard only fires on real work. */
  protected readonly dirty = signal(false);
  /** Set true after a blocked Next/Send so inline field errors appear even before the field is touched. */
  protected readonly showFieldErrors = signal(false);

  protected readonly steps = STEP_LABELS;
  protected readonly templateOptions = TEMPLATE_OPTIONS;
  protected readonly lockedStepTooltip = LOCKED_STEP_TOOLTIP;
  protected readonly subjectCoach = SUBJECT_COACH;
  protected readonly fromNameCoach = FROM_NAME_COACH;
  protected readonly fromAddressCoach = FROM_ADDRESS_COACH;
  protected readonly scheduleCoach = SCHEDULE_COACH;
  protected readonly commsSettingsLink = COMMS_SETTINGS_LINK;
  protected readonly verifySenderLink = VERIFY_SENDER_LINK;
  /** Rendered literally in the content-step helper; kept as a constant so Angular doesn't parse the braces. */
  protected readonly mergeFieldExample = '{{first_name}}';

  protected readonly regularForm = this.fb.group({
    subject: ['', [Validators.required]],
    previewText: [''],
    fromName: ['', [Validators.required]],
    fromAddress: ['', [Validators.required, Validators.email]],
    htmlContent: [''],
    plainTextContent: [''],
    includeLists: [[] as string[]],
    includeTags: [[] as string[]],
    excludeLists: [[] as string[]],
    excludeTags: [[] as string[]],
    timingMode: ['now'],
    scheduledDate: [''],
    scheduledTime: [''],
  });

  // --- Verified senders / workspace prefill ---------------------------------

  protected readonly verifiedSenders = signal<string[]>([]);
  protected readonly commsDefaultsApplied = signal(false);

  // --- Audience math (every line is real; the total is the single source) ---

  protected readonly includedListsTotal = computed(() => this.sumListSizes(this.includeListIds()));
  protected readonly excludedListsTotal = computed(() => this.sumListSizes(this.excludeListIds()));
  protected readonly includedTagsTotal = computed(() => this.sumTagUsage(this.includeTagsList()));
  protected readonly excludedTagsTotal = computed(() => this.sumTagUsage(this.excludeTagsList()));
  protected readonly estimatedAudienceCount = computed(() => {
    this.audienceEstimateSeed();
    const estimate =
      this.includedListsTotal() + this.includedTagsTotal() - this.excludedListsTotal() - this.excludedTagsTotal();
    return estimate > 0 ? Math.round(estimate) : 0;
  });
  protected readonly hasAudienceSelection = computed(
    () =>
      this.includeListIds().length > 0 ||
      this.includeTagsList().length > 0 ||
      this.excludeListIds().length > 0 ||
      this.excludeTagsList().length > 0,
  );
  /** Reads the live workspace setting; ON by default (skip previously bounced addresses). */
  protected readonly skipBounced = computed(() =>
    this.settingsSvc.getValue<boolean>('communications.skip_bounced', true),
  );

  // --- Suggestion chips (a list/tag already used in one bucket isn't offered in it) ---

  protected readonly includeListSuggestions = computed(() =>
    this.availableLists().filter((l) => !this.includeListIds().includes(l.id)),
  );
  protected readonly excludeListSuggestions = computed(() =>
    this.availableLists().filter((l) => !this.excludeListIds().includes(l.id)),
  );
  protected readonly includeTagSuggestions = computed(() =>
    this.availableTags().filter((t) => !this.includeTagsList().includes(t.name)),
  );
  protected readonly excludeTagSuggestions = computed(() =>
    this.availableTags().filter((t) => !this.excludeTagsList().includes(t.name)),
  );

  public ngOnInit(): void {
    this.syncListSignalsFromForm();
    this.syncTagSignalsFromForm();
    void this.loadLists();
    void this.loadTags();
    void this.loadCommsDefaults();
  }

  /** Route-level leave guard (wired via unsavedChangesGuard in dashboard.routes.ts). */
  public canDeactivate(): Promise<boolean> {
    if (!this.dirty()) return Promise.resolve(true);
    return this.confirmDlg.confirm({
      title: 'Leave without saving?',
      message:
        'Your changes to your draft newsletter — template, audience and copy — will be lost. Save it as a draft to keep working on it later.',
      variant: 'warning',
      confirmText: 'Discard draft',
      cancelText: 'Keep editing',
      emphasizeCancel: true,
    });
  }

  // --- Step navigation ------------------------------------------------------

  protected canReachStep(step: number): boolean {
    return step <= this.currentStep();
  }

  protected goToStep(targetStep: number): void {
    // Completed or current steps are clickable; future steps stay locked (they narrate why via tooltip).
    if (this.canReachStep(targetStep)) {
      this.currentStep.set(targetStep as StepIndex);
    }
  }

  protected handleBack(): void {
    const step = this.currentStep();
    if (step === 1) {
      this.switchToOptions();
    } else {
      this.currentStep.set((step - 1) as StepIndex);
    }
  }

  protected handleNext(): void {
    const step = this.currentStep();

    if (step === 3 && !this.validateDetails()) return;

    if (step >= STEP_LABELS.length) return;
    this.showFieldErrors.set(false);
    this.currentStep.set((step + 1) as StepIndex);
  }

  // --- Mode / template ------------------------------------------------------

  protected close(): void {
    void this.router.navigate(['../'], { relativeTo: this.route });
  }

  protected selectAutomated(): void {
    this.mode.set('automated');
  }

  protected selectRegular(): void {
    this.mode.set('regular');
    this.currentStep.set(1);
    this.syncListSignalsFromForm();
    this.syncTagSignalsFromForm();
    this.applyTemplate('welcome');
    // Auto-selecting the default template is not a user edit.
    this.dirty.set(false);
  }

  protected switchToOptions(): void {
    this.mode.set('options');
    this.currentStep.set(1);
  }

  protected selectTemplate(preset: TemplatePreset): void {
    this.applyTemplate(preset);
    this.markDirty();
  }

  protected selectedTemplateName(): string {
    return TEMPLATE_OPTIONS.find((t) => t.id === this.selectedTemplate())?.name ?? 'Template';
  }

  // --- Audience: add / remove -----------------------------------------------

  protected addIncludeList(listId: string): void {
    if (this.includeListIds().includes(listId)) return;
    // A list can't be both included and excluded.
    this.setExcludeLists(this.excludeListIds().filter((id) => id !== listId));
    this.setIncludeLists([...this.includeListIds(), listId]);
  }

  protected removeIncludeList(listId: string): void {
    this.setIncludeLists(this.includeListIds().filter((id) => id !== listId));
  }

  protected addExcludeList(listId: string): void {
    if (this.excludeListIds().includes(listId)) return;
    this.setIncludeLists(this.includeListIds().filter((id) => id !== listId));
    this.setExcludeLists([...this.excludeListIds(), listId]);
  }

  protected removeExcludeList(listId: string): void {
    this.setExcludeLists(this.excludeListIds().filter((id) => id !== listId));
  }

  protected addIncludeTag(name: string): void {
    if (this.includeTagsList().includes(name)) return;
    this.setExcludeTags(this.excludeTagsList().filter((t) => t !== name));
    this.setIncludeTags([...this.includeTagsList(), name]);
  }

  protected removeIncludeTag(name: string): void {
    this.setIncludeTags(this.includeTagsList().filter((t) => t !== name));
  }

  protected addExcludeTag(name: string): void {
    if (this.excludeTagsList().includes(name)) return;
    this.setIncludeTags(this.includeTagsList().filter((t) => t !== name));
    this.setExcludeTags([...this.excludeTagsList(), name]);
  }

  protected removeExcludeTag(name: string): void {
    this.setExcludeTags(this.excludeTagsList().filter((t) => t !== name));
  }

  protected listName(id: string): string {
    return this.availableLists().find((list) => list.id === id)?.name ?? 'List';
  }

  protected listSize(id: string): number {
    return this.availableLists().find((list) => list.id === id)?.size ?? 0;
  }

  protected tagUsage(name: string): number {
    return this.availableTags().find((tag) => tag.name === name)?.usage ?? 0;
  }

  protected formatCount(value: number): string {
    return this.numberFormatter.format(value);
  }

  /** "1 person" / "1,312 people" — honest scale for buttons and copy. */
  protected peopleLabel(value: number): string {
    return `${this.formatCount(value)} ${value === 1 ? 'person' : 'people'}`;
  }

  // --- Schedule -------------------------------------------------------------

  protected isInvalid(controlName: string): boolean {
    const control = this.regularForm.get(controlName);
    if (!control) return false;
    return control.invalid && (control.dirty || control.touched || this.showFieldErrors());
  }

  protected onScheduledDateChange(event: unknown): void {
    const value = this.normalizeCalendarValue(event) ?? '';
    const control = this.regularForm.get('scheduledDate') as FormControl<string> | null;
    control?.setValue(value);
    control?.markAsDirty();
    control?.markAsTouched();
    this.markDirty();
    this.showDatePicker.set(false);
  }

  protected scheduledDateDisplay(): string {
    const value = this.scheduledDateValue();
    if (!value) return 'Select a date';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : this.dateFormatter.format(parsed);
  }

  protected scheduledDateValue(): string {
    const value = this.regularForm.get('scheduledDate')?.value;
    return typeof value === 'string' ? value : value ? String(value) : '';
  }

  protected timingNeedsDate(): boolean {
    return this.requiresScheduleDate();
  }

  protected toggleDatePicker(): void {
    this.showDatePicker.update((open) => !open);
  }

  protected onFieldInput(): void {
    this.markDirty();
  }

  protected onTimingChange(): void {
    this.markDirty();
  }

  protected goToVerifySender(): void {
    void this.router.navigateByUrl(this.verifySenderLink);
  }

  // --- Test send ------------------------------------------------------------

  protected async sendTestEmail(): Promise<void> {
    const raw = this.regularForm.getRawValue();
    const to = this.authSvc.getUser()?.email;
    if (!to) {
      this.alertSvc.showError('We could not find your email address for the test send.');
      return;
    }
    const subject = raw.subject || 'Your newsletter';
    try {
      await this.newslettersSvc.sendTest({
        subject,
        html: raw.htmlContent ?? '',
        text: raw.plainTextContent ?? '',
        to,
        fromName: raw.fromName ?? undefined,
        fromEmail: raw.fromAddress ?? undefined,
      });
      this.alertSvc.showSuccess(`Sent a test of "${subject}" to ${to}`);
    } catch (err) {
      this.alertSvc.showError(this.errorMessage(err, 'We could not send the test email. Try again.'));
    }
  }

  // --- Save draft -----------------------------------------------------------

  protected async saveDraft(): Promise<void> {
    if (this.saving()) return;
    const raw = this.regularForm.getRawValue();
    const subject = raw.subject || 'Untitled draft';
    this.saving.set(true);
    try {
      await this.newslettersSvc.add(this.buildPayload('draft'));
      this.dirty.set(false);
      this.alertSvc.showSuccess(`Saved draft "${subject}" — find it in Newsletters`);
      this.close();
    } catch (err) {
      this.alertSvc.showError(this.errorMessage(err, 'We could not save your draft. Try again.'));
    } finally {
      this.saving.set(false);
    }
  }

  // --- Send / schedule (with preflight) -------------------------------------

  protected async sendRegular(): Promise<void> {
    if (this.saving()) return;
    if (!this.validateDetails()) {
      this.currentStep.set(3);
      return;
    }
    if (this.requiresScheduleDate()) {
      this.regularForm.get('scheduledDate')?.markAsTouched();
      this.regularForm.get('scheduledTime')?.markAsTouched();
      this.showFieldErrors.set(true);
      this.alertSvc.showError(this.scheduleCoach);
      return;
    }

    const raw = this.regularForm.getRawValue();
    const scheduled = raw.timingMode === 'schedule';
    const count = this.estimatedAudienceCount();
    const subject = raw.subject || 'Untitled newsletter';
    const whenLabel = scheduled ? this.scheduleWhenLabel() : 'now';

    const confirmed = await this.confirmDlg.confirm({
      title: scheduled ? `Schedule "${subject}" for ${whenLabel}?` : `Send "${subject}" now?`,
      message: this.preflightMessage(count),
      variant: 'info',
      icon: 'paper-airplane',
      confirmText: scheduled ? `Schedule for ${this.peopleLabel(count)}` : `Send to ${this.peopleLabel(count)}`,
      cancelText: 'Keep editing',
      emphasizeCancel: true,
    });
    if (!confirmed) return;

    this.saving.set(true);
    try {
      const created = await this.newslettersSvc.add(this.buildPayload(scheduled ? 'scheduled' : 'draft'));
      const createdId = this.extractId(created);
      if (!scheduled && createdId) {
        await this.newslettersSvc.send(createdId);
      }
      this.dirty.set(false);
      this.alertSvc.showSuccess(
        scheduled
          ? `Queued "${subject}" to ${this.peopleLabel(count)} — sending ${whenLabel}`
          : `Queued "${subject}" to ${this.peopleLabel(count)} — sending now`,
      );
      this.close();
    } catch (err) {
      this.alertSvc.showError(this.errorMessage(err, 'We could not send this newsletter. Try again.'));
    } finally {
      this.saving.set(false);
    }
  }

  // --- Internals ------------------------------------------------------------

  private applyTemplate(preset: TemplatePreset): void {
    this.selectedTemplate.set(preset);
    this.regularForm.get('htmlContent')?.setValue(compileTemplateHtml(preset));
    this.regularForm.get('plainTextContent')?.setValue(compileTemplatePlainText(preset));
  }

  private validateDetails(): boolean {
    this.markDetailsTouched();
    this.showFieldErrors.set(true);
    const invalidField = this.firstInvalidDetail();
    if (invalidField) {
      this.focusAndCoach(invalidField);
      return false;
    }
    return true;
  }

  private firstInvalidDetail(): 'subject' | 'fromName' | 'fromAddress' | null {
    if (this.regularForm.get('subject')?.invalid) return 'subject';
    if (this.regularForm.get('fromName')?.invalid) return 'fromName';
    if (this.regularForm.get('fromAddress')?.invalid) return 'fromAddress';
    return null;
  }

  private focusAndCoach(field: 'subject' | 'fromName' | 'fromAddress'): void {
    const map = {
      subject: { ref: this.subjectInput(), coach: this.subjectCoach },
      fromName: { ref: this.fromNameInput(), coach: this.fromNameCoach },
      fromAddress: { ref: this.fromAddressInput(), coach: this.fromAddressCoach },
    } as const;
    const target = map[field];
    target.ref?.nativeElement.focus();
    this.alertSvc.showError(target.coach);
  }

  private preflightMessage(count: number): string {
    const base = `It will go to ${this.peopleLabel(count)}.`;
    if (this.skipBounced()) {
      return `${base} Previously bounced addresses are skipped automatically.`;
    }
    return `${base} Bounced addresses are NOT being skipped (Workspace setting).`;
  }

  private scheduleWhenLabel(): string {
    const date = this.scheduledDateValue();
    const time = this.regularForm.get('scheduledTime')?.value ?? '';
    if (!date) return 'the scheduled time';
    const parsed = new Date(`${date}T${time || '00:00'}`);
    if (Number.isNaN(parsed.getTime())) return `${date} ${time}`.trim();
    return time
      ? `${this.dateFormatter.format(parsed)} at ${this.timeFormatter.format(parsed)}`
      : this.dateFormatter.format(parsed);
  }

  private buildPayload(status: 'draft' | 'scheduled'): Parameters<NewslettersService['add']>[0] {
    const raw = this.regularForm.getRawValue();
    const scheduledAt =
      status === 'scheduled' && raw.scheduledDate && raw.scheduledTime
        ? new Date(`${raw.scheduledDate}T${raw.scheduledTime}`)
        : null;

    return {
      name: raw.subject || 'Unnamed Newsletter',
      status,
      subject: raw.subject,
      preview_text: raw.previewText,
      audience_description: this.buildAudienceDescription(),
      target_lists: JSON.stringify({ include: raw.includeLists ?? [], exclude: raw.excludeLists ?? [] }),
      segments: JSON.stringify({ include: raw.includeTags ?? [], exclude: raw.excludeTags ?? [] }),
      html_content: raw.htmlContent,
      plain_text_content: raw.plainTextContent,
      send_date: scheduledAt,
      total_recipients: this.estimatedAudienceCount(),
    };
  }

  private buildAudienceDescription(): string {
    const includeLists = this.includeListIds().map((id) => this.listName(id));
    const includeTags = this.includeTagsList();
    const excludeLists = this.excludeListIds().map((id) => this.listName(id));
    const excludeTags = this.excludeTagsList();

    const parts: string[] = [];
    if (includeLists.length || includeTags.length) {
      parts.push(
        `Targeting lists: [${includeLists.join(', ') || 'None'}], tags: [${includeTags.join(', ') || 'None'}]`,
      );
    }
    if (excludeLists.length || excludeTags.length) {
      parts.push(
        `Excluding lists: [${excludeLists.join(', ') || 'None'}], tags: [${excludeTags.join(', ') || 'None'}]`,
      );
    }
    return parts.length ? parts.join(' ') : 'No target audience configured.';
  }

  private markDetailsTouched(): void {
    this.regularForm.get('subject')?.markAsTouched();
    this.regularForm.get('fromName')?.markAsTouched();
    this.regularForm.get('fromAddress')?.markAsTouched();
  }

  private markDirty(): void {
    if (!this.dirty()) this.dirty.set(true);
  }

  private setIncludeLists(next: string[]): void {
    this.includeListIds.set(next);
    this.writeControl('includeLists', next);
  }

  private setExcludeLists(next: string[]): void {
    this.excludeListIds.set(next);
    this.writeControl('excludeLists', next);
  }

  private setIncludeTags(next: string[]): void {
    this.includeTagsList.set(next);
    this.writeControl('includeTags', next);
  }

  private setExcludeTags(next: string[]): void {
    this.excludeTagsList.set(next);
    this.writeControl('excludeTags', next);
  }

  private writeControl(name: 'includeLists' | 'excludeLists' | 'includeTags' | 'excludeTags', next: string[]): void {
    const control = this.regularForm.get(name) as FormControl<string[]> | null;
    control?.setValue(next);
    control?.markAsDirty();
    this.markDirty();
    this.refreshAudienceEstimate();
  }

  private sumListSizes(ids: string[]): number {
    const sizeById = new Map(this.availableLists().map((l) => [l.id, Number(l.size) || 0]));
    return ids.reduce((sum, id) => sum + (sizeById.get(id) ?? 0), 0);
  }

  private sumTagUsage(names: string[]): number {
    const usageByName = new Map(this.availableTags().map((t) => [t.name, Number(t.usage) || 0]));
    return names.reduce((sum, name) => sum + (usageByName.get(name) ?? 0), 0);
  }

  private async loadLists(): Promise<void> {
    this.loadingLists.set(true);
    try {
      const result = await this.listsSvc.getAll({ limit: 100, startRow: 0 });
      const rows = Array.isArray(result?.rows) ? result.rows : [];
      this.availableLists.set(
        rows
          .filter((row: { id?: unknown; name?: unknown }) => row?.id && row?.name)
          .map((row: Record<string, unknown>) => ({
            id: String(row['id']),
            name: String(row['name']),
            size:
              Number(row['list_size'] ?? row['people_count'] ?? row['household_count'] ?? row['member_count'] ?? 0) ||
              0,
          })),
      );
      this.syncListSignalsFromForm();
    } catch (err) {
      this.alertSvc.showError(this.errorMessage(err, 'We could not load lists. Try again later.'));
    } finally {
      this.loadingLists.set(false);
    }
  }

  private async loadTags(): Promise<void> {
    this.loadingTags.set(true);
    try {
      const result = await this.tagsSvc.getAll({ limit: 100, startRow: 0 });
      const rows = Array.isArray((result as { rows?: unknown })?.rows) ? (result as { rows: unknown[] }).rows : [];
      this.availableTags.set(
        rows
          .filter(
            (row): row is Record<string, unknown> => !!row && typeof row === 'object' && 'id' in row && 'name' in row,
          )
          .filter((row) => row['id'] && row['name'])
          .map((row) => ({
            id: String(row['id']),
            name: String(row['name']),
            usage: Number(row['use_count_people'] ?? 0) + Number(row['use_count_households'] ?? 0),
          })),
      );
      this.refreshAudienceEstimate();
    } catch (err) {
      this.alertSvc.showError(this.errorMessage(err, 'We could not load tags. Try again later.'));
    } finally {
      this.loadingTags.set(false);
    }
  }

  private async loadCommsDefaults(): Promise<void> {
    try {
      await this.settingsSvc.load();
    } catch {
      // Non-fatal: the sender fields simply won't prefill.
      return;
    }
    this.verifiedSenders.set(this.settingsSvc.getValue<string[]>('communications.verified_emails', []) ?? []);

    const defaultName = this.settingsSvc.getValue<string>('communications.default_from_name', '');
    const defaultEmail = this.settingsSvc.getValue<string>('communications.default_from_email', '');
    let applied = false;
    if (defaultName && !this.regularForm.get('fromName')?.value) {
      this.regularForm.get('fromName')?.setValue(defaultName);
      applied = true;
    }
    if (defaultEmail && this.verifiedSenders().includes(defaultEmail) && !this.regularForm.get('fromAddress')?.value) {
      this.regularForm.get('fromAddress')?.setValue(defaultEmail);
      applied = true;
    }
    this.commsDefaultsApplied.set(applied);
  }

  private normalizeCalendarValue(event: unknown): string | null {
    const raw = this.readCalendarRaw(event);
    if (!raw) return null;
    const text = String(raw).trim();
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  }

  private readCalendarRaw(event: unknown): string | null {
    if (typeof event === 'string') return event;
    if (!event || typeof event !== 'object') return null;
    const e = event as Record<string, unknown>;
    const detail = e['detail'];
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object' && typeof (detail as Record<string, unknown>)['value'] === 'string') {
      return (detail as Record<string, unknown>)['value'] as string;
    }
    const target = e['target'];
    if (target && typeof target === 'object' && typeof (target as Record<string, unknown>)['value'] === 'string') {
      return (target as Record<string, unknown>)['value'] as string;
    }
    if (typeof e['value'] === 'string') return e['value'] as string;
    return null;
  }

  private refreshAudienceEstimate(): void {
    this.audienceEstimateSeed.update((value) => value + 1);
  }

  private syncListSignalsFromForm(): void {
    const include = (this.regularForm.get('includeLists') as FormControl<string[]> | null)?.value ?? [];
    const exclude = (this.regularForm.get('excludeLists') as FormControl<string[]> | null)?.value ?? [];
    this.includeListIds.set([...include]);
    this.excludeListIds.set([...exclude]);
    this.refreshAudienceEstimate();
  }

  private syncTagSignalsFromForm(): void {
    const include = (this.regularForm.get('includeTags') as FormControl<string[]> | null)?.value ?? [];
    const exclude = (this.regularForm.get('excludeTags') as FormControl<string[]> | null)?.value ?? [];
    this.includeTagsList.set([...include]);
    this.excludeTagsList.set([...exclude]);
    this.refreshAudienceEstimate();
  }

  private extractId(created: unknown): string | null {
    if (created && typeof created === 'object' && 'id' in created) {
      const id = (created as Record<string, unknown>)['id'];
      return id != null ? String(id) : null;
    }
    return null;
  }

  private errorMessage(err: unknown, fallback: string): string {
    return err instanceof Error && err.message ? err.message : fallback;
  }
}

type CreationMode = 'options' | 'regular' | 'automated';

type StepIndex = 1 | 2 | 3 | 4;

type TemplatePreset = 'welcome' | 'product' | 'newsletter' | 'empty';
