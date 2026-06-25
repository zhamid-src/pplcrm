import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
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

  // Responsive Tailwind class strings — CSS handles breakpoint, signal handles manual toggle
  protected readonly asideClass = computed(
    () =>
      'bg-base-200 border-r border-base-300 group flex flex-col transition-all duration-50 hover:w-48 h-full ' +
      (this.foldersCollapsed() ? 'w-12' : 'w-12 xl:w-48'),
  );

  // Text labels: always hidden on narrow screens, visible at xl+ when not collapsed, visible on hover always
  protected readonly labelClass = computed(
    () => 'hidden group-hover:block' + (this.foldersCollapsed() ? '' : ' xl:block'),
  );

  protected readonly countClass = computed(
    () => 'text-xs tabular-nums font-normal hidden group-hover:block' + (this.foldersCollapsed() ? '' : ' xl:block'),
  );

  protected readonly sectionHeaderClass = computed(
    () =>
      'px-3 py-1.5 flex items-center justify-between text-[10px] font-bold tracking-wider text-neutral-content uppercase cursor-pointer hover:text-primary select-none hidden group-hover:flex' +
      (this.foldersCollapsed() ? '' : ' xl:flex'),
  );

  protected readonly buttonLabelClass = computed(
    () => 'hidden group-hover:inline' + (this.foldersCollapsed() ? '' : ' xl:inline'),
  );

  protected readonly separatorClass = computed(
    () => 'h-px bg-base-300 my-2' + (this.foldersCollapsed() ? ' mx-1' : ' mx-1 xl:mx-3'),
  );

  public emitNewEmail() {
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
