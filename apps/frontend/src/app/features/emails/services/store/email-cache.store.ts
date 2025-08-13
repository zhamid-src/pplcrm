/**
 * @file Caching + de-duped loading for email bodies & headers.
 * Owns: body/header caches, "loading" set, and combined fetch helpers.
 */
import { Injectable, computed, inject, signal } from '@angular/core';
import { AlertService } from '@uxcommon/alerts/alert-service';

import { EmailsService } from '../emails-service';
import type { EmailId } from './email-state.store';

@Injectable({ providedIn: 'root' })
export class EmailCacheStore {
  private readonly alerts = inject(AlertService);

  /** Cache for email body HTML content, keyed by email ID */
  private readonly emailBodiesCache = signal<Record<string, string>>({});

  /** Cache for email header data with recipients, keyed by email ID */
  private readonly emailHeadersCache = signal<Record<string, any>>({});

  /** Track emails currently being loaded to prevent duplicate requests */
  private readonly loadingEmails = signal<Set<string>>(new Set());
  private readonly svc = inject(EmailsService);

  /** Factory: computed body by id */
  public getEmailBodyById = (emailId: EmailId | null) =>
    computed(() => (emailId ? this.emailBodiesCache()[String(emailId)] : undefined));

  /** Factory: computed header by id */
  public getEmailHeaderById = (emailId: EmailId | null) =>
    computed(() => (emailId ? this.emailHeadersCache()[String(emailId)] : undefined));

  /** Update header cache after adding a comment */
  public appendCommentToHeader(emailId: EmailId, createdComment: any): void {
    const key = String(emailId);
    const existing = this.emailHeadersCache()[key];
    const next = existing
      ? { ...existing, comments: [...(existing.comments ?? []), createdComment] }
      : { comments: [createdComment] };
    this.setInCache(this.emailHeadersCache, key, next);
  }

  /** Load only the body (cached) */
  public async loadEmailBody(emailId: EmailId): Promise<string> {
    const key = String(emailId);
    const cached = this.emailBodiesCache()[key];
    if (typeof cached !== 'undefined') return cached;

    const res = (await this.svc.getEmailBody(key)) as any;
    const body = res?.body_html ?? '';
    // IMPORTANT: cache even if empty string so future checks see "loaded"
    this.setInCache(this.emailBodiesCache, key, body);
    return body;
  }

  /**
   * Load combined body + headers (cached). De-dupes concurrent loads.
   * Always refreshes cache from server when called.
   */
  public async loadEmailWithHeaders(emailId: EmailId): Promise<{ body: string; header: any }> {
    const key = String(emailId);
    const cachedBody = this.emailBodiesCache()[key];
    const cachedHeader = this.emailHeadersCache()[key];

    // Another call in-flight? return what we have (even if empty/null)
    if (this.loadingEmails().has(key)) {
      return { body: cachedBody ?? '', header: typeof cachedHeader === 'undefined' ? null : cachedHeader };
    }

    this.markLoading(key);
    try {
      const res = (await this.svc.getEmailWithHeaders(key)) as any;
      const bodyHtml = res?.body?.body_html ?? '';
      const header = res?.header ?? null;

      // IMPORTANT: cache regardless of truthiness ('' or null still mean "loaded")
      this.setInCache(this.emailBodiesCache, key, bodyHtml);
      this.setInCache(this.emailHeadersCache, key, header);

      return { body: bodyHtml, header };
    } catch (err) {
      console.error(`Failed to load email data for ${key}:`, err);
      this.alerts.showError('Failed to load email data. Please try again later.');
      return { body: '', header: null };
    } finally {
      this.unmarkLoading(key);
    }
  }

  private markLoading(key: string): void {
    this.loadingEmails.update((s) => {
      const n = new Set(s);
      n.add(key);
      return n;
    });
  }

  /** Internal helpers */
  private setInCache<T extends Record<string, unknown>>(
    cacheSig: { (): T; update: (fn: (v: T) => T) => void },
    key: string,
    value: unknown,
  ): void {
    cacheSig.update((cache) => ({ ...(cache as Record<string, unknown>), [key]: value }) as T);
  }

  private unmarkLoading(key: string): void {
    this.loadingEmails.update((s) => {
      const n = new Set(s);
      n.delete(key);
      return n;
    });
  }
}
