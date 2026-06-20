import { computed, inject, Service } from '@angular/core';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { EmailsService } from '../emails-service';
import { type EmailId, EmailStateStore } from './email-state.store';

@Service()
export class EmailCacheStore {
  private readonly svc = inject(EmailsService);
  private readonly state = inject(EmailStateStore);
  private readonly queryClient = inject(QueryClient);

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

  public getEmailActivitiesById = (emailId: EmailId | null) =>
    computed(() => {
      const key = emailId ? String(emailId) : null;
      if (!key) return undefined;

      if (key === this.state.currentSelectedEmailId()) {
        return this.activitiesQuery.data();
      }

      return this.queryClient.getQueryData<any[]>(['email-activities', key]);
    });

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

  public removeCommentFromHeader(emailId: EmailId, commentId: string | number): void {
    const key = String(emailId);
    this.queryClient.setQueryData<{ body: string; header: any }>(['email', key], (old) => {
      if (!old) return old;
      const existingHeader = old.header;
      if (!existingHeader) return old;
      const nextHeader = {
        ...existingHeader,
        comments: ((existingHeader as any).comments ?? []).filter((c: any) => String(c.id) !== String(commentId)),
      };
      return { ...old, header: nextHeader };
    });
  }

  public refreshEmailHeader(emailId: EmailId): void {
    const key = String(emailId);
    void this.queryClient.invalidateQueries({ queryKey: ['email', key] });
  }

  public replaceHeader(emailId: EmailId, header: any): void {
    const key = String(emailId);
    this.queryClient.setQueryData<{ body: string; header: any }>(['email', key], (old) => {
      if (!old) return { body: '', header };
      return { ...old, header };
    });
  }
}

