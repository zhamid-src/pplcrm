/**
 * @file Component displaying the body of an email.
 */
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { AlertService } from '@uxcommon/alerts/alert-service';
import { SanitizeHtmlPipe } from '@uxcommon/sanitize-html.pipe';

import { EmailsStore } from '../services/store/emailstore';
import type { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-body',
  standalone: true,
  imports: [CommonModule, SanitizeHtmlPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="prose max-w-none break-words overflow-y-auto h-full p-2 email-scrollbar"
      [innerHTML]="bodyHtml() | sanitizeHtml"
    ></div>
    @if (attachments().length > 0) {
      <div class="mt-4 flex flex-wrap gap-2">
        @for (att of attachments(); track att.id) {
          <a
            class="badge badge-outline"
            [href]="getAttachmentUrl(att)"
            target="_blank"
            rel="noopener"
          >
            {{ att.filename }}
          </a>
        }
      </div>
    }
  `,
})
export class EmailBody {
  private readonly alerts = inject(AlertService);
  private readonly emailId = computed(() => {
    const em = this.email();
    return em ? String(em.id) : null;
  });
  private readonly store = inject(EmailsStore);

  protected readonly bodyHtml = computed(() => {
    const id = this.emailId();
    return id ? (this.store.getEmailBodyById(id)() ?? '') : '';
  });

  protected readonly attachments = computed(() => {
    const id = this.emailId();
    if (!id) return [] as any[];
    const header = this.store.getEmailHeaderById(id)();
    return (header?.attachments || []).filter((a: any) => !a.is_inline);
  });

  protected getAttachmentUrl(att: any): string {
    const id = this.emailId();
    return id ? `/api/emails/${id}/attachments/${att.id}` : '';
  }

  /** Nullable input to avoid early read before Angular sets it */
  public email = input<EmailType | null>(null);

  constructor() {
    effect(() => {
      const id = this.emailId();
      if (!id) return;

      // Only fetch if truly not cached (undefined); empty string is a valid "loaded" result.
      const cached = untracked(() => this.store.getEmailBodyById(id)());
      if (typeof cached === 'undefined') {
        this.store.loadEmailWithHeaders(id).catch((err) => {
          console.error('Failed to load email data:', err);
          this.alerts.showError('Failed to load email data. Please try again later.');
        });
      }
    });
  }
}
