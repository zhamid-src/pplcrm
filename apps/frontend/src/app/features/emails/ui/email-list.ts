/**
 * @file Component displaying emails for a selected folder.
 */
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { EmailsService } from '../services/emails-service';

@Component({
  selector: 'pc-email-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'email-list.html',
})
export class EmailList implements OnChanges {
  constructor(private svc: EmailsService = inject(EmailsService)) {}

  /** Currently selected folder */
  @Input() folder: any | null = null;

  /** Emails in the selected folder */
  public emails = signal<any[]>([]);

  /** Currently selected email */
  private selected = signal<any | null>(null);

  /** Emits when an email is selected */
  @Output() emailSelected = new EventEmitter<any>();

  /**
   * Load emails whenever the folder input changes.
   */
  public async ngOnChanges(changes: SimpleChanges) {
    if (changes['folder']) {
      if (this.folder) {
        const emails = await this.svc.getEmails(this.folder.id);
        this.emails.set(emails);
      } else {
        this.emails.set([]);
      }
      this.selected.set(null);
    }
  }

  /**
   * Select an email and emit it to the parent component.
   */
  public selectEmail(email: any) {
    this.selected.set(email);
    this.emailSelected.emit(email);
  }

  /**
   * Determine if an email is currently selected.
   */
  public isSelected(email: any) {
    return this.selected()?.id === email.id;
  }
}
