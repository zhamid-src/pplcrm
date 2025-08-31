import { Pipe, PipeTransform } from '@angular/core';

import type { IAuthUser } from 'common/src/lib/auth';

/**
 * Transforms plain text containing @mentions into HTML with highlighted mentions.
 *
 * Matching rules (case-insensitive):
 * - @first_name
 * - @email or @emailLocalPart
 *
 * It leaves unknown @tokens as-is.
 * Newlines are converted to <br> for display.
 */
@Pipe({ name: 'mentionify', standalone: true })
export class MentionifyPipe implements PipeTransform {
  public transform(text: string | null | undefined, users: IAuthUser[] | null | undefined): string {
    if (!text) return '';
    const list = users ?? [];

    const byFirst = new Map<string, IAuthUser>();
    const byEmail = new Map<string, IAuthUser>();
    const byLocal = new Map<string, IAuthUser>();

    for (const u of list) {
      if (!u) continue;
      if (u.first_name) byFirst.set(u.first_name.toLowerCase(), u);
      if (u.email) {
        const em = u.email.toLowerCase();
        byEmail.set(em, u);
        const local = em.split('@')[0] ?? '';
        if (local) byLocal.set(local, u);
      }
    }

    // Normalize Windows newlines and collapse a single newline directly before a mention into a space
    const normalized = text.replace(/\r\n/g, '\n').replace(/\n(?=@[A-Za-z0-9._-]+)/g, ' ');

    // Replace @mentions while preserving preceding character (so we don't match email domains)
    const replaced = normalized.replace(/(^|[^\w@])@([A-Za-z0-9._-]+)/g, (_m, pre: string, token: string) => {
      const key = token.toLowerCase();
      const u = byFirst.get(key) || byEmail.get(key) || byLocal.get(key);
      if (!u) return `${pre}@${token}`; // leave as-is if no match

      // Display prefers first_name; fallback to email local part
      const display = u.first_name || u.email.split('@')[0];
      // Use utility classes for styling; sanitized later by sanitizeHtml pipe
      // Mark with data-mention for CSS targeting to enforce inline layout
      return `${pre}<span data-mention="1" class="inline font-bold hover:cursor-pointer">@${this.escapeHtml(display)}</span>`;
    });

    // Convert newlines to <br>
    return replaced.replace(/\n/g, '<br>');
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
