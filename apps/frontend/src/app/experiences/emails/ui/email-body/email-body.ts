/**
 * @file Component displaying the body of an email.
 */
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { AttachmentIconComponent } from '@uxcommon/components/icons/attachment-icon';
import { Icon } from '@uxcommon/components/icons/icon';
import { FileSizePipe } from '@uxcommon/pipes/filesize.pipe';
import { SanitizeHtmlPipe } from '@uxcommon/pipes/sanitize-html.pipe';

import { EmailsStore } from '../../services/store/emailstore';
import type { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-body',
  standalone: true,
  imports: [CommonModule, SanitizeHtmlPipe, FileSizePipe, AttachmentIconComponent, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="prose max-w-none break-words overflow-y-auto h-full p-2 email-scrollbar">
    <div [innerHTML]="bodyHtml() | sanitizeHtml"></div>
    @if (attachments().length > 0) {
      <div class="mt-4 flex flex-wrap gap-2">
        @for (att of attachments(); track att.id) {
          <a
            class="badge badge-outline no-underline hover:text-primary group"
            [href]="getAttachmentUrl(att)"
            target="_blank"
            rel="noopener"
          >
            <pc-attachment-icon [filename]="att.filename" [size]="4" class="group-hover:hidden"></pc-attachment-icon>
            <pc-icon name="arrow-down-tray" [size]="4" class="hidden group-hover:block"></pc-icon>
            <span>{{ att.filename }} | {{ att.size_bytes | fileSize }}</span>
          </a>
        }
      </div>
    }
  </div>`,
})
export class EmailBody {
  private readonly alerts = inject(AlertService);
  private readonly emailId = computed(() => {
    const em = this.email();
    return em ? String(em.id) : null;
  });
  private readonly store = inject(EmailsStore);

  protected readonly attachments = computed(() => {
    const id = this.emailId();
    if (!id) return [] as any[];
    const header = this.store.getEmailHeaderById(id)();
    const r = (header?.attachments || []).filter((a: any) => !a.is_inline);
    console.log(r);
    return r;
  });
  protected readonly bodyHtml = computed(() => {
    const id = this.emailId();
    return id ? this.store.getEmailBodyById(id)() ?? '' : '';
  });

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

  protected getAttachmentUrl(att: any): string {
    const id = this.emailId();
    return id ? `/api/emails/${id}/attachments/${att.id}` : '';
  }
}
