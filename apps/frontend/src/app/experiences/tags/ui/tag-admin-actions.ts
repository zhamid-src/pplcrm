import { inject, Service } from '@angular/core';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ConfirmDialogService } from '@uxcommon/components/confirm-dialog.service';

import { TagsService } from '@experiences/tags/services/tags-service';
import type { RouterOutputs } from '../../../services/api/trpc-types';

export type TagAdminRow = RouterOutputs['tags']['getAdminList'][number];

/** Rename / merge / delete idiom shared by §9.1 Tags admin and §9.2 Issues admin — same three
 * actions, same confirm/prompt/toast shapes, just a different noun ("tag" vs "issue") and a
 * different source list to merge into. Centralized here so the two admin pages can't drift. */
@Service()
export class TagAdminActions {
  private readonly dialogs = inject(ConfirmDialogService);
  private readonly alertSvc = inject(AlertService);
  private readonly tagsSvc = inject(TagsService);

  public async rename(row: TagAdminRow, noun: 'tag' | 'issue'): Promise<TagAdminRow | null> {
    const newName = await this.dialogs.prompt({
      title: `Rename ${noun}`,
      message: `Renames apply everywhere "${row.name}" is referenced — people, lists and forms — in one pass.`,
      defaultValue: row.name,
      inputPlaceholder: 'lowercase, short, reusable',
      confirmText: 'Rename',
    });
    if (!newName || !newName.trim() || newName.trim().toLowerCase() === row.name) return null;

    try {
      const updated = await this.tagsSvc.rename(row.id, newName.trim());
      this.alertSvc.showSuccess(`Renamed "${row.name}" to "${updated.name}".`);
      return { ...row, name: updated.name };
    } catch (err) {
      this.alertSvc.showError(err instanceof Error && err.message ? err.message : `Couldn't rename this ${noun}.`);
      return null;
    }
  }

  /** "Move everyone to" — merge `row` into another row of the same type. `others` excludes `row`
   * itself and is expected pre-filtered to the same type by the caller. */
  public async merge(row: TagAdminRow, others: TagAdminRow[], noun: 'tag' | 'issue'): Promise<TagAdminRow | null> {
    if (!row.deletable) {
      this.alertSvc.showError(`"${row.name}" is a protected ${noun} and can't be merged away.`);
      return null;
    }
    if (others.length === 0) {
      this.alertSvc.showError(`There's no other ${noun} to move "${row.name}" into yet.`);
      return null;
    }

    const target = await this.dialogs.choose({
      title: `Move everyone to`,
      message: `Everyone tagged "${row.name}" will be tagged with the ${noun} you pick instead. "${row.name}" is then deleted.`,
      choices: others.map((o) => ({ label: o.name, value: o })),
    });
    if (!target) return null;

    try {
      await this.tagsSvc.merge(row.id, target.id);
      this.alertSvc.showSuccess(`Merged "${row.name}" into "${target.name}".`);
      return target;
    } catch (err) {
      this.alertSvc.showError(err instanceof Error && err.message ? err.message : `Couldn't merge this ${noun}.`);
      return null;
    }
  }

  public async delete(row: TagAdminRow, noun: 'tag' | 'issue'): Promise<boolean> {
    const applications = row.use_count_people + row.use_count_households;

    if (!row.deletable) {
      this.alertSvc.showError(`"${row.name}" is a protected ${noun} and can't be deleted.`);
      return false;
    }

    const confirmed = await this.dialogs.confirm({
      title: `Delete ${noun}`,
      message:
        applications > 0
          ? `"${row.name}" is applied to ${applications.toLocaleString()} application${applications === 1 ? '' : 's'}. Deleting it removes it from all of them. This can't be undone.`
          : `"${row.name}" isn't applied to anything. This can't be undone.`,
      variant: 'danger',
      confirmText: `Delete ${noun}`,
      emphasizeCancel: true,
    });
    if (!confirmed) return false;

    try {
      await this.tagsSvc.deleteMany([row.id]);
      this.alertSvc.showSuccess(`Deleted "${row.name}".`);
      return true;
    } catch (err) {
      this.alertSvc.showError(err instanceof Error && err.message ? err.message : `Couldn't delete this ${noun}.`);
      return false;
    }
  }
}
