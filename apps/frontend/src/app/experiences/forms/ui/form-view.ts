import { Component, effect, inject, input, signal, computed, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';
import { RecordActivities } from '@experiences/activity/ui/record-activities/record-activities';
import { FormsService } from '../services/forms-service';
import { ListsService } from '../../lists/services/lists-service';
import { UserService } from '../../../services/user.service';
import { type IAuthUser } from '../../../../../../../libs/common/src';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { Card as PcCard } from '@uxcommon/components/card/card';
import { Tabs, TabPanel, PcTabOption } from '@uxcommon/components/tabs/tabs';
import { StatCard } from '@uxcommon/components/stat-card/stat-card';
import { ProfileCard } from '@uxcommon/components/profile-card/profile-card';
import { DetailRow } from '@uxcommon/components/detail-row/detail-row';
import { DetailLayout } from '@uxcommon/components/detail-layout/detail-layout';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'pc-form-view',
  imports: [
    DatePipe,
    RouterModule,
    Icon,
    RecordActivities,
    DetailLayout,
    PcCard,
    Tabs,
    TabPanel,
    StatCard,
    ProfileCard,
    DetailRow,
  ],
  templateUrl: './form-view.html',
})
export class FormViewComponent {
  private readonly alertSvc = inject(AlertService);
  private readonly formsSvc = inject(FormsService);
  private readonly listsSvc = inject(ListsService);
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly dialogs = inject(ConfirmDialogService);

  readonly id = input.required<string>();
  private readonly _loading = createLoadingGate();
  protected readonly isLoading = this._loading.visible;
  protected readonly initialized = signal(false);
  protected readonly formRecord = signal<any | null>(null);
  protected readonly submissionsCount = signal(0);
  protected readonly availableLists = signal<Array<{ id: string; name: string }>>([]);
  protected readonly users = signal<IAuthUser[]>([]);
  private readonly router = inject(Router);
  private usersById = new Map<string, IAuthUser>();

  // Active tab state
  protected activeTab = signal<string>('activity');

  protected readonly formTabs = computed<PcTabOption[]>(() => [
    { id: 'activity', label: 'Activity Feed', icon: 'adjustments-horizontal' },
    { id: 'targetActions', label: 'Target Lists & Actions', icon: 'queue-list' },
    { id: 'fieldsPreview', label: 'Fields & Layout', icon: 'information-circle' },
  ]);

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
    if (!record || !this.id()) return '';
    const apiOrigin = environment.apiUrl.replace(/\/$/, '');
    const fields = this.selectedFields();
    return `<!-- PeopleCRM Embeddable Form -->
<form action="${apiOrigin}/api/forms/submit/${this.id()}" method="POST" style="max-width: 400px; font-family: sans-serif;">
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
    if (!this.id()) return '';
    return environment.apiUrl.replace(/\/$/, '') + `/api/forms/view/${this.id()}`;
  });

  constructor() {
    effect(() => {
      const currentId = this.id();
      untracked(() => this.loadAllData(currentId));
    });

    // Load users
    this.userService
      .getUsers()
      .then((u) => {
        this.users.set(u);
        this.usersById = new Map(u.map((x) => [x.id, x]));
      })
      .catch(() => void 0);
  }

  protected async loadAllData(id: string) {
    const end = this._loading.begin();
    try {
      // 1. Load Form details
      const record = await this.formsSvc.getById(id);
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
      const subCount = await this.formsSvc.getSubmissionsCount(id);
      this.submissionsCount.set(subCount);
    } catch (err) {
      this.alertSvc.showError('Failed to load form details: ' + String(err));
    } finally {
      end();
      this.initialized.set(true);
    }
  }

  protected editForm() {
    this.router.navigate(['edit'], { relativeTo: this.route });
  }

  protected async deleteForm() {
    if (!this.id()) return;
    const confirmed = await this.dialogs.confirm({
      title: 'Delete Web Form',
      message: 'Are you sure you want to delete this web form? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    const end = this._loading.begin();
    try {
      await this.formsSvc.delete(this.id());
      this.formsSvc.triggerRefresh();
      this.alertSvc.showSuccess('Web form deleted');
      await this.router.navigate(['/forms']);
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to delete web form';
      this.alertSvc.showError(message);
    } finally {
      end();
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
