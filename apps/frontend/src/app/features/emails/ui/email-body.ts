/**
 * @file Component displaying the body of an email.
 */
import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { SanitizeHtmlPipe } from '@uxcommon/sanitize-html.pipe';

import { EmailsService } from '../services/emails-service';
import { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-body',
  standalone: true,
  imports: [CommonModule, SanitizeHtmlPipe],
  template: `<div class="prose max-w-none break-words" [innerHTML]="getBody() | sanitizeHtml"></div>`,
})
export class EmailBody {
  private body = signal<string>('');
  private svc = inject(EmailsService);

  public email = input.required<EmailType>();

  constructor() {
    effect(async () => {
      const email = (await this.svc.getEmailBody(this.email().id)) as any;
      this.body.set(email.body_html);
    });
  }

  protected getBody() {
    return this.body();
  }
}
