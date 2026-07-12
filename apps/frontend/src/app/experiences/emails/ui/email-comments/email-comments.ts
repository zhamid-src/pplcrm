import { DatePipe, SlicePipe } from '@angular/common';
import { Component, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import type { IAuthUser } from '../../../../../../../../libs/common/src';
import { Icon } from '@uxcommon/components/icons/icon';
import { TimeAgoPipe } from '@uxcommon/pipes/timeago.pipe';

import { AuthService } from '../../../../auth/auth-service';
import { UserService } from '../../../../services/user.service';
import { ConfirmDialogService } from '../../../../services/shared-dialog.service';
import { MentionController, userDisplay } from '@uxcommon/mentions/mention-controller';
import { MentionifyPipe } from '@uxcommon/pipes/mention.pipe';
import { SanitizeHtmlPipe } from '@uxcommon/pipes/sanitize-html.pipe';
import { EmailsStore } from '../../services/store/emailstore';
import type { EmailCommentType, EmailType } from '../../../../../../../../libs/common/src/lib/models';

@Component({
  selector: 'pc-email-comments',
  imports: [DatePipe, SlicePipe, TimeAgoPipe, Icon, SanitizeHtmlPipe, MentionifyPipe],
  templateUrl: 'email-comments.html',
})
export class EmailComments {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly store = inject(EmailsStore);

  private dialogs = inject(ConfirmDialogService);

  private readonly emailComposer = viewChild<ElementRef<HTMLTextAreaElement>>('emailComposer');

  protected readonly deleting = signal<Set<string>>(new Set());

  protected readonly saving = signal(false);

  protected readonly usersById = computed(() => {
    const map = new Map<string, IAuthUser>();
    for (const u of this.users()) map.set(u.id, u);
    return map;
  });

  public readonly comments = computed<Partial<EmailCommentType>[]>(() => {
    const em = this.email();
    if (!em) return [];
    const header = this.store.getEmailHeaderById(em.id)();
    return (header as unknown as { comments?: Partial<EmailCommentType>[] })?.comments ?? [];
  });

  public readonly users = signal<IAuthUser[]>([]);

  public email = input<EmailType | null>(null);
  public mc = new MentionController(() => this.users());

  // in your component class
  public myUserId = input<string>(); // set this from parent; used for chat-start/chat-end and bubble color

  public newComment = signal('');
  public trackByComment = (_: number, c: Partial<EmailCommentType>): string | number => c.id ?? _;

  // expose util for templates
  public userDisplay = userDisplay;

  constructor() {
    // Load users once
    this.userService
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

  private get meId(): string | null {
    return this.auth.getUser()?.id ?? null;
  }

  public async addComment(): Promise<void> {
    const em = this.email();
    const text = this.newComment().trim();
    const author = this.meId;
    if (!em?.id || !text || !author) return;

    this.saving.set(true);
    try {
      await this.store.addComment(em.id, author, text);
      this.newComment.set('');
    } catch (e) {
      console.error('Could not add comment:', e);
    } finally {
      this.saving.set(false);
    }
  }

  public canDelete(comment: Partial<EmailCommentType>): boolean {
    const me = this.meId;
    const authorId = comment.author_id ?? null;
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

  public getUserName(id: string | null = null): string {
    if (!id) return 'Not Assigned';
    return this.usersById().get(id)?.first_name ?? 'Not Assigned';
  }

  public isDeleting(id: string | number | undefined): boolean {
    return this.deleting().has(String(id));
  }

  protected async deleteComment(comment: Partial<EmailCommentType>): Promise<void> {
    const em = this.email();
    const cid = String(comment.id ?? '');
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

  protected onComposerClick(ev: Event) {
    const el = ev.target as HTMLTextAreaElement;
    const caret = el.selectionStart ?? 0;
    this.mc.updateFromInput(this.newComment(), caret);
  }

  // ===== Mention autocomplete handlers (textarea) =====
  protected onComposerInput(ev: Event) {
    const el = ev.target as HTMLTextAreaElement;
    this.newComment.set(el.value);
    const caret = el.selectionStart ?? this.newComment().length;
    this.mc.updateFromInput(this.newComment(), caret);
  }

  protected onComposerKeydown(ev: KeyboardEvent) {
    // Submit on Cmd/Ctrl+Enter
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
      ev.preventDefault();
      ev.stopPropagation();
      void this.addComment();
      return;
    }
    this.mc.handleKeydown(ev, (u) => this.selectMention(u));
  }

  protected selectMention(u: IAuthUser, ev?: Event) {
    ev?.preventDefault();
    const res = this.mc.select(u, this.newComment());
    this.newComment.set(res.text);
    const el = this.emailComposer()?.nativeElement;
    setTimeout(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(res.caret, res.caret);
      }
    });
  }
}
