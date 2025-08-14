/**
 * @file Component displaying list of email folders and handling selection.
 */
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal } from '@angular/core';
import { Icon } from '@uxcommon/icons/icon';
import type { IconName } from '@uxcommon/icons/icons.index.new';

import { Swap } from '../../../uxcommon/swap';
import { EmailsStore } from '../services/store/emailstore';
import type { EmailFolderType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-folder-list',
  standalone: true,
  imports: [CommonModule, Swap, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'email-folder-list.html',
})
export class EmailFolderList implements OnInit {
  /** App store */
  protected readonly store = inject(EmailsStore);

  /** trackBy for *ngFor */
  protected trackByFolderId = (_: number, f: EmailFolderType) => String(f.id);

  /** Emits selected folder to parent component */
  public readonly folderSelected = output<EmailFolderType>();

  /** List of folders from the store (reactive signal) */
  public readonly folders = this.store.allFolders;

  /** Sidebar collapsed flag */
  public readonly foldersCollapsed = signal(false);

  /** Count helper (keeps typing flexible if counts aren’t always present) */
  public getEmailCount(folder: EmailFolderType): number {
    return (folder as any).email_count ?? 0;
  }

  public async ngOnInit(): Promise<void> {
    try {
      await this.store.loadAllFoldersWithCounts();
    } catch (e) {
      console.error('Failed to load folders with counts', e);
    }
  }

  /** Select a folder: emit only; parent writes to store to avoid loops */
  public selectFolder(folder: EmailFolderType): void {
    this.folderSelected.emit(folder);
  }

  /** Toggle collapse/expand */
  public toggleFolders(): void {
    this.foldersCollapsed.update((v) => !v);
  }

  /** Icon helper */
  protected getIcon(folder: EmailFolderType): IconName {
    return folder.icon as IconName;
  }

  /** Selection helper (compare as strings for safety) */
  protected isSelected(folder: EmailFolderType): boolean {
    return String(folder.id) === String(this.store.currentSelectedFolderId());
  }
}
