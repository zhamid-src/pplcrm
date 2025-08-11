/**
 * @file Component displaying the body of an email.
 */
import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input } from '@angular/core';
import { SanitizeHtmlPipe } from '@uxcommon/sanitize-html.pipe';

import { EmailsStore } from '../services/email-store';
import { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-body',
  standalone: true,
  imports: [CommonModule, SanitizeHtmlPipe],
  template: `<div class="prose max-w-none break-words" [innerHTML]="getBody() | sanitizeHtml"></div>`,
})
export class EmailBody {
  private store = inject(EmailsStore);

  public email = input.required<EmailType>();

  // Get body from store using computed
  protected body = computed(() => {
    const email = this.email();
    return this.store.getEmailBodyById(email?.id)();
  });

  constructor() {
    effect(async () => {
      const email = this.email();
      if (email) {
        await this.store.loadEmailBody(email.id);
      }
    });
  }

  protected getBody() {
    return this.body() || '';
  }
}
