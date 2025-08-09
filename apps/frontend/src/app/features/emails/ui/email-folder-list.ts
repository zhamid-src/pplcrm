/**
 * @file Component displaying list of email folders and handling selection.
 */
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { Swap } from '../../../uxcommon/swap';
import { EmailsService } from '../services/emails-service';

@Component({
  selector: 'pc-email-folder-list',
  standalone: true,
  imports: [CommonModule, Swap],
  templateUrl: 'email-folder-list.html',
})
export class EmailFolderList implements OnInit {
  constructor(private svc: EmailsService = inject(EmailsService)) {}

  /** List of folders retrieved from the backend */
  public folders = signal<any[]>([]);

  /** Indicates whether the folder sidebar is collapsed */
  public foldersCollapsed = signal(false);

  /** Currently selected folder */
  private selected = signal<any | null>(null);

  /** Emits selected folder to parent component */
  @Output() folderSelected = new EventEmitter<any>();

  /**
   * Load folders on initialization.
   */
  public async ngOnInit() {
    const folders = await this.svc.getFolders();
    this.folders.set(folders);
  }

  /**
   * Select a folder and emit the selection.
   * @param folder Folder object to select
   */
  public selectFolder(folder: any) {
    this.selected.set(folder);
    this.folderSelected.emit(folder);
  }

  /**
   * Toggle the collapse state of the folder sidebar.
   */
  public toggleFolders() {
    this.foldersCollapsed.set(!this.foldersCollapsed());
  }

  /**
   * Determine if the folder is currently selected.
   */
  public isSelected(folder: any) {
    return this.selected()?.id === folder.id;
  }
}
