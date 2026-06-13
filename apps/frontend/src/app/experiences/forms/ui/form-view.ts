import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';
import { RecordActivities } from '@uxcommon/components/record-activities/record-activities';
import { FormsService } from '../services/forms-service';
import { ListsService } from '../../lists/services/lists-service';
import { AuthService } from '../../../auth/auth-service';
import { type IAuthUser } from '@common';
import { FormActions } from '@uxcommon/components/form-actions/form-actions';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

@Component({
  selector: 'pc-form-view',
  imports: [DatePipe, RouterModule, Icon, RecordActivities, FormActions],
  template: `
    <div class="flex min-h-full flex-col bg-base-200/50 p-6">
      <div class="max-w-7xl mx-auto w-full flex flex-col gap-6">
        <div class="flex items-center justify-between border-b border-base-300 pb-4">
          <h1 class="text-2xl font-bold text-base-content flex items-center gap-2">
            <pc-icon name="clipboard-document-list" class="text-primary" [size]="6"></pc-icon>
            Web Form Details
          </h1>
          <pc-form-actions
            [isLoading]="isLoading()"
            [btn1Text]="'Edit Form'"
            [btn1Icon]="'pencil-square'"
            [showDelete]="true"
            [deleteText]="'Delete Form'"
            (deleteClicked)="deleteForm()"
            (btn1Clicked)="editForm()"
          ></pc-form-actions>
        </div>

        @if (isLoading()) {
          <div class="flex justify-center items-center py-20">
            <progress class="progress w-56"></progress>
          </div>
        } @else if (formRecord()) {
          <!-- Main Content Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left Column: Form Info & Embed Code -->
            <div class="lg:col-span-1 flex flex-col gap-6">
              <!-- Elegant Form Details Card -->
              <div class="card bg-base-100 shadow-xl overflow-hidden border border-base-300">
                <div class="h-24 bg-gradient-to-r from-primary/20 via-primary/30 to-secondary/20"></div>

                <div class="px-6 pb-6 relative flex flex-col items-center">
                  <!-- Form Icon Avatar -->
                  <div class="avatar placeholder -mt-12 mb-3">
                    <div
                      class="bg-gradient-to-tr from-primary to-secondary text-primary-content rounded-full w-24 h-24 ring ring-base-100 ring-offset-4 text-3xl font-bold flex items-center justify-center shadow-lg"
                    >
                      <pc-icon name="clipboard-document-list" [size]="8"></pc-icon>
                    </div>
                  </div>

                  <!-- Name & Status -->
                  <h2 class="text-xl font-bold text-base-content text-center mb-1">{{ formRecord().name }}</h2>
                  <div class="flex gap-2 mb-4">
                    <span
                      class="badge font-semibold uppercase text-xs"
                      [class.badge-success]="formRecord().status === 'active'"
                      [class.badge-warning]="formRecord().status === 'archived'"
                    >
                      {{ formRecord().status }}
                    </span>
                  </div>

                  <!-- Details and settings list -->
                  <div class="w-full flex flex-col gap-3 text-sm border-t border-base-200 pt-4">
                    @if (formRecord().description) {
                      <div class="p-3 bg-base-200/30 rounded-lg text-xs text-base-content/70">
                        {{ formRecord().description }}
                      </div>
                    }

                    @if (formRecord().redirect_url) {
                      <div class="flex items-center gap-2 p-2 rounded-lg bg-base-200/50 text-base-content/85">
                        <pc-icon name="arrow-top-right-on-square" [size]="4" class="text-indigo-500 shrink-0"></pc-icon>
                        <span class="truncate"
                          >Redirect: <strong>{{ formRecord().redirect_url }}</strong></span
                        >
                      </div>
                    }

                    <div class="flex items-center justify-between p-2 rounded-lg bg-base-200/50 text-base-content/85">
                      <div class="flex items-center gap-2">
                        <pc-icon name="envelope" [size]="4" class="text-teal-500"></pc-icon>
                        <span>Send Confirmation:</span>
                      </div>
                      <span class="font-bold">{{ formRecord().send_confirmation !== false ? 'Yes' : 'No' }}</span>
                    </div>

                    <div class="flex items-center justify-between p-2 rounded-lg bg-base-200/50 text-base-content/85">
                      <div class="flex items-center gap-2">
                        <pc-icon name="bell" [size]="4" class="text-purple-500"></pc-icon>
                        <span>Send Admin Alert:</span>
                      </div>
                      <span class="font-bold">{{ formRecord().send_alert !== false ? 'Yes' : 'No' }}</span>
                    </div>
                  </div>

                  <!-- System Metadata -->
                  <div
                    class="w-full mt-6 pt-4 border-t border-base-200 text-[10px] text-base-content/40 flex justify-between leading-normal"
                  >
                    <span
                      >Created by {{ getUserName(formRecord().createdby_id) }} on
                      {{ getCreatedAt() | date: 'M/d/yyyy' }}</span
                    >
                    <span
                      >Updated {{ getUpdatedAt() | date: 'M/d/yyyy' }} by
                      {{ getUserName(formRecord().updatedby_id) }}</span
                    >
                  </div>
                </div>
              </div>

              <!-- HTML Embed Snippet Card -->
              <div class="card bg-base-100 shadow-xl border border-base-300 p-6 flex flex-col gap-4">
                <div class="flex items-center justify-between border-b border-base-200 pb-2">
                  <h3 class="text-xs font-bold uppercase tracking-wider text-base-content/70">Deploy & Embed</h3>
                  <button class="btn btn-xs btn-outline btn-primary" (click)="copySnippet()">
                    <pc-icon name="document-duplicate" [size]="3"></pc-icon> Copy Code
                  </button>
                </div>

                <div class="form-control text-xs">
                  <label class="label font-semibold py-1">Public Landing Page URL</label>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      [value]="formUrl()"
                      readonly
                      class="input input-bordered input-xs flex-1 font-mono text-[10px]"
                    />
                    <a [href]="formUrl()" target="_blank" class="btn btn-xs btn-outline btn-secondary px-2">
                      <pc-icon name="arrow-top-right-on-square" [size]="3"></pc-icon>
                    </a>
                  </div>
                </div>

                <div class="form-control text-xs">
                  <label class="label font-semibold py-1">Embed HTML Code</label>
                  <pre
                    class="bg-neutral text-neutral-content p-3 rounded-lg text-[10px] font-mono max-h-40 overflow-y-auto select-all leading-snug"
                    >{{ embedSnippet() }}</pre
                  >
                </div>
              </div>
            </div>

            <!-- Right Column: Stats & Tabs -->
            <div class="lg:col-span-2 flex flex-col gap-6">
              <!-- Stats Panel -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="card bg-base-100 border border-base-300 shadow-md">
                  <div class="card-body p-5 flex flex-row items-center justify-between">
                    <div>
                      <span class="text-xs text-base-content/50 uppercase font-semibold">Submissions</span>
                      <h3 class="text-2xl font-bold text-indigo-500 mt-1">{{ submissionsCount() }}</h3>
                      <p class="text-[10px] text-base-content/40 mt-0.5">Total lead contacts collected</p>
                    </div>
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center text-indigo-500">
                      <pc-icon name="envelope" [size]="6"></pc-icon>
                    </div>
                  </div>
                </div>

                <div class="card bg-base-100 border border-base-300 shadow-md">
                  <div class="card-body p-5 flex flex-row items-center justify-between">
                    <div>
                      <span class="text-xs text-base-content/50 uppercase font-semibold">Fields Included</span>
                      <h3 class="text-2xl font-bold text-amber-500 mt-1">{{ fieldsCount() }}</h3>
                      <p class="text-[10px] text-base-content/40 mt-0.5">Active field inputs</p>
                    </div>
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center text-amber-500">
                      <pc-icon name="queue-list" [size]="6"></pc-icon>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tabs Panel -->
              <div class="card bg-base-100 shadow-xl border border-base-300 flex-grow">
                <!-- Tabs Header -->
                <div role="tablist" class="tabs tabs-lifted w-full pt-4 px-4">
                  <a
                    role="tab"
                    class="tab focus:outline-none cursor-pointer inline-flex items-center justify-center gap-1.5"
                    [class.tab-active]="activeTab() === 'activity'"
                    (click)="activeTab.set('activity')"
                  >
                    <pc-icon name="adjustments-horizontal" [size]="4" class="flex-shrink-0"></pc-icon>
                    <span>Activity Feed</span>
                  </a>
                  <a
                    role="tab"
                    class="tab focus:outline-none cursor-pointer inline-flex items-center justify-center gap-1.5"
                    [class.tab-active]="activeTab() === 'targetActions'"
                    (click)="activeTab.set('targetActions')"
                  >
                    <pc-icon name="paper-airplane" [size]="4" class="flex-shrink-0"></pc-icon>
                    <span>Actions & Mapping</span>
                  </a>
                  <a
                    role="tab"
                    class="tab focus:outline-none cursor-pointer inline-flex items-center justify-center gap-1.5"
                    [class.tab-active]="activeTab() === 'fieldsPreview'"
                    (click)="activeTab.set('fieldsPreview')"
                  >
                    <pc-icon name="pencil-square" [size]="4" class="flex-shrink-0"></pc-icon>
                    <span>Fields Configuration</span>
                  </a>
                </div>

                <!-- Tab Panels -->
                <div class="p-6">
                  <!-- Panel: General Activity Feed -->
                  @if (activeTab() === 'activity') {
                    <div class="flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-1">
                      <pc-record-activities [entity]="'web_forms'" [entityId]="id!"></pc-record-activities>
                    </div>
                  }

                  <!-- Panel: Target Actions / Lists / Tags -->
                  @if (activeTab() === 'targetActions') {
                    <div class="flex flex-col gap-5 text-sm">
                      <div>
                        <h4 class="font-semibold text-base-content mb-1">Add to Lists</h4>
                        @if (targetListsNames().length > 0) {
                          <div class="flex flex-wrap gap-1.5">
                            @for (list of targetListsNames(); track list) {
                              <span class="badge badge-neutral px-3 py-2.5">{{ list }}</span>
                            }
                          </div>
                        } @else {
                          <span class="text-xs text-base-content/40 italic">No specific list assigned.</span>
                        }
                      </div>

                      <div>
                        <h4 class="font-semibold text-base-content mb-1">Apply Tags</h4>
                        <div class="flex flex-wrap gap-1.5">
                          @if (formRecord().target_tags?.length > 0) {
                            @for (tag of formRecord().target_tags; track tag) {
                              <span class="badge badge-outline badge-primary px-3 py-2.5">{{ tag }}</span>
                            }
                          }
                          <!-- Automatic system tag -->
                          <span class="badge badge-outline badge-secondary px-3 py-2.5"
                            >Source: {{ formRecord().name }}</span
                          >
                        </div>
                      </div>
                    </div>
                  }

                  <!-- Panel: Fields Configuration Preview -->
                  @if (activeTab() === 'fieldsPreview') {
                    <div class="flex flex-col gap-4">
                      <h4 class="font-semibold text-base-content">Form Input Preview</h4>
                      <div class="rounded-xl border border-base-200 bg-base-200/20 p-4 max-w-sm">
                        @if (selectedFields().includes('first_name')) {
                          <div class="form-control mb-3">
                            <span class="text-[10px] font-semibold uppercase text-base-content/50">First Name</span>
                            <input
                              type="text"
                              class="input input-bordered input-xs"
                              placeholder="First Name"
                              disabled
                            />
                          </div>
                        }
                        @if (selectedFields().includes('last_name')) {
                          <div class="form-control mb-3">
                            <span class="text-[10px] font-semibold uppercase text-base-content/50">Last Name</span>
                            <input type="text" class="input input-bordered input-xs" placeholder="Last Name" disabled />
                          </div>
                        }
                        <div class="form-control mb-3">
                          <span class="text-[10px] font-semibold uppercase text-base-content/50">Email Address *</span>
                          <input
                            type="text"
                            class="input input-bordered input-xs"
                            placeholder="you@example.com"
                            disabled
                          />
                        </div>
                        @if (selectedFields().includes('mobile')) {
                          <div class="form-control mb-3">
                            <span class="text-[10px] font-semibold uppercase text-base-content/50">Mobile / Phone</span>
                            <input
                              type="text"
                              class="input input-bordered input-xs"
                              placeholder="Phone Number"
                              disabled
                            />
                          </div>
                        }
                        @if (selectedFields().includes('notes')) {
                          <div class="form-control mb-3">
                            <span class="text-[10px] font-semibold uppercase text-base-content/50"
                              >Notes / Message</span
                            >
                            <textarea
                              class="textarea textarea-bordered textarea-xs"
                              placeholder="How can we help?"
                              disabled
                            ></textarea>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        } @else {
          <div class="alert alert-error">
            <pc-icon name="exclamation-triangle" [size]="6"></pc-icon>
            <span>Web form not found or failed to load.</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class FormViewComponent implements OnInit {
  private readonly alertSvc = inject(AlertService);
  private readonly formsSvc = inject(FormsService);
  private readonly listsSvc = inject(ListsService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly dialogs = inject(ConfirmDialogService);

  protected id: string | null = null;
  protected readonly isLoading = signal(false);
  protected readonly formRecord = signal<any | null>(null);
  protected readonly submissionsCount = signal(0);
  protected readonly availableLists = signal<Array<{ id: string; name: string }>>([]);
  protected readonly users = signal<IAuthUser[]>([]);
  private readonly router = inject(Router);
  private usersById = new Map<string, IAuthUser>();

  // Active tab state
  protected activeTab = signal<'activity' | 'targetActions' | 'fieldsPreview'>('activity');

  protected readonly selectedFields = computed(() => {
    const record = this.formRecord();
    if (!record) return [];
    if (record.fields) {
      return Array.isArray(record.fields) ? record.fields : JSON.parse(record.fields);
    }
    return ['first_name', 'last_name', 'email', 'mobile', 'notes'];
  });

  protected readonly fieldsCount = computed(() => {
    const fields = this.selectedFields();
    // Email is always required and present
    const standardFieldsCount = fields.filter((f: string) => f !== 'email').length;
    return standardFieldsCount + 1;
  });

  protected readonly targetListsNames = computed(() => {
    const record = this.formRecord();
    if (!record || !record.target_lists) return [];
    const listIds: string[] = Array.isArray(record.target_lists)
      ? record.target_lists
      : JSON.parse(record.target_lists || '[]');

    return listIds.map((id) => this.availableLists().find((l) => l.id === id)?.name).filter(Boolean) as string[];
  });

  protected readonly embedSnippet = computed(() => {
    const record = this.formRecord();
    if (!record || !this.id) return '';
    const apiOrigin = window.location.origin.replace(':4200', ':5000');
    const fields = this.selectedFields();
    return `<!-- PeopleCRM Embeddable Form -->
<form action="${apiOrigin}/api/forms/submit/${this.id}" method="POST" style="max-width: 400px; font-family: sans-serif;">
  <input type="text" name="_hp" style="display:none !important" tabindex="-1" autocomplete="off" />
${
  fields.includes('first_name')
    ? `  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">First Name</label>
    <input type="text" name="first_name" placeholder="First Name" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>`
    : ''
}${
      fields.includes('last_name')
        ? `\n  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Last Name</label>
    <input type="text" name="last_name" placeholder="Last Name" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>`
        : ''
    }
  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Email Address *</label>
    <input type="email" name="email" placeholder="you@example.com" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>${
    fields.includes('mobile')
      ? `\n  <div style="margin-bottom: 12px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Mobile / Phone</label>
    <input type="text" name="mobile" placeholder="Phone Number" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" />
  </div>`
      : ''
  }${
    fields.includes('notes')
      ? `\n  <div style="margin-bottom: 16px;">
    <label style="display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px;">Notes / Message</label>
    <textarea name="notes" placeholder="How can we help?" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; resize: vertical;"></textarea>
  </div>`
      : ''
  }
  <button type="submit" style="background-color: #0ea5e9; color: white; padding: 10px 16px; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; width: 100%;">Subscribe</button>
</form>`;
  });

  protected readonly formUrl = computed(() => {
    if (!this.id) return '';
    return window.location.origin.replace(':4200', ':5000') + `/api/forms/view/${this.id}`;
  });

  constructor() {
    this.id = this.route.snapshot.paramMap.get('id');

    // Load users
    this.auth
      .getUsers()
      .then((u) => {
        this.users.set(u);
        this.usersById = new Map(u.map((x) => [x.id, x]));
      })
      .catch(() => void 0);
  }

  public ngOnInit() {
    void this.loadAllData();
  }

  protected async loadAllData() {
    if (!this.id) return;
    this.isLoading.set(true);
    try {
      // 1. Load Form details
      const record = await this.formsSvc.getById(this.id);
      this.formRecord.set(record);

      // 2. Load available Lists to resolve list names
      const result = await this.listsSvc.getAll({ limit: 100 });
      const rows = Array.isArray(result?.rows) ? result.rows : [];
      this.availableLists.set(
        rows.map((row: any) => ({
          id: String(row.id),
          name: String(row.name),
        })),
      );

      // 3. Load submissions count
      const subCount = await this.formsSvc.getSubmissionsCount(this.id);
      this.submissionsCount.set(subCount);
    } catch (err) {
      this.alertSvc.showError('Failed to load form details: ' + String(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  protected editForm() {
    this.router.navigate(['edit'], { relativeTo: this.route });
  }

  protected async deleteForm() {
    if (!this.id) return;
    const confirmed = await this.dialogs.confirm({
      title: 'Delete Web Form',
      message: 'Are you sure you want to delete this web form? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    this.isLoading.set(true);
    try {
      await this.formsSvc.delete(this.id);
      this.formsSvc.triggerRefresh();
      this.alertSvc.showSuccess('Web form deleted');
      await this.router.navigate(['/forms']);
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to delete web form';
      this.alertSvc.showError(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected copySnippet(): void {
    const code = this.embedSnippet();
    if (!code) return;
    navigator.clipboard.writeText(code).then(
      () => this.alertSvc.showSuccess('Form HTML snippet copied to clipboard!'),
      () => this.alertSvc.showError('Failed to copy to clipboard.'),
    );
  }

  protected getCreatedAt(): Date | null {
    const date = this.formRecord()?.created_at;
    return date ? new Date(date) : null;
  }

  protected getUpdatedAt(): Date | null {
    const date = this.formRecord()?.updated_at;
    return date ? new Date(date) : null;
  }

  protected getUserName(id: string | null | undefined): string {
    if (!id) return '?';
    return this.usersById.get(String(id))?.first_name ?? '?';
  }
}
