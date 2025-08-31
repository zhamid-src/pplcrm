import { computed, signal } from '@angular/core';
import type { IAuthUser } from 'common/src/lib/auth';

export class MentionController {
  private getUsers: () => IAuthUser[];

  // reactive state
  public readonly open = signal(false);
  public readonly index = signal(0);
  public readonly query = signal('');

  // ephemeral caret/selection details
  private start = -1; // position of '@'
  private caretPos = 0;

  public readonly candidates = computed<IAuthUser[]>(() => {
    const q = this.query().toLowerCase();
    if (!this.open() || !q) return [];
    const users = this.getUsers() || [];
    const uniq = new Map<string, IAuthUser>();
    for (const u of users) {
      if (!u) continue;
      const name = (u.first_name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const local = email.split('@')[0] || '';
      if ((name && name.includes(q)) || (local && local.includes(q)) || (email && email.includes(q))) {
        if (!uniq.has(u.id)) uniq.set(u.id, u);
      }
    }
    return Array.from(uniq.values()).slice(0, 8);
  });

  constructor(getUsers: () => IAuthUser[]) {
    this.getUsers = getUsers;
  }

  public updateFromInput(text: string, caretPos: number): void {
    this.caretPos = caretPos;
    const res = this.findMentionAt(text, caretPos);
    if (!res) {
      this.open.set(false);
      this.query.set('');
      this.start = -1;
    } else {
      this.start = res.start;
      this.query.set(res.token);
      this.open.set(true);
      this.index.set(0);
    }
  }

  public handleKeydown(ev: KeyboardEvent, onSelect: (u: IAuthUser) => void): void {
    if (!this.open()) return;
    const list = this.candidates();
    if (!list.length) return;
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.index.set((this.index() + 1) % list.length);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.index.set((this.index() - 1 + list.length) % list.length);
    } else if (ev.key === 'Enter' || ev.key === 'Tab') {
      ev.preventDefault();
      onSelect(list[this.index()]);
    } else if (ev.key === 'Escape') {
      this.open.set(false);
    }
  }

  public select(user: IAuthUser, text: string): { text: string; caret: number } {
    if (this.start < 0) return { text, caret: this.caretPos };
    const display = user.first_name || user.email.split('@')[0];
    let before = text.slice(0, this.start);
    // Collapse any trailing whitespace/newlines immediately before '@' into a single space to keep inline
    before = before.replace(/\s+$/g, ' ');
    const after = text.slice(this.caretPos);
    const inserted = `@${display} `;
    const newText = before + inserted + after;
    const newCaret = before.length + inserted.length;
    this.open.set(false);
    this.index.set(0);
    return { text: newText, caret: newCaret };
  }

  /** Expose current start index of the mention trigger (or -1) */
  public getStartIndex(): number {
    return this.start;
  }

  /** Expose current caret index in the composer text */
  public getCaretIndex(): number {
    return this.caretPos;
  }

  private findMentionAt(text: string, pos: number): { start: number; token: string } | null {
    let i = pos - 1;
    while (i >= 0) {
      const ch = text[i];
      if (ch === '@') break;
      if (!/[-A-Za-z0-9_.]/.test(ch)) return null; // hit a separator before '@'
      i--;
    }
    if (i < 0 || text[i] !== '@') return null;
    const start = i;
    if (start > 0) {
      const prev = text[start - 1];
      if (/[@A-Za-z0-9_]/.test(prev)) return null;
    }
    const token = text.slice(start + 1, pos);
    if (!token) return null;
    return { start, token };
  }
}

export function userDisplay(u: IAuthUser): string {
  return u.first_name || u.email.split('@')[0];
}
