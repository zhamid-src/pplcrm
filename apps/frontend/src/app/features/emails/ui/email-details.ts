/**
 * @file Component displaying details for a selected email, including comments and assignment.
 */
import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmailsService } from '../services/emails-service';

@Component({
  selector: 'pc-email-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: 'email-details.html',
})
export class EmailDetails implements OnChanges {
  constructor(private svc: EmailsService = inject(EmailsService)) {}

  /** Email to display details for */
  @Input() email: any | null = null;

  /** Detailed email information */
  public selectedEmail = signal<any | null>(null);

  /** Comments for the selected email */
  public comments = signal<any[]>([]);

  /** User ID to assign selected email to */
  public assignTo = '';

  /** New comment text */
  public newComment = '';

  /**
   * Load email details whenever the input email changes.
   */
  public async ngOnChanges(changes: SimpleChanges) {
    if (changes['email']) {
      if (this.email) {
        const res = await this.svc.getEmail(this.email.id);
        this.selectedEmail.set(res.email);
        this.comments.set(res.comments);
      } else {
        this.selectedEmail.set(null);
        this.comments.set([]);
      }
    }
  }

  /**
   * Add a comment to the selected email.
   */
  public async addComment() {
    if (!this.selectedEmail() || !this.newComment) return;
    await this.svc.addComment(this.selectedEmail().id, '1', this.newComment);
    this.comments.update((c) => [...c, { comment: this.newComment }]);
    this.newComment = '';
  }

  /**
   * Assign the selected email to a user.
   */
  public async assign() {
    if (!this.selectedEmail() || !this.assignTo) return;
    await this.svc.assign(this.selectedEmail().id, this.assignTo);
    this.selectedEmail().assigned_to = this.assignTo;
    this.assignTo = '';
  }
}
