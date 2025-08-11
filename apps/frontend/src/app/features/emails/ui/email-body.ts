/**
 * @file Component displaying the body of an email.
 */
import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { SanitizeHtmlPipe } from '@uxcommon/sanitize-html.pipe';

import { EmailsStore } from '../services/email-store';
import { EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-body',
  standalone: true,
  imports: [CommonModule, SanitizeHtmlPipe],
  template: `<div
    class="prose max-w-none break-words overflow-y-auto h-full p-2 email-scrollbar"
    [innerHTML]="getBody() | sanitizeHtml"
  ></div>`,
})
export class EmailBody {
  private store = inject(EmailsStore);
  private loadingEmails = signal(new Set<string>());

  public email = input.required<EmailType>();

  // Get body from store using computed
  protected body = computed(() => {
    const email = this.email();
    return this.store.getEmailBodyById(email?.id)();
  });

  constructor() {
    effect(() => {
      const email = this.email();
      if (email) {
        // Use untracked to prevent reactive loops when loading
        untracked(() => {
          this.loadEmailData(email.id);
        });
      }
    });
  }

  private async loadEmailData(emailId: string) {
    // Prevent multiple simultaneous loads of the same email
    const currentLoading = this.loadingEmails();
    if (currentLoading.has(emailId)) {
      return;
    }

    // Check if we already have the data cached
    const cachedBody = this.store.getEmailBodyById(emailId)();
    if (cachedBody) {
      return; // Already loaded
    }

    // Mark as loading
    this.loadingEmails.update((loading) => {
      const newSet = new Set(loading);
      newSet.add(emailId);
      return newSet;
    });

    try {
      // Load email with headers to get both body and header data
      await this.store.loadEmailWithHeaders(emailId);
    } catch (error) {
      console.error('Failed to load email data:', error);
    } finally {
      // Remove from loading set
      this.loadingEmails.update((loading) => {
        const newSet = new Set(loading);
        newSet.delete(emailId);
        return newSet;
      });
    }
  }

  protected getBody() {
    return this.body() || '';
  }
}
