/**
 * @file Component displaying list of email folders and handling selection.
 */
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { Icon } from '@uxcommon/icons/icon';
import { IconName } from '@uxcommon/icons/icons.index.new';

import { Swap } from '../../../uxcommon/swap';
import { EmailsStore } from '../services/email-store';
import { EmailFolderType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-folder-list',
  standalone: true,
  imports: [CommonModule, Swap, Icon],
  templateUrl: 'email-folder-list.html',
})
export class EmailFolderList implements OnInit {
  private store = inject(EmailsStore);

  /** Emits selected folder to parent component */
  @Output() public folderSelected = new EventEmitter<EmailFolderType>();

  /** List of folders from the store */
  public folders = this.store.allFolders;

  /** Indicates whether the folder sidebar is collapsed */
  public foldersCollapsed = signal(false);

  /**
   * Load folders with counts on initialization.
   */
  public async ngOnInit() {
    await this.store.loadAllFoldersWithCounts();
  }

  /**
   * Select a folder and emit the selection.
   * @param folder Folder object to select
   */
  public selectFolder(folder: EmailFolderType) {
    this.folderSelected.emit(folder);
  }

  /**
   * Toggle the collapse state of the folder sidebar.
   */
  public toggleFolders() {
    this.foldersCollapsed.set(!this.foldersCollapsed());
  }

  protected getIcon(folder: EmailFolderType) {
    return folder.icon as IconName;
  }

  /**
   * Get the email count for a folder.
   * @param folder Folder object that may have email_count property
   * @returns The email count or 0 if not available
   */
  public getEmailCount(folder: EmailFolderType): number {
    return (folder as any).email_count || 0;
  }

  /**
   * Determine if the folder is currently selected.
   */
  protected isSelected(folder: EmailFolderType) {
    return this.store.currentSelectedFolderId() === folder.id;
  }
}
