import { inject, signal, computed, Directive } from '@angular/core';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ConfirmDialogService } from '@uxcommon/components/confirm-dialog.service';

export interface DuplicateGroup<T> {
  reason: string;
  items: T[]; // Normalized array (replaces specific persons/households/companies arrays)
  selectedTargetId?: string;
  selectedSourceId?: string;
}

@Directive() // Needed for abstract classes using dependency injection in Angular
export abstract class BaseDuplicateManager<T extends { id: string; created_at: string | Date }> {
  protected readonly alertSvc = inject(AlertService);
  protected readonly dialogs = inject(ConfirmDialogService);

  public readonly isLoading = signal(false);
  public readonly groups = signal<DuplicateGroup<T>[]>([]);

  public readonly currentPage = signal(1);
  public readonly pageSize = signal(10);
  public readonly totalGroups = signal(0);
  public readonly totalPages = computed(() => Math.ceil(this.totalGroups() / this.pageSize()));

  // Abstract methods the child components must implement
  protected abstract getEntityName(): string;
  protected abstract getItemDisplayName(item: T): string;
  protected abstract fetchFromService(options: {
    page: number;
    pageSize: number;
  }): Promise<{ groups: any[]; total: number }>;
  protected abstract getItemsFromRawGroup(rawGroup: any): T[];
  protected abstract mergeInService(targetId: string, sourceId: string): Promise<void>;

  public async loadDuplicates() {
    this.isLoading.set(true);
    try {
      const response = await this.fetchFromService({
        page: this.currentPage(),
        pageSize: this.pageSize(),
      });

      this.totalGroups.set(response.total);

      const mappedGroups: DuplicateGroup<T>[] = response.groups.map((g) => {
        let selectedTargetId: string | undefined = undefined;
        let selectedSourceId: string | undefined = undefined;
        const items = this.getItemsFromRawGroup(g);

        if (items.length === 2) {
          const date0 = new Date(items[0]!.created_at).getTime();
          const date1 = new Date(items[1]!.created_at).getTime();
          if (date0 <= date1) {
            selectedTargetId = items[0]!.id;
            selectedSourceId = items[1]!.id;
          } else {
            selectedTargetId = items[1]!.id;
            selectedSourceId = items[0]!.id;
          }
        }
        return { reason: g.reason, items, selectedTargetId, selectedSourceId };
      });
      this.groups.set(mappedGroups);
    } catch (err) {
      this.alertSvc.showError(`Failed to fetch ${this.getEntityName()} duplicates`);
    } finally {
      this.isLoading.set(false);
    }
  }

  public selectRole(groupIndex: number, itemId: string, role: 'target' | 'source') {
    this.groups.update((current) => {
      const updated = [...current];

      // 1. Create a shallow copy of the group to avoid mutating the original reference
      const updatedGroup = { ...updated[groupIndex]! };

      // 2. Apply your logic to the NEW object
      if (role === 'target') {
        updatedGroup.selectedTargetId = itemId;
        if (updatedGroup.selectedSourceId === itemId) updatedGroup.selectedSourceId = undefined;
      } else {
        updatedGroup.selectedSourceId = itemId;
        if (updatedGroup.selectedTargetId === itemId) updatedGroup.selectedTargetId = undefined;
      }

      // 3. Assign the new object back to the array
      updated[groupIndex] = updatedGroup;

      return updated;
    });
  }

  public async mergeGroup(groupIndex: number) {
    const group = this.groups()[groupIndex]!;
    const targetId = group.selectedTargetId;
    const sourceId = group.selectedSourceId;
    if (!targetId || !sourceId) return;

    const targetItem = group.items.find((i) => i.id === targetId)!;
    const sourceItem = group.items.find((i) => i.id === sourceId)!;

    const primaryName = this.getItemDisplayName(targetItem);
    const dupName = this.getItemDisplayName(sourceItem);

    const confirmed = await this.dialogs.confirm({
      title: 'Confirm Merge',
      message: `Are you sure you want to merge "${dupName}" into "${primaryName}"? This action will permanently delete this duplicate ${this.getEntityName()} and cannot be undone.`,
      variant: 'warning',
      confirmText: 'Merge',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    try {
      await this.mergeInService(targetId, sourceId);
      this.alertSvc.showSuccess(`Successfully merged into "${primaryName}"`);

      let updatedGroups = this.groups().filter((_, idx) => idx !== groupIndex);
      updatedGroups = updatedGroups.map((g) => ({
        ...g,
        items: g.items.filter((i) => i.id !== sourceId),
      }));

      const initialLength = updatedGroups.length;
      updatedGroups = updatedGroups.filter((g) => g.items.length > 1);
      const groupsRemovedCount = 1 + (initialLength - updatedGroups.length);

      this.groups.set(updatedGroups);
      this.totalGroups.update((t) => Math.max(0, t - groupsRemovedCount));

      if (updatedGroups.length === 0 && this.currentPage() > 1) {
        this.currentPage.update((p) => p - 1);
        this.loadDuplicates();
      } else if (updatedGroups.length === 0 && this.totalGroups() > 0) {
        this.loadDuplicates();
      }
    } catch (err: any) {
      this.alertSvc.showError(err?.message || 'Merge failed');
    }
  }

  public nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadDuplicates();
    }
  }

  public prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadDuplicates();
    }
  }
}
