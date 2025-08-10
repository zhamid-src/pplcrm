/**
 * @file Component displaying emails for a selected folder.
 */
import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  effect,
  inject,
  signal,
} from '@angular/core';

import { EmailsService } from '../services/emails-service';
import { EmailFolderType, EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'email-list.html',
})
export class EmailList implements OnChanges {
  /** Currently selected email */
  private selected = signal<EmailType | null>(null);
  private svc: EmailsService = inject(EmailsService);

  /** Emits when an email is selected */
  @Output() public emailSelected = new EventEmitter<EmailType | null>();

  /** Emails in the selected folder */
  public emails = signal<EmailType[]>([]);

  /** Currently selected folder */
  @Input() public folder: EmailFolderType | null = null;

  constructor() {
    effect(() => this.selectEmail(this.emails()[0]));
  }

  /**
   * Determine if an email is currently selected.
   */
  public isSelected(id: string) {
    return this.selected()?.id === id;
  }

  /**
   * Load emails whenever the folder input changes.
   */
  public async ngOnChanges(changes: SimpleChanges) {
    if (changes['folder']) {
      if (this.folder) {
        const emails = (await this.svc.getEmails(this.folder.id)) as unknown as EmailType[];
        this.emails.set(emails);
      } else {
        this.emails.set([]);
      }
    }
  }

  /**
   * Select an email and emit it to the parent component.
   */
  public selectEmail(email: EmailType) {
    this.selected.set(email);
    this.emailSelected.emit(email);
  }
}
