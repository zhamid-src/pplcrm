/**
 * @file Caching + de-duped loading for email bodies & headers using TanStack Query.
 */
import { computed, inject, Service } from '@angular/core';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { EmailsService } from '../emails-service';
import { type EmailId, EmailStateStore } from './email-state.store';

@Service()
export class EmailCacheStore {
  private readonly svc = inject(EmailsService);
  private readonly state = inject(EmailStateStore);
  private readonly queryClient = inject(QueryClient);

  /**
   * Reactive query for the currently selected email's body and header.
   * Leverages TanStack Query for background updates, de-duplication, and caching.
   */
  private readonly emailQuery = injectQuery(() => ({
    queryKey: ['email', this.state.currentSelectedEmailId()],
    queryFn: async () => {
      const id = this.state.currentSelectedEmailId();
      if (!id) return { body: '', header: null };
      const res = (await this.svc.getEmailWithHeaders(id)) as unknown as {
        body?: { body_html?: string } | null;
        header?: any;
      };
      return {
        body: res?.body?.body_html ?? '',
        header: res?.header ?? null,
      };
    },
    enabled: !!this.state.currentSelectedEmailId(),
    staleTime: 1000 * 60 * 5, // 5 minutes cache TTL
  }));

  /**
   * Reactive query for the currently selected email's activities feed.
   */
  private readonly activitiesQuery = injectQuery(() => ({
    queryKey: ['email-activities', this.state.currentSelectedEmailId()],
    queryFn: async () => {
      const id = this.state.currentSelectedEmailId();
      if (!id) return [];
      const rows = await this.svc.getActivities(id);
      return rows ?? [];
    },
    enabled: !!this.state.currentSelectedEmailId(),
    staleTime: 1000 * 60 * 5,
  }));

  /** Factory: computed body by id */
  public getEmailBodyById = (emailId: EmailId | null) =>
    computed(() => {
      const key = emailId ? String(emailId) : null;
      if (!key) return undefined;

      if (key === this.state.currentSelectedEmailId()) {
        return this.emailQuery.data()?.body;
      }

      const cached = this.queryClient.getQueryData<{ body: string; header: any }>(['email', key]);
      return cached?.body;
    });

  /** Factory: computed header by id */
  public getEmailHeaderById = (emailId: EmailId | null) =>
    computed(() => {
      const key = emailId ? String(emailId) : null;
      if (!key) return undefined;

      if (key === this.state.currentSelectedEmailId()) {
        return this.emailQuery.data()?.header;
      }

      const cached = this.queryClient.getQueryData<{ body: string; header: any }>(['email', key]);
      return cached?.header;
    });

  /** Factory: computed activity log by email id (undefined = not yet loaded, null = loaded empty) */
  public getEmailActivitiesById = (emailId: EmailId | null) =>
    computed(() => {
      const key = emailId ? String(emailId) : null;
      if (!key) return undefined;

      if (key === this.state.currentSelectedEmailId()) {
        return this.activitiesQuery.data();
      }

      return this.queryClient.getQueryData<any[]>(['email-activities', key]);
    });

  /** Update header cache after adding a comment */
  public appendCommentToHeader(emailId: EmailId, createdComment: any): void {
    const key = String(emailId);
    this.queryClient.setQueryData<{ body: string; header: any }>(['email', key], (old) => {
      if (!old) return old;
      const existingHeader = old.header;
      const nextHeader = existingHeader
        ? { ...existingHeader, comments: [...(existingHeader.comments ?? []), createdComment] }
        : { comments: [createdComment] };
      return { ...old, header: nextHeader };
    });
  }

  /** Load only the body (cached via TanStack Query) */
  public async loadEmailBody(emailId: EmailId): Promise<string> {
    const key = String(emailId);
    const data = await this.queryClient.fetchQuery({
      queryKey: ['email', key],
      queryFn: async () => {
        const res = (await this.svc.getEmailWithHeaders(key)) as unknown as {
          body?: { body_html?: string } | null;
          header?: any;
        };
        return {
          body: res?.body?.body_html ?? '',
          header: res?.header ?? null,
        };
      },
      staleTime: 1000 * 60 * 5,
    });
    return data.body;
  }

  /** Load combined body + headers (cached via TanStack Query) */
  public async loadEmailWithHeaders(emailId: EmailId): Promise<{ body: string; header: any }> {
    const key = String(emailId);
    return this.queryClient.fetchQuery({
      queryKey: ['email', key],
      queryFn: async () => {
        const res = (await this.svc.getEmailWithHeaders(key)) as unknown as {
          body?: { body_html?: string } | null;
          header?: any;
        };
        return {
          body: res?.body?.body_html ?? '',
          header: res?.header ?? null,
        };
      },
      staleTime: 1000 * 60 * 5,
    });
  }

  /** Load activity log for an email (always fetches fresh or respects staleTime) */
  public async loadEmailActivities(emailId: EmailId): Promise<any[]> {
    const key = String(emailId);
    return this.queryClient.fetchQuery({
      queryKey: ['email-activities', key],
      queryFn: async () => {
        const rows = await this.svc.getActivities(key);
        return rows ?? [];
      },
      staleTime: 1000 * 60 * 5,
    });
  }

  /** Remove a comment from the cached header (optimistic) */
  public removeCommentFromHeader(emailId: EmailId, commentId: string | number): void {
    const key = String(emailId);
    this.queryClient.setQueryData<{ body: string; header: any }>(['email', key], (old) => {
      if (!old) return old;
      const existingHeader = old.header;
      if (!existingHeader) return old;
      const nextHeader = {
        ...existingHeader,
        comments: ((existingHeader as any).comments ?? []).filter(
          (c: any) => String(c.id) !== String(commentId),
        ),
      };
      return { ...old, header: nextHeader };
    });
  }

  /** Replace the cached header entirely (rollback) */
  public replaceHeader(emailId: EmailId, header: any): void {
    const key = String(emailId);
    this.queryClient.setQueryData<{ body: string; header: any }>(['email', key], (old) => {
      if (!old) return { body: '', header };
      return { ...old, header };
    });
  }
}
