import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Icon } from '@icons/icon';

import type { ImportListItem } from '@common';

import { AlertService } from '../../../uxcommon/components/alerts/alert-service';
import { ImportsService } from '../services/imports-service';

@Component({
  selector: 'pc-imports-page',
  standalone: true,
  imports: [CommonModule, FormsModule, Icon],
  templateUrl: './imports-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportsPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly alerts = inject(AlertService);
  private readonly imports = inject(ImportsService);

  protected readonly loading = signal(false);
  protected readonly deleting = signal(false);
  protected readonly items = signal<ImportListItem[]>([]);
  protected readonly itemCount = computed(() => this.items().length);
  protected readonly pendingDelete = signal<ImportListItem | null>(null);
  protected readonly deleteContacts = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    void this.load();

    // Reset checkbox when dialog closes
    effect(() => {
      const item = this.pendingDelete();
      if (!item) {
        this.deleteContacts.set(false);
      } else if (!item.canDeleteContacts) {
        this.deleteContacts.set(false);
      }
    });

    this.destroyRef.onDestroy(() => this.imports.abort());
  }

  protected formatDate(value: Date) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(value instanceof Date ? value : new Date(value));
    } catch {
      return value ? String(value) : '—';
    }
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
      await this.imports.delete(item.id, this.deleteContacts() && item.canDeleteContacts);
      this.alerts.showSuccess('Import deleted');
      await this.load();
      this.closeDeleteDialog(dialog);
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Failed to delete import';
      this.alerts.showError(message);
    } finally {
      this.deleting.set(false);
    }
  }

  protected async refresh() {
    await this.load();
  }

  private async load() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await this.imports.list();
      this.items.set(list ?? []);
    } catch (err: any) {
      const message = err?.message || err?.data?.message || 'Failed to load imports';
      this.error.set(message);
      this.alerts.showError(message);
    } finally {
      this.loading.set(false);
    }
  }
}
