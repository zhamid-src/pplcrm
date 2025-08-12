/**
 * @file Container component for email details view.
 */
import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';

import { EmailsStore } from '../services/store/emailstore';
import { EmailBody } from './email-body';
import { EmailComments } from './email-comments';
import { EmailHeader } from './email-header';
import { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-details',
  standalone: true,
  imports: [CommonModule, EmailHeader, EmailBody, EmailComments],
  templateUrl: 'email-details.html',
})
export class EmailDetails {
  private store = inject(EmailsStore);

  public email = input<EmailType | null>(null);

  // Derived number of comments for current email
  public commentCount = computed(() => {
    const e = this.email();
    if (!e) return 0;
    const header = this.store.getEmailHeaderById(e.id)();
    return (header as any)?.comments?.length ?? 0;
  });
  public commentsExpanded = signal(false);

  constructor() {
    // Ensure header/comments are loaded so count is available even when collapsed
    effect(() => {
      const e = this.email();
      if (!e) return;
      const header = this.store.getEmailHeaderById(e.id)();
      if (!header) {
        untracked(() => this.store.loadEmailWithHeaders(e.id));
      }
    });
  }

  public toggleComments(): void {
    this.commentsExpanded.update((v) => !v);
  }
}
