import { Component, computed, effect, inject, model, output, signal } from '@angular/core';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';

import { IAuthUserDetail, UpdateAuthUserType } from '../../../../../../../libs/common/src';
import { AuthService } from '../../../auth/auth-service';
import { UserService } from '../../../services/user.service';
import { ThemePreference, ThemeService } from '../../../layout/theme/theme-service';
import { PasskeySettingsComponent } from '../security/passkey-settings';

interface NotifRow {
  emailKey: string;
  helper: string;
  inAppKey: string;
  label: string;
}

const NOTIF_ROWS: NotifRow[] = [
  {
    label: 'Mentioned in comment',
    helper: 'When someone mentions you in a thread',
    emailKey: 'mention_in_comment',
    inAppKey: 'mention_in_comment_in_app',
  },
  {
    label: 'Task assigned',
    helper: 'When a task is assigned to you',
    emailKey: 'task_assigned',
    inAppKey: 'task_assigned_in_app',
  },
  {
    label: 'Task due today / overdue',
    helper: 'Daily reminder of active tasks due',
    emailKey: 'task_due',
    inAppKey: 'task_due_in_app',
  },
  {
    label: 'Person assigned',
    helper: 'When contact ownership is assigned to you',
    emailKey: 'person_assigned',
    inAppKey: 'person_assigned_in_app',
  },
  {
    label: 'Export ready',
    helper: 'Download link when a CSV export finishes',
    emailKey: 'export_ready',
    inAppKey: 'export_ready_in_app',
  },
  {
    label: 'Import summary',
    helper: 'Completion stats after a spreadsheet import',
    emailKey: 'import_summary',
    inAppKey: 'import_summary_in_app',
  },
];

/**
 * Personal Settings popup (§5a) — instant apply, no Save/Reset. Everything here is
 * scoped to the signed-in user: notification matrix, appearance (theme + density),
 * and passkeys. Reuses the notification-preferences model and PasskeySettings.
 */
@Component({
  selector: 'pc-personal-settings-dialog',
  imports: [Icon, PasskeySettingsComponent],
  templateUrl: 'personal-settings-dialog.html',
})
export class PersonalSettingsDialog {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly alerts = inject(AlertService);
  protected readonly theme = inject(ThemeService);

  protected readonly themeOptions: { label: string; value: ThemePreference }[] = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' },
  ];

  /** Two-way open state, driven by the navbar avatar menu. */
  public readonly open = model<boolean>(false);
  public readonly closed = output<void>();

  protected readonly rows = NOTIF_ROWS;

  private readonly user = signal<IAuthUserDetail | null>(null);
  private loadStarted = false;
  protected readonly prefs = signal<Record<string, boolean>>({});
  protected readonly savedJustNow = signal<boolean>(false);

  protected readonly initial = computed<string>(() => {
    const u = this.user();
    const src = u?.first_name || u?.email || '?';
    return src.charAt(0).toUpperCase();
  });

  constructor() {
    // Load lazily on first open (the dialog is always mounted in the navbar) and
    // reset the footer contract to its resting state each time it opens.
    effect(() => {
      if (!this.open()) return;
      this.savedJustNow.set(false);
      if (!this.loadStarted) {
        this.loadStarted = true;
        void this.load();
      }
    });
  }

  protected isOn(key: string): boolean {
    return this.prefs()[key] ?? true;
  }

  protected toggle(key: string): void {
    this.prefs.update((p) => ({ ...p, [key]: !(p[key] ?? true) }));
    void this.persistNotifications();
  }

  protected setThemePreference(next: ThemePreference): void {
    if (this.theme.getPreference() === next) return;
    this.theme.setPreference(next);
    this.flashSaved();
  }

  protected close(): void {
    this.open.set(false);
    this.closed.emit();
  }

  private async load(): Promise<void> {
    try {
      const current = await this.auth.getCurrentUser();
      if (!current) return;
      const detail = await this.userService.getProfileById(current.id);
      this.user.set(detail);
      const p = detail.notification_preferences ?? {};
      const next: Record<string, boolean> = {};
      for (const row of NOTIF_ROWS) {
        next[row.emailKey] = (p as Record<string, boolean | undefined>)[row.emailKey] ?? true;
        next[row.inAppKey] = (p as Record<string, boolean | undefined>)[row.inAppKey] ?? true;
      }
      this.prefs.set(next);
    } catch (err) {
      console.error('Failed to load personal settings', err);
    }
  }

  private async persistNotifications(): Promise<void> {
    const user = this.user();
    if (!user) return;
    const p = this.prefs();
    const payload: UpdateAuthUserType = {
      notification_preferences: {
        mention_in_comment: p['mention_in_comment'] ?? true,
        mention_in_comment_in_app: p['mention_in_comment_in_app'] ?? true,
        task_assigned: p['task_assigned'] ?? true,
        task_assigned_in_app: p['task_assigned_in_app'] ?? true,
        task_due: p['task_due'] ?? true,
        task_due_in_app: p['task_due_in_app'] ?? true,
        person_assigned: p['person_assigned'] ?? true,
        person_assigned_in_app: p['person_assigned_in_app'] ?? true,
        export_ready: p['export_ready'] ?? true,
        export_ready_in_app: p['export_ready_in_app'] ?? true,
        import_summary: p['import_summary'] ?? true,
        import_summary_in_app: p['import_summary_in_app'] ?? true,
      },
    };
    try {
      await this.userService.updateUserProfile(user.id, payload);
      this.flashSaved();
    } catch (err) {
      this.alerts.showError(err instanceof Error && err.message ? err.message : 'Could not save your preference.');
    }
  }

  private flashSaved(): void {
    this.savedJustNow.set(true);
  }
}
