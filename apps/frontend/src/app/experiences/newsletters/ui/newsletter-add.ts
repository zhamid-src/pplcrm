import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ListsService } from '@experiences/lists/services/lists-service';
import { TagsService } from '@experiences/tags/services/tags-service';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Tags } from '@uxcommon/components/tags/tags';
import { TagItem } from '@uxcommon/components/tags/tagitem';

@Component({
  selector: 'pc-newsletter-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Icon, Tags, TagItem],
  template: `
    @if (mode() === 'options') {
      <div class="flex h-full bg-base-200">
        <div class="hidden flex-1 flex-col items-center justify-center px-10 lg:flex">
          <div class="max-w-md text-center lg:text-left">
            <h2 class="text-2xl font-semibold">Create a newsletter</h2>
            <p class="mt-2 text-base text-base-content/70">
              Choose the type of newsletter you'd like to send and walk through a guided setup that covers the summary,
              design, audience, and timing of your send.
            </p>
          </div>
        </div>

        <aside class="flex w-full max-w-2xl flex-col border-l border-base-300 bg-base-100 shadow-xl">
          <header class="flex items-center justify-between border-b border-base-200 px-6 py-4">
            <div class="flex items-center gap-3">
              <button class="btn btn-ghost btn-sm" (click)="close()">
                <pc-icon name="arrow-uturn-left" class="mr-1"></pc-icon>
                Back
              </button>
              <h1 class="text-lg font-semibold">New newsletter</h1>
            </div>
          </header>

          <section class="flex-1 overflow-y-auto px-6 pb-10 pt-6">
            <div class="flex flex-col gap-5">
              <div class="rounded-lg border border-base-200 bg-base-100 p-5 shadow-sm">
                <h2 class="text-lg font-semibold">How would you like to send?</h2>
                <p class="mt-1 text-sm text-base-content/70">
                  Pick from a traditional newsletter or set up automations for ongoing sends.
                </p>
              </div>

              <button
                class="card card-compact border border-base-300 bg-base-100 transition hover:border-primary"
                type="button"
                (click)="selectRegular()"
              >
                <div class="card-body flex-row items-center gap-4">
                  <div class="rounded-full bg-primary/10 p-3 text-primary">
                    <pc-icon name="star" class="h-6 w-6"></pc-icon>
                  </div>
                  <div class="flex-1 text-left">
                    <h3 class="text-lg font-semibold">Regular</h3>
                    <p class="text-sm text-base-content/70">
                      Build a one-time newsletter, design it, choose who receives it, and decide when it goes out.
                    </p>
                  </div>
                  <pc-icon name="chevron-right" class="h-5 w-5 text-base-content/60"></pc-icon>
                </div>
              </button>

              <button
                class="card card-compact border border-base-200 bg-base-100 opacity-80 transition hover:border-base-300"
                type="button"
                (click)="selectAutomated()"
              >
                <div class="card-body flex-row items-center gap-4">
                  <div class="rounded-full bg-base-300/70 p-3 text-base-content/70">
                    <pc-icon name="arrow-path" class="h-6 w-6"></pc-icon>
                  </div>
                  <div class="flex-1 text-left">
                    <h3 class="text-lg font-semibold">Automated</h3>
                    <p class="text-sm text-base-content/60">
                      Set up drip campaigns or recurring sends triggered by events. (Coming soon)
                    </p>
                  </div>
                  <pc-icon name="information-circle" class="h-5 w-5 text-base-content/50"></pc-icon>
                </div>
              </button>
            </div>
          </section>
        </aside>
      </div>
    } @else if (mode() === 'regular') {
      <div class="flex h-full flex-col bg-base-100">
        <header class="flex items-center justify-between border-b border-base-200 px-6 py-4">
          <div class="flex items-center gap-3">
            <h1 class="text-lg font-semibold">Regular newsletter</h1>
          </div>
          <button class="btn btn-outline btn-sm" (click)="switchToOptions()">
            <pc-icon name="arrow-path" class="mr-1"></pc-icon>
            Change type
          </button>
        </header>

        <main class="flex-1 overflow-y-auto px-6 pb-10 pt-6">
          <form [formGroup]="regularForm" class="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <ol class="steps steps-horizontal w-full overflow-x-auto pb-2">
              @for (label of steps; track label; let idx = $index) {
                <li class="step" [class.step-primary]="currentStep() >= idx + 1">
                  <span class="text-xs font-medium">{{ label }}</span>
                </li>
              }
            </ol>

            @switch (currentStep()) {
              @case (1) {
                <div class="space-y-4">
                  <div>
                    <label class="label">Subject</label>
                    <input class="input input-bordered w-full" formControlName="subject" placeholder="Subject line" />
                    @if (isInvalid('subject')) {
                      <p class="mt-1 text-sm text-error">Subject is required.</p>
                    }
                  </div>
                  <div>
                    <label class="label">Preview text</label>
                    <input
                      class="input input-bordered w-full"
                      formControlName="previewText"
                      placeholder="Optional preview"
                    />
                  </div>
                  <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label class="label">From name</label>
                      <input
                        class="input input-bordered w-full"
                        formControlName="fromName"
                        placeholder="Who is sending?"
                      />
                      @if (isInvalid('fromName')) {
                        <p class="mt-1 text-sm text-error">From name is required.</p>
                      }
                    </div>
                    <div>
                      <label class="label">From address</label>
                      <input
                        class="input input-bordered w-full"
                        formControlName="fromAddress"
                        placeholder="sender@example.com"
                      />
                      @if (isInvalid('fromAddress')) {
                        <p class="mt-1 text-sm text-error">Enter a valid email address.</p>
                      }
                    </div>
                  </div>
                </div>
              }
              @case (2) {
                <div class="space-y-4">
                  <div class="rounded border border-base-300 bg-base-100 p-4">
                    <h3 class="text-sm font-semibold uppercase tracking-wide text-base-content/60">Design tools</h3>
                    <p class="mt-1 text-sm text-base-content/70">
                      Paste your HTML design or jot down notes for the team. You can refine this later.
                    </p>
                  </div>
                  <div>
                    <label class="label">HTML content</label>
                    <textarea
                      class="textarea textarea-bordered min-h-40 w-full"
                      formControlName="htmlContent"
                      placeholder="Paste HTML or start drafting..."
                    ></textarea>
                  </div>
                  <div>
                    <label class="label">Plain text version</label>
                    <textarea
                      class="textarea textarea-bordered min-h-32 w-full"
                      formControlName="plainTextContent"
                      placeholder="Optional plain text fallback"
                    ></textarea>
                  </div>
                </div>
              }
              @case (3) {
                <div class="space-y-6">
                  <div>
                    <h3 class="text-sm font-semibold uppercase tracking-wide text-base-content/60">Send to lists</h3>
                    <p class="mt-1 text-sm text-base-content/70">
                      Choose which saved lists should receive this newsletter.
                    </p>
                    @if (loadingLists()) {
                      <div class="mt-3 space-y-2">
                        <div class="skeleton h-4 w-1/2"></div>
                        <div class="skeleton h-4 w-2/3"></div>
                        <div class="skeleton h-4 w-1/3"></div>
                      </div>
                    } @else if (!availableLists().length) {
                      <p class="mt-3 text-sm text-base-content/60">
                        No lists available yet. Create a list to target groups of contacts.
                      </p>
                    } @else {
                      <select class="select select-bordered mt-3 w-full" (change)="handleIncludeListSelect($event)">
                        <option value="">Select a list to include</option>
                        @for (list of availableLists(); track list.id) {
                          <option [value]="list.id" [disabled]="includeListIds().includes(list.id)">
                            {{ list.name }}
                          </option>
                        }
                      </select>
                      <div class="mt-3 flex flex-wrap gap-2">
                        @if (!includeListIds().length) {
                          <span class="text-xs text-base-content/60">No lists selected yet.</span>
                        } @else {
                          @for (listId of includeListIds(); track listId) {
                            <pc-tagitem [name]="listName(listId)" (close)="removeIncludeList(listId)"></pc-tagitem>
                          }
                        }
                      </div>
                    }
                  </div>

                  <div>
                    <h3 class="text-sm font-semibold uppercase tracking-wide text-base-content/60">Send to tags</h3>
                    <p class="mt-1 text-sm text-base-content/70">Target people with specific tags.</p>
                    @if (loadingTags()) {
                      <div class="mt-3 space-y-2">
                        <div class="skeleton h-4 w-1/2"></div>
                        <div class="skeleton h-4 w-2/3"></div>
                        <div class="skeleton h-4 w-1/3"></div>
                      </div>
                    } @else {
                      <div class="mt-3 rounded border border-base-300 bg-base-100 p-3">
                        <pc-tags
                          [tags]="includeTagsList()"
                          [enableAutoComplete]="true"
                          placeholder="Search tags to include"
                          (tagsChange)="handleIncludeTagsChange($event)"
                        ></pc-tags>
                      </div>
                    }
                  </div>

                  <div>
                    <h3 class="text-sm font-semibold uppercase tracking-wide text-base-content/60">Exclude lists</h3>
                    <p class="mt-1 text-sm text-base-content/70">Remove groups that shouldn’t receive this send.</p>
                    @if (loadingLists()) {
                      <div class="mt-3 space-y-2">
                        <div class="skeleton h-4 w-3/4"></div>
                        <div class="skeleton h-4 w-1/2"></div>
                      </div>
                    } @else if (!availableLists().length) {
                      <p class="mt-3 text-sm text-base-content/60">No lists to exclude yet.</p>
                    } @else {
                      <select class="select select-bordered mt-3 w-full" (change)="handleExcludeListSelect($event)">
                        <option value="">Select a list to exclude</option>
                        @for (list of availableLists(); track list.id) {
                          <option [value]="list.id" [disabled]="excludeListIds().includes(list.id)">
                            {{ list.name }}
                          </option>
                        }
                      </select>
                      <div class="mt-3 flex flex-wrap gap-2">
                        @if (!excludeListIds().length) {
                          <span class="text-xs text-base-content/60">No exclusions yet.</span>
                        } @else {
                          @for (listId of excludeListIds(); track listId) {
                            <pc-tagitem [name]="listName(listId)" (close)="removeExcludeList(listId)"></pc-tagitem>
                          }
                        }
                      </div>
                    }
                  </div>

                  <div>
                    <h3 class="text-sm font-semibold uppercase tracking-wide text-base-content/60">Exclude tags</h3>
                    <p class="mt-1 text-sm text-base-content/70">Filter out specific tags to avoid duplicate sends.</p>
                    @if (loadingTags()) {
                      <div class="mt-3 space-y-2">
                        <div class="skeleton h-4 w-3/4"></div>
                        <div class="skeleton h-4 w-1/2"></div>
                      </div>
                    } @else {
                      <div class="mt-3 rounded border border-base-300 bg-base-100 p-3">
                        <pc-tags
                          [tags]="excludeTagsList()"
                          [enableAutoComplete]="true"
                          placeholder="Search tags to exclude"
                          (tagsChange)="handleExcludeTagsChange($event)"
                        ></pc-tags>
                      </div>
                    }
                  </div>

                  <div class="rounded border border-base-200 bg-base-100 p-4">
                    <div class="flex flex-col gap-2">
                      <div class="flex items-center justify-between">
                        <span class="text-sm font-semibold uppercase tracking-wide text-base-content/60">Estimated audience</span>
                        <span class="badge badge-primary badge-sm">{{ estimatedAudienceCount() }} recipients</span>
                      </div>
                      <p class="text-xs text-base-content/60">Counts update automatically as you adjust includes and exclusions.</p>
                    </div>
                  </div>
                </div>
              }
              @case (4) {
                <div class="space-y-5">
                  <div>
                    <h3 class="text-sm font-semibold uppercase tracking-wide text-base-content/60">Send timing</h3>
                    <p class="mt-1 text-sm text-base-content/70">Send immediately or schedule for later.</p>
                  </div>
                  <div class="space-y-3">
                    <label class="flex cursor-pointer items-center gap-3 rounded border border-base-200 px-4 py-3">
                      <input type="radio" class="radio" value="now" formControlName="timingMode" />
                      <div>
                        <p class="font-medium">Send now</p>
                        <p class="text-sm text-base-content/70">We’ll queue and send as soon as you hit send.</p>
                      </div>
                    </label>
                    <label class="flex cursor-pointer items-center gap-3 rounded border border-base-200 px-4 py-3">
                      <input type="radio" class="radio" value="schedule" formControlName="timingMode" />
                      <div>
                        <p class="font-medium">Schedule for later</p>
                        <p class="text-sm text-base-content/70">
                          Pick a date and time. We’ll deliver it automatically.
                        </p>
                      </div>
                    </label>
                  </div>
                  @if (regularForm.get('timingMode')?.value === 'schedule') {
                    <div class="grid gap-4 sm:grid-cols-2">
                      <div class="relative flex flex-col gap-2">
                        <label class="label">Send date</label>
                        <button
                          type="button"
                          class="btn btn-outline normal-case justify-between w-full"
                          (click)="toggleDatePicker()"
                        >
                          <span>{{ scheduledDateDisplay() }}</span>
                          <pc-icon name="chevron-down" class="h-4 w-4"></pc-icon>
                        </button>
                        @if (showDatePicker()) {
                          <div class="absolute left-0 top-full z-20 mt-2">
                            <calendar-date
                              class="cally bg-base-100 border border-base-300 shadow-lg rounded-box"
                              [value]="scheduledDateValue()"
                              (valueChange)="onScheduledDateChange($event)"
                            >
                              <calendar-month></calendar-month>
                            </calendar-date>
                          </div>
                        }
                        <input type="hidden" formControlName="scheduledDate" />
                      </div>
                      <div>
                        <label class="label">Send time</label>
                        <input type="time" class="input input-bordered w-full" formControlName="scheduledTime" />
                      </div>
                      @if (timingNeedsDate()) {
                        <p class="sm:col-span-2 text-sm text-error">
                          Select both a date and time to schedule the send.
                        </p>
                      }
                    </div>
                  }
                </div>
              }
            }

            <div class="mt-4 flex items-center justify-between border-t border-base-200 pt-4">
              <div>
                <button type="button" class="btn btn-ghost" (click)="handleBack()">
                  @if (currentStep() === 1) {
                    <pc-icon name="chevron-left" class="mr-1"></pc-icon>
                    Types
                  } @else {
                    <pc-icon name="chevron-left" class="mr-1"></pc-icon>
                    Back
                  }
                </button>
              </div>
              <div class="flex gap-3">
                @if (currentStep() < steps.length) {
                  <button type="button" class="btn btn-primary" (click)="handleNext()">
                    Next
                    <pc-icon name="chevron-right" class="ml-1"></pc-icon>
                  </button>
                } @else {
                  <button type="button" class="btn btn-primary" (click)="sendRegular()">
                    <pc-icon name="paper-airplane" class="mr-1"></pc-icon>
                    Send
                  </button>
                }
              </div>
            </div>
          </form>
        </main>
      </div>
    } @else {
      <div class="flex h-full flex-col bg-base-100">
        <header class="flex items-center justify-between border-b border-base-200 px-6 py-4">
          <div class="flex items-center gap-3">
            <button class="btn btn-ghost btn-sm" (click)="close()">
              <pc-icon name="arrow-uturn-left" class="mr-1"></pc-icon>
              Back
            </button>
            <h1 class="text-lg font-semibold">Automated journeys</h1>
          </div>
          <button class="btn btn-outline btn-sm" (click)="switchToOptions()">
            <pc-icon name="arrow-path" class="mr-1"></pc-icon>
            Change type
          </button>
        </header>

        <main class="flex-1 overflow-y-auto px-6 pb-10 pt-6">
          <div class="mx-auto max-w-xl rounded-lg border border-dashed border-base-300 bg-base-100 p-6 text-center">
            <pc-icon name="information-circle" class="mx-auto h-10 w-10 text-base-content/50"></pc-icon>
            <h3 class="mt-4 text-lg font-semibold">Automations coming soon</h3>
            <p class="mt-2 text-sm text-base-content/70">
              We’re working on automated journeys. Until then, create a regular newsletter.
            </p>
            <button class="btn btn-primary mt-4" type="button" (click)="selectRegular()">
              Create regular newsletter
            </button>
          </div>
        </main>
      </div>
    }
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class NewsletterAddComponent implements OnInit {
  private readonly alertSvc = inject(AlertService);
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
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

  protected readonly availableLists = signal<Array<{ id: string; name: string; size: number }>>([]);
  protected readonly availableTags = signal<Array<{ id: string; name: string; usage: number }>>([]);
  protected readonly currentStep = signal<StepIndex>(1);
  protected readonly excludeListIds = signal<string[]>([]);
  protected readonly excludeTagsList = signal<string[]>([]);
  protected readonly includeListIds = signal<string[]>([]);
  protected readonly includeTagsList = signal<string[]>([]);
  protected readonly loadingLists = signal<boolean>(false);
  protected readonly loadingTags = signal<boolean>(false);
  private readonly audienceEstimateSeed = signal(0);
  protected readonly showDatePicker = signal(false);
  protected readonly estimatedAudienceCount = computed(() => this.computeEstimatedAudience());
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

  protected scheduledDateValue(): string {
    const control = this.regularForm.get('scheduledDate');
    const value = control?.value;
    return typeof value === 'string' ? value : value ? String(value) : '';
  }

  protected scheduledDateDisplay(): string {
    const value = this.scheduledDateValue();
    if (!value) return 'Select a date';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : this.dateFormatter.format(parsed);
  }

  protected toggleDatePicker(): void {
    this.showDatePicker.update((open) => !open);
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

  protected timingNeedsDate(): boolean {
    return this.requiresScheduleDate();
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
            size:
              Number(row.list_size ?? row.people_count ?? row.household_count ?? row.member_count ?? 0) || 0,
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
            usage:
              Number(row.use_count_people ?? 0) + Number(row.use_count_households ?? 0),
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

  private refreshAudienceEstimate(): void {
    this.audienceEstimateSeed.update((value) => value + 1);
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
