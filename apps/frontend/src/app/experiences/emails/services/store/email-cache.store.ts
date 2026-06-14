/**
 * @file Caching + de-duped loading for email bodies & headers.
 * Owns: body/header caches, "loading" set, and combined fetch helpers.
 */
import { computed, inject, signal, Service } from '@angular/core';

import { EmailsService } from '../emails-service';
import type { EmailId } from './email-state.store';

@Service()
export class EmailCacheStore {
  /** Cache for email body HTML content, keyed by email ID */
  private readonly emailBodiesCache = signal<Record<string, string>>({});

  /** Cache for email header data with recipients, keyed by email ID */
  private readonly emailHeadersCache = signal<Record<string, any>>({});

  /** Cache for email activity log rows, keyed by email ID */
  private readonly emailActivitiesCache = signal<Record<string, any[] | null>>({});

  /** Track emails currently being loaded to prevent duplicate requests */
  private readonly activeRequests = new Map<string, Promise<{ body: string; header: any }>>();
  private readonly svc = inject(EmailsService);

  /** Factory: computed body by id */
  public getEmailBodyById = (emailId: EmailId | null) =>
    computed(() => (emailId ? this.emailBodiesCache()[String(emailId)] : undefined));

  /** Factory: computed header by id */
  public getEmailHeaderById = (emailId: EmailId | null) =>
    computed(() => (emailId ? this.emailHeadersCache()[String(emailId)] : undefined));

  /** Factory: computed activity log by email id (undefined = not yet loaded, null = loaded empty) */
  public getEmailActivitiesById = (emailId: EmailId | null) =>
    computed(() => (emailId ? this.emailActivitiesCache()[String(emailId)] : undefined));

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

    const res = (await this.svc.getEmailBody(key)) as unknown as { body_html?: string };
    const body = res?.body_html ?? '';
    // IMPORTANT: cache even if empty string so future checks see "loaded"
    this.setInCache(this.emailBodiesCache, key, body);
    return body;
  }

  /**
   * Load combined body + headers (cached). De-dupes concurrent loads.
   * Always refreshes cache from server when called.
   */
  public loadEmailWithHeaders(emailId: EmailId): Promise<{ body: string; header: any }> {
    const key = String(emailId);

    // If another component is already fetching this exact email, await the exact same network request
    if (this.activeRequests.has(key)) {
      return this.activeRequests.get(key)!;
    }

    const fetchPromise = (async () => {
      try {
        const res = (await this.svc.getEmailWithHeaders(key)) as unknown as {
          body?: { body_html?: string } | null;
          header?: any;
        };
        const bodyHtml = res?.body?.body_html ?? '';
        const header = (res as any)?.header ?? null;

        // IMPORTANT: cache regardless of truthiness ('' or null still mean "loaded")
        this.setInCache(this.emailBodiesCache, key, bodyHtml);
        this.setInCache(this.emailHeadersCache, key, header);

        return { body: bodyHtml, header };
      } catch (err) {
        console.error(`Failed to load email data for ${key}:`, err);
        // Cache empty values to avoid endless re-fetch loops on subsequent calls
        this.setInCache(this.emailBodiesCache, key, '');
        this.setInCache(this.emailHeadersCache, key, null);
        return { body: '', header: null };
      } finally {
        // Always clean up the promise map when the request finishes or fails
        this.activeRequests.delete(key);
      }
    })();

    this.activeRequests.set(key, fetchPromise);
    return fetchPromise;
  }

  /** Load activity log for an email (always fetches fresh) */
  public async loadEmailActivities(emailId: EmailId): Promise<any[]> {
    const key = String(emailId);
    try {
      const rows = (await this.svc.getActivities(key)) as any[];
      this.setInCache(this.emailActivitiesCache, key, rows ?? []);
      return rows ?? [];
    } catch (err) {
      console.error(`Failed to load activities for email ${key}:`, err);
      this.setInCache(this.emailActivitiesCache, key, []);
      return [];
    }
  }

  /** Remove a comment from the cached header (optimistic) */
  public removeCommentFromHeader(emailId: EmailId, commentId: string | number): void {
    const key = String(emailId);
    const existing = this.emailHeadersCache()[key];
    if (!existing) return;
    const next = {
      ...existing,
      comments: ((existing as unknown as { comments?: any[] }).comments ?? []).filter(
        (c: any) => String(c.id) !== String(commentId),
      ),
    };
    this.setInCache(this.emailHeadersCache, key, next);
  }

  /** Replace the cached header entirely (rollback) */
  public replaceHeader(emailId: EmailId, header: any): void {
    const key = String(emailId);
    this.setInCache(this.emailHeadersCache, key, header);
  }

  /** Internal helpers */
  private setInCache<T extends Record<string, unknown>>(
    cacheSig: { (): T; update: (fn: (v: T) => T) => void },
    key: string,
    value: unknown,
  ): void {
    cacheSig.update((cache) => ({ ...(cache as Record<string, unknown>), [key]: value }) as T);
  }
}
