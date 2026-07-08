import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Icon } from '@icons/icon';

import type { DataExportRecordType, ImportListItem } from '../../../../../../../libs/common/src';

import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { SpinOnClickDirective } from '@uxcommon/directives/spin-on-click.directive';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { downloadWithAuthHeader } from '../../../services/api/http-download';
import { TokenService } from '../../../services/api/token-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { environment } from '../../../../environments/environment';
import { ExportsService } from '../../exports/services/exports-service';
import { ImportsService } from '../services/imports-service';

/**
 * Import/export History page (spec §17). Folds the old standalone Exports
 * Manager page into an "Imports N / Exports N" tabbed view — one history
 * surface for both, per the Wave 1E fold noted in sidebar-items.ts.
 */
type HistoryTab = 'imports' | 'exports';

@Component({
  selector: 'pc-imports-page',
  imports: [FormsModule, Icon, SpinOnClickDirective],
  templateUrl: './imports-page.html',
})
export class ImportsPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly alerts = inject(AlertService);
  private readonly imports = inject(ImportsService);
  private readonly exports = inject(ExportsService);
  private readonly tokenSvc = inject(TokenService);
  private readonly router = inject(Router);
  private readonly dialogs = inject(ConfirmDialogService);

  protected readonly tab = signal<HistoryTab>('imports');

  private readonly _loading = createLoadingGate();
  protected readonly loading = this._loading.visible;
  private isLoadActive = false;
  protected readonly deleting = signal(false);
  protected readonly items = signal<ImportListItem[]>([]);
  protected readonly itemCount = computed(() => this.items().length);
  protected readonly pendingDelete = signal<ImportListItem | null>(null);
  protected readonly deletePeople = signal(false);
  protected readonly deleteHouseholds = signal(false);
  protected readonly deleteCompanies = signal(false);
  protected readonly deleteTasks = signal(false);
  protected readonly error = signal<string | null>(null);

  // --- History sentence: "N imports this year · X people created · Y duplicates merged" ---
  protected readonly importsThisYear = computed(
    () => this.items().filter((item) => item.processedAt.getFullYear() === new Date().getFullYear()).length,
  );
  protected readonly peopleCreatedThisYear = computed(() =>
    this.items()
      .filter((item) => item.processedAt.getFullYear() === new Date().getFullYear())
      .reduce((sum, item) => sum + item.insertedCount, 0),
  );
  protected readonly duplicatesMergedThisYear = computed(() =>
    this.items()
      .filter((item) => item.processedAt.getFullYear() === new Date().getFullYear())
      .reduce((sum, item) => sum + item.mergedCount, 0),
  );

  private pollInterval: ReturnType<typeof setInterval> | undefined;

  // --- Exports tab ---
  protected readonly exportJobs = signal<DataExportRecordType[]>([]);
  protected readonly exportCount = computed(() => this.exportJobs().length);
  protected readonly exportsLoading = createLoadingGate();
  protected readonly showNewExportInfo = signal(false);

  constructor() {
    void this.load();

    // Reset checkbox when dialog closes
    effect(() => {
      const item = this.pendingDelete();
      if (!item) {
        this.deletePeople.set(false);
        this.deleteHouseholds.set(false);
        this.deleteCompanies.set(false);
        this.deleteTasks.set(false);
      }
    });

    this.startPolling();

    this.destroyRef.onDestroy(() => {
      this.imports.abort();
      this.stopPolling();
    });
  }

  protected switchTab(tab: HistoryTab): void {
    this.tab.set(tab);
    if (tab === 'exports') {
      void this.loadExports();
    }
  }

  private startPolling() {
    this.pollInterval = setInterval(() => void this.pollStep(), 4000);
  }

  private async pollStep(): Promise<void> {
    const hasActiveJobs = this.items().some((item) => item.status === 'pending' || item.status === 'processing');
    if (hasActiveJobs) {
      try {
        const list = await this.imports.list();
        this.items.set(list ?? []);
      } catch (err) {
        console.error('Failed to poll imports status:', err);
      }
    }
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
  }

  protected formatDate(value: Date | string) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(value instanceof Date ? value : new Date(value));
    } catch {
      return value ? String(value) : '—';
    }
  }

  protected formatFileSize(bytes: number | null): string | null {
    if (bytes == null) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected startNewImport(): void {
    void this.router.navigate(['/imports/new']);
  }

  protected openDeleteDialog(item: ImportListItem, dialog: HTMLDialogElement) {
    if (this.deleting()) return;
    this.pendingDelete.set(item);
    dialog.showModal();
  }

  protected closeDeleteDialog(dialog: HTMLDialogElement) {
    if (!dialog.open) return;
    dialog.close();
    this.pendingDelete.set(null);
  }

  protected async confirmDelete(dialog: HTMLDialogElement) {
    const item = this.pendingDelete();
    if (!item || this.deleting()) return;

    this.deleting.set(true);
    try {
      await this.imports.delete(item.id, {
        deletePeople: this.deletePeople(),
        deleteHouseholds: this.deleteHouseholds(),
        deleteCompanies: this.deleteCompanies(),
        deleteTasks: this.deleteTasks(),
      });
      this.alerts.showSuccess('Import deleted');
      await this.load();
      this.closeDeleteDialog(dialog);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : isRecord(err) &&
              isRecord(err['data']) &&
              typeof err['data']['message'] === 'string' &&
              err['data']['message']
            ? err['data']['message']
            : 'Failed to delete import';
      this.alerts.showError(message);
    } finally {
      this.deleting.set(false);
    }
  }

  protected downloadSource(item: ImportListItem): void {
    const token = this.tokenSvc.getAuthToken();
    void downloadWithAuthHeader(`${environment.apiUrl}/api/imports/download/${item.id}/source`, token, item.fileName);
  }

  protected downloadSkipped(item: ImportListItem): void {
    const token = this.tokenSvc.getAuthToken();
    void downloadWithAuthHeader(
      `${environment.apiUrl}/api/imports/download/${item.id}/skipped`,
      token,
      `${item.fileName.replace(/\.csv$/i, '')}-skipped-rows.csv`,
    );
  }

  protected async refresh() {
    await this.load();
  }

  private async load() {
    if (this.isLoadActive) return;
    this.isLoadActive = true;
    const end = this._loading.begin();
    this.error.set(null);
    try {
      const list = await this.imports.list();
      this.items.set(list ?? []);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : isRecord(err) &&
              isRecord(err['data']) &&
              typeof err['data']['message'] === 'string' &&
              err['data']['message']
            ? err['data']['message']
            : 'Failed to load imports';
      this.error.set(message);
      this.alerts.showError(message);
    } finally {
      this.isLoadActive = false;
      end();
    }
  }

  // --- Exports tab ---

  protected refreshExports(): void {
    void this.loadExports();
  }

  protected toggleNewExportInfo(): void {
    this.showNewExportInfo.update((v) => !v);
  }

  protected goToPeopleGrid(): void {
    void this.router.navigate(['/people']);
  }

  protected formatExportDate(dateStr: string) {
    return this.formatDate(dateStr);
  }

  protected isExpired(job: DataExportRecordType): boolean {
    const EXPIRE_MS = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - new Date(job.created_at).getTime() > EXPIRE_MS;
  }

  protected async downloadExportJob(job: DataExportRecordType) {
    if (this.isExpired(job)) {
      this.alerts.showError('This export has expired (30+ days old).');
      return;
    }
    if (job.status !== 'completed') {
      this.alerts.showError('Export is not ready yet.');
      return;
    }
    try {
      const token = this.tokenSvc.getAuthToken();
      await downloadWithAuthHeader(`${environment.apiUrl}/api/exports/download/${job.id}`, token, job.file_name);
    } catch {
      this.alerts.showError('Failed to download export');
    }
  }

  protected async deleteExportJob(job: DataExportRecordType) {
    const confirmed = await this.dialogs.confirm({
      title: 'Delete export',
      message: `Delete "${job.file_name}"? This removes the file from the server — it cannot be undone.`,
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await this.exports.delete(job.id);
      this.alerts.showSuccess('Export deleted successfully.');
      await this.loadExports();
    } catch {
      this.alerts.showError('Failed to delete export. Please try again.');
    }
  }

  private async loadExports() {
    const end = this.exportsLoading.begin();
    try {
      const list = await this.exports.list();
      this.exportJobs.set(list ?? []);
    } catch {
      this.alerts.showError('Failed to load exports. Please try again.');
    } finally {
      end();
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
