import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { form, required, email, disabled, FormField } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import {
  IAuthUserDetail,
  IUserStatsSnapshot,
  UpdateAuthUserType,
  authRoleLabel,
} from '../../../../../../libs/common/src';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { UserAvatarComponent } from '@uxcommon/components/user-avatar/user-avatar';
import { AuthService } from '../../auth/auth-service';
import { UserService } from '../../services/user.service';
import { Input as PcInput } from '@uxcommon/components/input/input';
import { DetailItem } from '@uxcommon/components/detail-item/detail-item';
import { StatCard } from '@uxcommon/components/stat-card/stat-card';

@Component({
  selector: 'pc-profile-page',
  imports: [DatePipe, PcInput, FormField, Icon, UserAvatarComponent, FormsModule, DecimalPipe, DetailItem, StatCard],
  templateUrl: './profile-page.html',
})
export class ProfilePage implements OnInit {
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);

  private readonly _loading = createLoadingGate();
  protected readonly loading = this._loading.visible;
  protected readonly saving = signal(false);
  protected readonly uploadingAvatar = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly stats = signal<IUserStatsSnapshot | null>(null);
  protected readonly detail = signal<IAuthUserDetail | null>(null);
  protected readonly avatarUrl = signal<string | null>(null);

  // Profile picture cropping state
  protected readonly cropImageSrc = signal<string | null>(null);
  protected readonly cropZoom = signal<number>(1.0);
  protected readonly cropX = signal<number>(0);
  protected readonly cropY = signal<number>(0);
  protected readonly displayWidth = signal<number>(0);
  protected readonly displayHeight = signal<number>(0);

  private cropFileName = '';
  private isDragging = false;
  private startX = 0;
  private startY = 0;

  // Deliberate-save card: identity fields only (name/email). Saved on an explicit Save click.
  protected readonly payload = signal({
    email: '',
    first_name: '',
    last_name: '',
  });

  protected readonly form = form(this.payload, (p) => {
    required(p.email);
    email(p.email);
    required(p.first_name);
    disabled(p.email, () => this.isViewer() || this.saving());
    disabled(p.first_name, () => this.isViewer() || this.saving());
    disabled(p.last_name, () => this.isViewer() || this.saving());
  });

  // Instant-apply card: each email-notification toggle persists immediately (no Save button).
  protected readonly notifPrefs = signal<NotifPrefs>({
    mention_in_comment: true,
    task_assigned: true,
    task_due: true,
    person_assigned: true,
    export_ready: true,
    import_summary: true,
  });
  protected readonly savingNotif = signal<NotifKey | null>(null);

  // Grouped per §20: work-facing alerts vs data-job outcomes.
  protected readonly notifGroups: ReadonlyArray<{
    heading: string;
    items: ReadonlyArray<{ key: NotifKey; title: string; description: string }>;
  }> = [
    {
      heading: 'About your work',
      items: [
        {
          key: 'mention_in_comment',
          title: 'Mentioned in a comment',
          description: 'When someone @-mentions you in a thread',
        },
        { key: 'task_assigned', title: 'Task assigned to you', description: 'When a task is assigned to you' },
        { key: 'task_due', title: 'Task due today or overdue', description: 'A daily reminder of tasks that need you' },
        {
          key: 'person_assigned',
          title: 'Contact assigned to you',
          description: 'When a contact’s ownership moves to you',
        },
      ],
    },
    {
      heading: 'About your data',
      items: [
        { key: 'export_ready', title: 'Export ready', description: 'A download link when your CSV export finishes' },
        { key: 'import_summary', title: 'Import summary', description: 'Completion stats after a spreadsheet import' },
      ],
    },
  ];

  protected readonly isViewer = computed(() => this.detail()?.role === 'viewer');

  /** Product name for the stored role value — 'user' reads as "Editor", same as everywhere else. */
  protected readonly roleLabel = computed(() => authRoleLabel(this.detail()?.role));

  // Narrate unsaved identity edits (§2 disclosure).
  protected readonly dirtyFieldCount = computed(() => {
    const f = this.form;
    return [f.first_name().dirty(), f.last_name().dirty(), f.email().dirty()].filter(Boolean).length;
  });

  protected readonly displayName = computed(() => {
    const user = this.detail();
    if (!user) return '';
    const tokens = [user.first_name, user.last_name].filter((t) => !!t && t.trim().length > 0);
    const name = tokens.join(' ').trim();
    return name || user.email;
  });

  protected readonly initials = computed(() => {
    const first = this.payload().first_name?.trim();
    const last = this.payload().last_name?.trim();
    if (first && last) {
      return (first[0]! + last[0]!).toUpperCase();
    }
    if (first) {
      return first[0]!.toUpperCase();
    }
    const emailStr = this.payload().email?.trim();
    if (emailStr) {
      return emailStr[0]!.toUpperCase();
    }
    return '?';
  });

  protected readonly activityCards = computed(() => {
    const s = this.stats();
    if (!s) return [];
    return [
      {
        key: 'emails',
        title: 'Emails Assigned',
        value: s.emails_assigned.total,
        subtitle: `${s.emails_assigned.open} open · ${s.emails_assigned.closed} closed`,
        asOf: null,
      },
      {
        key: 'contacts',
        title: 'Contacts Added',
        value: s.contacts_added.total,
        subtitle: s.contacts_added.last_created_at ? 'Last new contact' : 'No contacts yet',
        asOf: s.contacts_added.last_created_at,
      },
      {
        key: 'imports',
        title: 'Files Imported',
        value: s.files_imported.count,
        subtitle: `${s.files_imported.total_rows} people imported`,
        asOf: s.files_imported.last_activity_at,
      },
      {
        key: 'exports',
        title: 'Files Exported',
        value: s.files_exported.count,
        subtitle: `${s.files_exported.total_rows} rows exported`,
        asOf: s.files_exported.last_activity_at,
      },
    ];
  });

  public ngOnInit(): void {
    void this.load();
  }

  protected async save(event?: Event) {
    if (event) {
      event.preventDefault();
    }

    this.form().markAsTouched();
    if (this.form().invalid()) {
      return;
    }

    const user = this.detail();
    if (!user) return;

    const payload = this.buildPayload();

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.userService.updateUserProfile(user.id, payload);
      this.alerts.showSuccess('Profile updated successfully');
      await this.load();
      this.form().reset();
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : isRecord(err) &&
              isRecord(err['data']) &&
              typeof err['data']['message'] === 'string' &&
              err['data']['message']
            ? err['data']['message']
            : 'Unable to update profile';
      this.error.set(message);
      this.alerts.showError(message);
    } finally {
      this.saving.set(false);
    }
  }

  protected async cancelEmailChange() {
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.auth.cancelEmailChange();
      this.alerts.showSuccess('Email change canceled and reverted');
      await this.load();
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : isRecord(err) &&
              isRecord(err['data']) &&
              typeof err['data']['message'] === 'string' &&
              err['data']['message']
            ? err['data']['message']
            : 'Unable to cancel email change';
      this.error.set(message);
      this.alerts.showError(message);
    } finally {
      this.saving.set(false);
    }
  }

  protected resetForm() {
    const user = this.detail();
    if (!user) return;
    this.setForm(user);
    this.form().reset();
  }

  protected formatAsOf(date: Date | null): string {
    if (!date) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(date));
    } catch {
      return date.toString();
    }
  }

  protected onAvatarFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.cropFileName = file.name;
    input.value = '';

    // Read the file as a DataURL to display in the crop modal
    const reader = new FileReader();
    reader.onload = () => {
      const imgUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const containerSize = 256;
        const minDimension = Math.min(img.width, img.height);
        const displayScale = containerSize / minDimension;

        this.displayWidth.set(img.width * displayScale);
        this.displayHeight.set(img.height * displayScale);
        this.cropImageSrc.set(imgUrl);
        this.cropZoom.set(1.0);
        this.cropX.set(0);
        this.cropY.set(0);
      };
      img.src = imgUrl;
    };
    reader.readAsDataURL(file);
  }

  protected cancelCrop() {
    this.cropImageSrc.set(null);
  }

  protected onCropDragStart(event: MouseEvent) {
    event.preventDefault();
    this.isDragging = true;
    this.startX = event.clientX - this.cropX();
    this.startY = event.clientY - this.cropY();
  }

  protected onCropDragMove(event: MouseEvent) {
    if (!this.isDragging) return;
    this.cropX.set(event.clientX - this.startX);
    this.cropY.set(event.clientY - this.startY);
  }

  protected onCropDragEnd() {
    this.isDragging = false;
  }

  protected getCropTransformStyle() {
    return `translate(-50%, -50%) translate(${this.cropX()}px, ${this.cropY()}px) scale(${this.cropZoom()})`;
  }

  protected async cropAndUpload() {
    const imgUrl = this.cropImageSrc();
    if (!imgUrl) return;

    this.cropImageSrc.set(null);
    this.uploadingAvatar.set(true);

    try {
      const img = new Image();
      img.src = imgUrl;
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      const containerSize = 256;
      const targetSize = 128;

      // Real scale factor between loaded image dimensions and container dimensions
      const minDimension = Math.min(img.width, img.height);
      const displayScale = containerSize / minDimension;

      const w = img.width * displayScale;
      const h = img.height * displayScale;

      ctx.clearRect(0, 0, targetSize, targetSize);

      ctx.save();
      ctx.translate(targetSize / 2, targetSize / 2);
      ctx.scale(targetSize / containerSize, targetSize / containerSize);
      ctx.translate(this.cropX(), this.cropY());
      ctx.scale(this.cropZoom(), this.cropZoom());
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();

      // Convert canvas to WebP blob (gives optimal compression and small file size)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/webp', 0.85));
      if (!blob) throw new Error('Failed to create WebP image blob');

      const fileExt = this.cropFileName.split('.').pop() ?? 'png';
      const webpFileName = this.cropFileName.replace(new RegExp(`\\.${fileExt}$`), '') + '.webp';
      const webpFile = new File([blob], webpFileName, { type: 'image/webp' });

      const data = await this.auth.uploadAvatar(webpFile);
      this.avatarUrl.set(this.userService.resolveAvatarUrl(data.avatar_url));
      this.alerts.showSuccess('Profile picture updated successfully');
    } catch (err) {
      this.alerts.showError(err instanceof Error && err.message ? err.message : 'Failed to crop/upload avatar');
    } finally {
      this.uploadingAvatar.set(false);
    }
  }

  protected async removeAvatar() {
    this.uploadingAvatar.set(true);
    try {
      await this.auth.deleteAvatar();
      this.avatarUrl.set(null);
      this.alerts.showSuccess('Profile picture removed');
    } catch (err) {
      this.alerts.showError(err instanceof Error && err.message ? err.message : 'Failed to remove avatar');
    } finally {
      this.uploadingAvatar.set(false);
    }
  }

  private async load() {
    const end = this._loading.begin();
    this.error.set(null);
    try {
      // First ensure we have/refresh current user
      const currentUser = await this.auth.getCurrentUser();
      if (!currentUser) {
        throw new Error('Not logged in');
      }

      const user = await this.userService.getProfileById(currentUser.id);
      this.detail.set(user);
      this.stats.set(user.stats as any);
      this.avatarUrl.set(this.userService.resolveAvatarUrl((user as any).avatar_url));
      this.setForm(user);
      this.form().reset();
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : isRecord(err) &&
              isRecord(err['data']) &&
              typeof err['data']['message'] === 'string' &&
              err['data']['message']
            ? err['data']['message']
            : 'Failed to load profile';
      this.error.set(message);
      this.alerts.showError(message);
    } finally {
      end();
    }
  }

  private setForm(user: IAuthUserDetail) {
    const prefs = user.notification_preferences;
    this.payload.set({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name ?? '',
    });
    this.notifPrefs.set({
      mention_in_comment: prefs?.mention_in_comment ?? true,
      task_assigned: prefs?.task_assigned ?? true,
      task_due: prefs?.task_due ?? true,
      person_assigned: prefs?.person_assigned ?? true,
      export_ready: prefs?.export_ready ?? true,
      import_summary: prefs?.import_summary ?? true,
    });
  }

  private buildPayload(): UpdateAuthUserType {
    const raw = this.payload();
    const normalize = (value: string | null | undefined) => {
      const trimmed = value?.trim() ?? '';
      return trimmed.length ? trimmed : null;
    };
    // Identity only — notification preferences are persisted instantly by their own card.
    return {
      email: raw.email?.trim() ?? '',
      first_name: raw.first_name?.trim() ?? '',
      last_name: normalize(raw.last_name),
    } as UpdateAuthUserType;
  }

  // Instant-apply: flip one toggle and persist just the notification preferences.
  protected async toggleNotif(key: NotifKey): Promise<void> {
    if (this.isViewer() || this.savingNotif()) return;
    const user = this.detail();
    if (!user) return;

    const previous = this.notifPrefs();
    const next: NotifPrefs = { ...previous, [key]: !previous[key] };
    this.notifPrefs.set(next);
    this.savingNotif.set(key);
    // Profile only toggles the 6 email prefs; preserve the untouched in-app
    // variants (and default any missing) so the full 12-field shape stays valid.
    const fullPrefs: NonNullable<IAuthUserDetail['notification_preferences']> = {
      ...FULL_NOTIF_DEFAULTS,
      ...user.notification_preferences,
      ...next,
    };
    try {
      await this.userService.updateUserProfile(user.id, {
        notification_preferences: fullPrefs,
      } as UpdateAuthUserType);
      this.detail.set({ ...user, notification_preferences: fullPrefs });
    } catch (err) {
      // Roll the toggle back so the UI never lies about what's stored.
      this.notifPrefs.set(previous);
      this.alerts.showError(
        err instanceof Error && err.message ? err.message : 'Could not save your notification preference',
      );
    } finally {
      this.savingNotif.set(null);
    }
  }
}

type NotifPrefs = {
  mention_in_comment: boolean;
  task_assigned: boolean;
  task_due: boolean;
  person_assigned: boolean;
  export_ready: boolean;
  import_summary: boolean;
};

type NotifKey = keyof NotifPrefs;

// Complete 12-field default (email + in-app variants) so a persisted preferences
// object always satisfies the canonical shape even when the source is undefined.
const FULL_NOTIF_DEFAULTS: NonNullable<IAuthUserDetail['notification_preferences']> = {
  mention_in_comment: true,
  mention_in_comment_in_app: true,
  task_assigned: true,
  task_assigned_in_app: true,
  task_due: true,
  task_due_in_app: true,
  person_assigned: true,
  person_assigned_in_app: true,
  export_ready: true,
  export_ready_in_app: true,
  import_summary: true,
  import_summary_in_app: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
