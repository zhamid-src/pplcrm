/**
 * @file Component handling comments for an email.
 */
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IAuthUser } from '@common';
import { TimeAgoPipe } from '@uxcommon/timeago.pipe';

import { AuthService } from '../../../auth/auth-service';
import { EmailsStore } from '../services/store/emailstore';
import type { EmailCommentType, EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-comments',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'email-comments.html',
})
export class EmailComments {
  private readonly auth = inject(AuthService);
  private readonly store = inject(EmailsStore);

  protected readonly saving = signal(false);
  protected readonly usersById = computed(() => {
    const map = new Map<string, IAuthUser>();
    for (const u of this.users()) map.set(u.id, u);
    return map;
  });

  /** Derive comments; null header => [] (already handled by ?? []) */
  public readonly comments = computed<Partial<EmailCommentType>[]>(() => {
    const em = this.email();
    if (!em) return [];
    const header = this.store.getEmailHeaderById(em.id)();
    return (header as any)?.comments ?? [];
  });
  public readonly users = signal<IAuthUser[]>([]);

  public email = input<EmailType | null>(null);
  public newComment = '';
  public trackByComment = (_: number, c: Partial<EmailCommentType>) => (c as any).id ?? _;

  constructor() {
    this.auth
      .getUsers()
      .then((u) => this.users.set(u))
      .catch((e) => console.error('Failed to load users:', e));

    // Ensure header/comments are fetched once. Only fetch when value is truly undefined.
    effect(() => {
      const em = this.email();
      if (!em) return;

      const headerVal = untracked(() => this.store.getEmailHeaderById(em.id)());
      if (typeof headerVal === 'undefined') {
        this.store.loadEmailWithHeaders(em.id).catch((e) => console.error('Failed to load email header/comments:', e));
      }
    });
  }

  public async addComment(): Promise<void> {
    const em = this.email();
    const text = this.newComment.trim();
    const author = this.auth.getUser()?.id;
    if (!em?.id || !text || !author) return;

    this.saving.set(true);
    try {
      await this.store.addComment(em.id, author, text);
      this.newComment = '';
    } catch (e) {
      console.error('Could not add comment:', e);
    } finally {
      this.saving.set(false);
    }
  }

  public getUserName(id: string | null = null): string {
    if (!id) return 'Not Assigned';
    return this.usersById().get(id)?.first_name ?? 'Not Assigned';
  }
}
