/**
 * @file Component displaying details for a selected email, including comments and assignment.
 */
import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EmailsService } from '../services/emails-service';
import { EmailCommentType, EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: 'email-details.html',
})
export class EmailDetails {
  /** User ID to assign selected email to */
  public assignTo = '';

  /** Comments for the selected email */
  public comments = signal<Partial<EmailCommentType>[]>([]);

  /** Email to display details for */
  @Input() public email: EmailType | null = null;

  /** New comment text */
  public newComment = '';

  constructor(private svc: EmailsService = inject(EmailsService)) {}

  /**
   * Add a comment to the selected email.
   */
  public async addComment() {
    if (!this.email || !this.newComment) return;
    await this.svc.addComment(this.email.id, '1', this.newComment);
    this.comments.update((c) => [...c, { comment: this.newComment }]);
    this.newComment = '';
  }

  /**
   * Assign the selected email to a user.
   */
  public async assign() {
    if (!this.email || !this.assignTo) return;
    await this.svc.assign(this.email.id, this.assignTo);
    this.email.assigned_to = this.assignTo;
    this.assignTo = '';
  }
}
