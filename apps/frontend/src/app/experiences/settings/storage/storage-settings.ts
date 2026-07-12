import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Icon } from '@icons/icon';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { FilesService } from '../../files/services/files.service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { EmptyState } from '@uxcommon/components/empty-state/empty-state';

interface LargestFile {
  id: string;
  filename: string;
  size_bytes: number | null;
  attachedToLabel: string | null;
}

@Component({
  selector: 'pc-storage-settings',
  imports: [EmptyState, Icon],
  templateUrl: './storage-settings.html',
})
export class StorageSettingsComponent implements OnInit {
  private readonly filesSvc = inject(FilesService);
  private readonly alerts = inject(AlertService);
  private readonly dialogs = inject(ConfirmDialogService);
  private readonly _loading = createLoadingGate();

  protected readonly loading = this._loading.visible;
  protected readonly loaded = this._loading.loaded;
  protected readonly usedBytes = signal(0);
  protected readonly quotaBytes = signal(0);
  protected readonly planLabel = signal('');
  protected readonly largestFiles = signal<LargestFile[]>([]);

  protected readonly usedPct = computed(() => {
    const quota = this.quotaBytes();
    if (!quota) return 0;
    return Math.min(100, Math.round((this.usedBytes() / quota) * 100));
  });

  protected readonly barColorClass = computed(() => {
    const pct = this.usedPct();
    if (pct >= 100) return 'bg-error';
    if (pct >= 90) return 'bg-warning';
    return 'bg-primary';
  });

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const end = this._loading.begin();
    try {
      const summary = await this.filesSvc.getUsageSummary();
      this.usedBytes.set(summary.usedBytes);
      this.quotaBytes.set(summary.quotaBytes);
      this.planLabel.set(this.formatPlanLabel(summary.planLabel));
      this.largestFiles.set(summary.largestFiles);
    } catch {
      this.alerts.showError('Failed to load storage usage');
    } finally {
      end();
    }
  }

  private formatPlanLabel(plan: string): string {
    if (!plan) return 'Free trial plan';
    return `${plan.charAt(0).toUpperCase()}${plan.slice(1)} plan`;
  }

  protected formatBytes(bytes: number | null | undefined): string {
    if (bytes == null) return '—';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  protected async deleteFile(file: LargestFile): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: `Delete "${file.filename}"?`,
      message: 'This permanently removes the file from cloud storage. This cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;

    try {
      await this.filesSvc.delete(file.id);
      this.alerts.showSuccess(`"${file.filename}" deleted`);
      await this.load();
    } catch {
      this.alerts.showError('Failed to delete file');
    }
  }
}
