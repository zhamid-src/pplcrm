/**
 * @file Container component for email details view.
 */
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';

import { EmailsStore } from '../../services/store/emailstore';
import { EmailBody } from '../email-body/email-body';
import { EmailComments } from '../email-comments/email-comments';
import { EmailHeader } from '../email-header/email-header';
import type { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-details',
  standalone: true,
  imports: [CommonModule, EmailHeader, EmailBody, EmailComments],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'email-details.html',
})
export class EmailDetails {
  protected store = inject(EmailsStore);

  public email = input<EmailType | null>(null);
  public commentCount = computed(() => {
    const e = this.email();
    if (!e) return 0;
    const header = this.store.getEmailHeaderById(e.id)();
    return (header as any)?.comments?.length ?? 0;
  });
  public commentsExpanded = signal(false);

  constructor() {
    // Only fetch when header value is truly undefined (not when it's null/empty).
    effect(() => {
      const e = this.email();
      if (!e) return;

      const headerVal = untracked(() => this.store.getEmailHeaderById(e.id)());
      if (typeof headerVal === 'undefined') {
        this.store.loadEmailWithHeaders(e.id).catch((err) => console.error('Failed to load email header:', err));
      }
    });
  }

  public toggleComments(): void {
    this.commentsExpanded.update((v) => !v);
  }
}
