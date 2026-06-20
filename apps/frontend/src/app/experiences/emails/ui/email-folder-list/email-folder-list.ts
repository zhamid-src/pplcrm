import { Component, OnInit, inject, output, signal } from '@angular/core';
import { Icon } from '@uxcommon/components/icons/icon';
import type { PcIconNameType } from '@uxcommon/components/icons/icons.index';
import { Swap } from '@uxcommon/components/swap/swap';

import { EmailsStore } from '../../services/store/emailstore';
import type { EmailFolderType } from '../../../../../../../../libs/common/src/lib/models';

@Component({
  selector: 'pc-email-folder-list',
  imports: [Swap, Icon],
  templateUrl: 'email-folder-list.html',
})
export class EmailFolderList implements OnInit {
  protected readonly store = inject(EmailsStore);

  protected trackByFolderId = (_: number, f: EmailFolderType) => String(f.id);

  public readonly folderSelected = output<EmailFolderType>();

  public readonly folders = this.store.allFolders;

  public readonly foldersCollapsed = signal(false);

  public readonly realFoldersCollapsed = signal(true);

  public readonly newEmail = output<void>();

  public emitNewEmail() {
    // Emit a new email event; parent component should handle this
    this.newEmail.emit();
  }

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

  public selectFolder(folder: EmailFolderType): void {
    this.folderSelected.emit(folder);
  }

  public toggleFolders(): void {
    this.foldersCollapsed.update((v) => !v);
  }

  public toggleRealFolders(): void {
    this.realFoldersCollapsed.update((v) => !v);
  }

  protected getIcon(folder: EmailFolderType): PcIconNameType {
    return folder.icon as PcIconNameType;
  }

  protected isSelected(folder: EmailFolderType): boolean {
    return String(folder.id) === String(this.store.currentSelectedFolderId());
  }
}
