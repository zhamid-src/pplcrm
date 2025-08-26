/**
 * @file Component handling comments for an email.
 */
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { IAuthUser } from '@common';
import { Icon } from '@uxcommon/components/icons/icon';
import { ConfirmDialogService } from '@uxcommon/services/shared-dialog.service';
import { TimeAgoPipe } from '@uxcommon/pipes/timeago.pipe';

import { AuthService } from '../../../../auth/auth-service';
import { EmailsStore } from '../../services/store/emailstore';
import type { EmailCommentType, EmailType } from 'common/src/lib/models';

@Component({
  selector: 'pc-email-comments',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeAgoPipe, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'email-comments.html',
})
export class EmailComments {
  private readonly auth = inject(AuthService);
  private readonly store = inject(EmailsStore);

  private dialogs = inject(ConfirmDialogService);

  /** Track in-flight deletions: comment ids */
  protected readonly deleting = signal<Set<string>>(new Set());

  /** Prevent double-submit for add */
  protected readonly saving = signal(false);

  /** Fast lookup for user names */
  protected readonly usersById = computed(() => {
    const map = new Map<string, IAuthUser>();
    for (const u of this.users()) map.set(u.id, u);
    return map;
  });

  /** Comments come directly from the store’s header cache (reactive) */
  public readonly comments = computed<Partial<EmailCommentType>[]>(() => {
    const em = this.email();
    if (!em) return [];
    const header = this.store.getEmailHeaderById(em.id)();
    return (header as any)?.comments ?? [];
  });

  /** Tenant users for display names */
  public readonly users = signal<IAuthUser[]>([]);

  /** Email to comment on (nullable to avoid early reads) */
  public email = input<EmailType | null>(null);

  // in your component class
  @Input() public myUserId!: string; // set this from parent; used for chat-start/chat-end and bubble color

  /** New comment input */
  public newComment = '';

  /** Optional for *ngFor trackBy when not using new control flow */
  public trackByComment = (_: number, c: Partial<EmailCommentType>) => (c as any).id ?? _;

  constructor() {
    // Load users once
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

  /** Current user id (non-reactive is fine here) */
  private get meId(): string | null {
    return this.auth.getUser()?.id ?? null;
  }

  /** Add a comment (optimistic handled by store) */
  public async addComment(): Promise<void> {
    const em = this.email();
    const text = this.newComment.trim();
    const author = this.meId;
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

  /** Can the current user delete this comment? */
  public canDelete(comment: Partial<EmailCommentType>): boolean {
    const me = this.meId;
    const authorId = (comment as any)?.author_id ?? null;
    // Adjust rule if you want admins/moderators here
    return !!me && String(authorId) === String(me);
  }

  public async confirmDelete(comment: Partial<EmailCommentType>) {
    if (!comment || !this.canDelete(comment)) return;

    const ok = await this.dialogs.confirm({
      title: 'Delete comment?',
      message: 'The comment will be deleted permanently. You cannot undo this.',
      variant: 'danger',
      icon: 'trash',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      allowBackdropClose: false,
    });

    if (ok) {
      await this.deleteComment(comment); // your existing delete flow
    }
  }

  /** Get the display name for a user id */
  public getUserName(id: string | null = null): string {
    if (!id) return 'Not Assigned';
    return this.usersById().get(id)?.first_name ?? 'Not Assigned';
  }

  public isDeleting(id: any): boolean {
    return this.deleting().has(String(id));
  }

  /** Attempt to delete a comment (optimistic + rollback in store) */
  protected async deleteComment(comment: Partial<EmailCommentType>): Promise<void> {
    const em = this.email();
    const cid = String((comment as any).id ?? '');
    if (!em?.id || !cid) return;

    // de-dupe
    if (this.isDeleting(cid)) return;

    this.deleting.update((s) => new Set(s).add(cid));
    try {
      await this.store.deleteComment(em.id, cid);
    } catch (e) {
      console.error('Failed to delete comment:', e);
    } finally {
      this.deleting.update((s) => {
        const n = new Set(s);
        n.delete(cid);
        return n;
      });
    }
  }
}
