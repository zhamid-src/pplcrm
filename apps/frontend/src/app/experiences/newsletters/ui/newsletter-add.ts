import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ListsService } from '@experiences/lists/services/lists-service';
import { TagsService } from '@experiences/tags/services/tags-service';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { TagItem } from '@uxcommon/components/tags/tagitem';
import { Tags } from '@uxcommon/components/tags/tags';

@Component({
  selector: 'pc-newsletter-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Icon, Tags, TagItem],
  templateUrl: './newsletter-add.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class NewsletterAddComponent implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly audienceEstimateSeed = signal(0);
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
  private readonly fb = inject(FormBuilder);
  private readonly listsSvc = inject(ListsService);
  private readonly requiresScheduleDate = computed(() => {
    const timing = this.regularForm.get('timingMode')?.value;
    if (timing !== 'schedule') return false;
    const date = this.regularForm.get('scheduledDate')?.value;
    const time = this.regularForm.get('scheduledTime')?.value;
    return !date || !time;
  });
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tagsSvc = inject(TagsService);

  protected readonly availableLists = signal<Array<{ id: string; name: string; size: number }>>([]);
  protected readonly availableTags = signal<Array<{ id: string; name: string; usage: number }>>([]);
  protected readonly currentStep = signal<StepIndex>(1);
  protected readonly estimatedAudienceCount = computed(() => this.computeEstimatedAudience());
  protected readonly excludeListIds = signal<string[]>([]);
  protected readonly excludeTagsList = signal<string[]>([]);
  protected readonly includeListIds = signal<string[]>([]);
  protected readonly includeTagsList = signal<string[]>([]);
  protected readonly loadingLists = signal<boolean>(false);
  protected readonly loadingTags = signal<boolean>(false);
  protected readonly mode = signal<CreationMode>('options');
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
  protected readonly showDatePicker = signal(false);
  protected readonly steps = ['Summary', 'Design', 'Send to', 'Timing'] as const;

  public ngOnInit(): void {
    this.syncListSignalsFromForm();
    this.syncTagSignalsFromForm();
    void this.loadLists();
    void this.loadTags();
  }

  protected close(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  protected handleBack(): void {
    const step = this.currentStep();
    if (step === 1) {
      this.switchToOptions();
    } else {
      this.currentStep.set((step - 1) as StepIndex);
    }
  }

  protected handleExcludeListSelect(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    if (!select) return;
    const value = select.value;
    if (!value) return;
    const current = new Set(this.excludeListIds());
    if (!current.has(value)) {
      current.add(value);
      const arr = Array.from(current);
      this.excludeListIds.set(arr);
      this.updateExcludeListsControl(arr);
      this.refreshAudienceEstimate();
    }
    select.value = '';
  }

  protected handleExcludeTagsChange(tags: string[]): void {
    const next = Array.isArray(tags) ? [...tags] : [];
    this.excludeTagsList.set(next);
    const control = this.regularForm.get('excludeTags') as FormControl<string[]> | null;
    control?.setValue(next);
    control?.markAsDirty();
    this.refreshAudienceEstimate();
  }

  protected handleIncludeListSelect(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    if (!select) return;
    const value = select.value;
    if (!value) return;
    const current = new Set(this.includeListIds());
    if (!current.has(value)) {
      current.add(value);
      const arr = Array.from(current);
      this.includeListIds.set(arr);
      this.updateIncludeListsControl(arr);
      this.refreshAudienceEstimate();
    }
    select.value = '';
  }

  protected handleIncludeTagsChange(tags: string[]): void {
    const next = Array.isArray(tags) ? [...tags] : [];
    this.includeTagsList.set(next);
    const control = this.regularForm.get('includeTags') as FormControl<string[]> | null;
    control?.setValue(next);
    control?.markAsDirty();
    this.refreshAudienceEstimate();
  }

  protected handleNext(): void {
    const step = this.currentStep();

    if (step === 1) {
      this.markSummaryTouched();
      if (
        this.regularForm.get('subject')?.invalid ||
        this.regularForm.get('fromName')?.invalid ||
        this.regularForm.get('fromAddress')?.invalid
      ) {
        return;
      }
    }

    if (step === 4) return;
    this.currentStep.set((step + 1) as StepIndex);
  }

  protected isInvalid(controlName: string): boolean {
    const control = this.regularForm.get(controlName);
    if (!control) return false;
    return control.invalid && (control.dirty || control.touched);
  }

  protected listName(id: string): string {
    const match = this.availableLists().find((list) => list.id === id);
    return match?.name ?? 'List';
  }

  protected onScheduledDateChange(event: any): void {
    const value = this.normalizeCalendarValue(event) ?? '';
    const control = this.regularForm.get('scheduledDate') as FormControl<string> | null;
    if (control) {
      control.setValue(value);
      control.markAsDirty();
      control.markAsTouched();
    }
    this.refreshAudienceEstimate();
    this.showDatePicker.set(false);
  }

  protected removeExcludeList(listId: string): void {
    const next = this.excludeListIds().filter((id) => id !== listId);
    this.excludeListIds.set(next);
    this.updateExcludeListsControl(next);
    this.refreshAudienceEstimate();
  }

  protected removeIncludeList(listId: string): void {
    const next = this.includeListIds().filter((id) => id !== listId);
    this.includeListIds.set(next);
    this.updateIncludeListsControl(next);
    this.refreshAudienceEstimate();
  }

  protected scheduledDateDisplay(): string {
    const value = this.scheduledDateValue();
    if (!value) return 'Select a date';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : this.dateFormatter.format(parsed);
  }

  protected scheduledDateValue(): string {
    const control = this.regularForm.get('scheduledDate');
    const value = control?.value;
    return typeof value === 'string' ? value : value ? String(value) : '';
  }

  protected selectAutomated(): void {
    this.mode.set('automated');
  }

  protected selectRegular(): void {
    this.mode.set('regular');
    this.currentStep.set(1);
    this.syncListSignalsFromForm();
    this.syncTagSignalsFromForm();
  }

  protected sendRegular(): void {
    this.markSummaryTouched();

    if (this.requiresScheduleDate()) {
      this.regularForm.get('scheduledDate')?.markAsTouched();
      this.regularForm.get('scheduledTime')?.markAsTouched();
      if (this.requiresScheduleDate()) {
        return;
      }
    }

    if (this.regularForm.invalid) {
      return;
    }

    const raw = this.regularForm.getRawValue();
    const { scheduledDate, scheduledTime, ...rest } = raw;
    const scheduledAt =
      rest.timingMode === 'schedule' && scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;
    const payload = { ...rest, scheduledDate, scheduledTime, scheduledAt };
    console.debug('Newsletter payload', payload);
    this.alertSvc.showSuccess('Newsletter draft saved. You can finalize it from the detail view.');
    this.close();
  }

  protected switchToOptions(): void {
    this.mode.set('options');
    this.currentStep.set(1);
  }

  protected timingNeedsDate(): boolean {
    return this.requiresScheduleDate();
  }

  protected toggleDatePicker(): void {
    this.showDatePicker.update((open) => !open);
  }

  private computeEstimatedAudience(): number {
    this.audienceEstimateSeed();

    const listSizeMap = new Map<string, number>();
    for (const list of this.availableLists()) {
      listSizeMap.set(list.id, Number(list.size) || 0);
    }

    const includeListTotal = this.includeListIds().reduce((sum, id) => sum + (listSizeMap.get(id) ?? 0), 0);
    const excludeListTotal = this.excludeListIds().reduce((sum, id) => sum + (listSizeMap.get(id) ?? 0), 0);

    const tagUsageMap = new Map<string, number>();
    for (const tag of this.availableTags()) {
      tagUsageMap.set(tag.name.toLowerCase(), Number(tag.usage) || 0);
    }

    const includeTagTotal = this.includeTagsList().reduce(
      (sum, name) => sum + (tagUsageMap.get(name.toLowerCase()) ?? 0),
      0,
    );
    const excludeTagTotal = this.excludeTagsList().reduce(
      (sum, name) => sum + (tagUsageMap.get(name.toLowerCase()) ?? 0),
      0,
    );

    const estimate = includeListTotal + includeTagTotal - excludeListTotal - excludeTagTotal;
    return estimate > 0 ? Math.round(estimate) : 0;
  }

  private async loadLists(): Promise<void> {
    this.loadingLists.set(true);
    try {
      const result = await this.listsSvc.getAll({ limit: 100, startRow: 0 });
      const rows = Array.isArray(result?.rows) ? result.rows : [];
      this.availableLists.set(
        rows
          .filter((row: any) => row?.id && row?.name)
          .map((row: any) => ({
            id: String(row.id),
            name: String(row.name),
            size: Number(row.list_size ?? row.people_count ?? row.household_count ?? row.member_count ?? 0) || 0,
          })),
      );
      this.syncListSignalsFromForm();
    } catch (err) {
      console.error('Failed to load lists for newsletters', err);
      this.alertSvc.showError('We could not load lists. Try again later.');
    } finally {
      this.loadingLists.set(false);
    }
  }

  private async loadTags(): Promise<void> {
    this.loadingTags.set(true);
    try {
      const result = await this.tagsSvc.getAll({ limit: 100, startRow: 0 });
      const rows = Array.isArray((result as any)?.rows) ? (result as any).rows : [];
      this.availableTags.set(
        rows
          .filter((row: any) => row?.id && row?.name)
          .map((row: any) => ({
            id: String(row.id),
            name: String(row.name),
            usage: Number(row.use_count_people ?? 0) + Number(row.use_count_households ?? 0),
          })),
      );
      this.refreshAudienceEstimate();
    } catch (err) {
      console.error('Failed to load tags for newsletters', err);
      this.alertSvc.showError('We could not load tags. Try again later.');
    } finally {
      this.loadingTags.set(false);
    }
  }

  private markSummaryTouched(): void {
    this.regularForm.get('subject')?.markAsTouched();
    this.regularForm.get('fromName')?.markAsTouched();
    this.regularForm.get('fromAddress')?.markAsTouched();
  }

  private normalizeCalendarValue(event: any): string | null {
    const raw =
      (event?.detail != null && typeof event.detail === 'string' && event.detail) ||
      (event?.detail?.value != null && event.detail.value) ||
      (event?.target?.value != null && event.target.value) ||
      (event?.value != null && event.value) ||
      (typeof event === 'string' ? event : null);

    if (!raw) return null;
    const text = String(raw).trim();
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
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

  private updateExcludeListsControl(next: string[]): void {
    const control = this.regularForm.get('excludeLists') as FormControl<string[]> | null;
    control?.setValue(next);
    control?.markAsDirty();
  }

  private updateIncludeListsControl(next: string[]): void {
    const control = this.regularForm.get('includeLists') as FormControl<string[]> | null;
    control?.setValue(next);
    control?.markAsDirty();
  }
}

type CreationMode = 'options' | 'regular' | 'automated';

type StepIndex = 1 | 2 | 3 | 4;
