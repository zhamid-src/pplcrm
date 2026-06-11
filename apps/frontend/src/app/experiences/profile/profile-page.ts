import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { form, required, email, FormField, disabled } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { IAuthUserDetail, IUserStatsSnapshot, UpdateAuthUserType } from '@common';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@icons/icon';
import { UserAvatarComponent } from '@uxcommon/components/user-avatar/user-avatar';
import { AuthService } from '../../auth/auth-service';

@Component({
  selector: 'pc-profile-page',
  imports: [DatePipe, FormField, Icon, UserAvatarComponent, FormsModule, DecimalPipe],
  templateUrl: './profile-page.html',
})
export class ProfilePage implements OnInit {
  private readonly alerts = inject(AlertService);
  private readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
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

  protected readonly payload = signal({
    email: '',
    first_name: '',
    last_name: '',
    mention_in_comment: true,
    task_assigned: true,
    task_due: true,
    person_assigned: true,
    export_ready: true,
    import_summary: true,
  });

  protected readonly form = form(this.payload, (p) => {
    required(p.email);
    email(p.email);
    required(p.first_name);
    disabled(p.email, () => this.isViewer() || this.saving());
    disabled(p.first_name, () => this.isViewer() || this.saving());
    disabled(p.last_name, () => this.isViewer() || this.saving());
    disabled(p.mention_in_comment, () => this.isViewer() || this.saving());
    disabled(p.task_assigned, () => this.isViewer() || this.saving());
    disabled(p.task_due, () => this.isViewer() || this.saving());
    disabled(p.person_assigned, () => this.isViewer() || this.saving());
    disabled(p.export_ready, () => this.isViewer() || this.saving());
    disabled(p.import_summary, () => this.isViewer() || this.saving());
  });

  protected readonly isViewer = computed(() => this.detail()?.role === 'viewer');

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
      return (first[0] + last[0]).toUpperCase();
    }
    if (first) {
      return first[0].toUpperCase();
    }
    const emailStr = this.payload().email?.trim();
    if (emailStr) {
      return emailStr[0].toUpperCase();
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
        icon: 'envelope' as const,
        asOf: null,
      },
      {
        key: 'contacts',
        title: 'Contacts Added',
        value: s.contacts_added.total,
        subtitle: s.contacts_added.last_created_at ? 'Last new contact' : 'No contacts yet',
        icon: 'users' as const,
        asOf: s.contacts_added.last_created_at,
      },
      {
        key: 'imports',
        title: 'Files Imported',
        value: s.files_imported.count,
        subtitle: `${s.files_imported.total_rows} people imported`,
        icon: 'arrow-down-tray' as const,
        asOf: s.files_imported.last_activity_at,
      },
      {
        key: 'exports',
        title: 'Files Exported',
        value: s.files_exported.count,
        subtitle: `${s.files_exported.total_rows} rows exported`,
        icon: 'arrow-up-tray' as const,
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
      await this.auth.updateUserProfile(user.id, payload);
      this.alerts.showSuccess('Profile updated successfully');
      await this.load();
      this.form().reset();
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to update profile';
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
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Unable to cancel email change';
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

  /** Triggered when user picks a file via the hidden input. */
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

  /** Render the cropped image on canvas and upload as WebP */
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
      this.avatarUrl.set(data.avatar_url ?? null);
      this.alerts.showSuccess('Profile picture updated successfully');
    } catch (err: any) {
      this.alerts.showError(err?.message || 'Failed to crop/upload avatar');
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
    } catch (err: any) {
      this.alerts.showError(err?.message || 'Failed to remove avatar');
    } finally {
      this.uploadingAvatar.set(false);
    }
  }

  private async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      // First ensure we have/refresh current user
      const currentUser = await this.auth.getCurrentUser();
      if (!currentUser) {
        throw new Error('Not logged in');
      }

      const user = await this.auth.getProfileById(currentUser.id);
      this.detail.set(user);
      this.stats.set(user.stats as any);
      this.avatarUrl.set((user as any).avatar_url ?? null);
      this.setForm(user);
      this.form().reset();
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Failed to load profile';
      this.error.set(message);
      this.alerts.showError(message);
    } finally {
      this.loading.set(false);
    }
  }

  private setForm(user: IAuthUserDetail) {
    const prefs = user.notification_preferences || {
      mention_in_comment: true,
      task_assigned: true,
      task_due: true,
      person_assigned: true,
      export_ready: true,
      import_summary: true,
    };
    this.payload.set({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name ?? '',
      mention_in_comment: prefs.mention_in_comment ?? true,
      task_assigned: prefs.task_assigned ?? true,
      task_due: prefs.task_due ?? true,
      person_assigned: prefs.person_assigned ?? true,
      export_ready: prefs.export_ready ?? true,
      import_summary: prefs.import_summary ?? true,
    });
  }

  private buildPayload(): UpdateAuthUserType {
    const raw = this.payload();
    const normalize = (value: string | null | undefined) => {
      const trimmed = value?.trim() ?? '';
      return trimmed.length ? trimmed : null;
    };
    return {
      email: raw.email?.trim() ?? '',
      first_name: raw.first_name?.trim() ?? '',
      last_name: normalize(raw.last_name),
      notification_preferences: {
        mention_in_comment: raw.mention_in_comment,
        task_assigned: raw.task_assigned,
        task_due: raw.task_due,
        person_assigned: raw.person_assigned,
        export_ready: raw.export_ready,
        import_summary: raw.import_summary,
      },
    } as UpdateAuthUserType;
  }
}
