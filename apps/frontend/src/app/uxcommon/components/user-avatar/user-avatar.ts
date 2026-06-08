import { Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';

/**
 * Reusable user avatar component.
 *
 * Displays a profile photo when `avatarUrl` is provided, otherwise
 * falls back to a gradient circle showing the user's initials.
 *
 * Usage:
 *   <pc-user-avatar [name]="user.first_name" [avatarUrl]="user.avatar_url" [size]="8" />
 */
@Component({
  selector: 'pc-user-avatar',
  template: `
    <div
      class="avatar"
      [class.placeholder]="!avatarUrl()"
    >
      @if (avatarUrl()) {
        <div
          class="rounded-full overflow-hidden ring ring-base-100 ring-offset-1"
          [style.width.rem]="sizeRem()"
          [style.height.rem]="sizeRem()"
        >
          <img
            [src]="avatarUrl()!"
            [alt]="name() + ' avatar'"
            class="w-full h-full object-cover"
            [attr.referrerpolicy]="'no-referrer'"
          />
        </div>
      } @else {
        <div
          class="rounded-full grid place-items-center font-bold ring ring-base-100 ring-offset-1"
          [style.width.rem]="sizeRem()"
          [style.height.rem]="sizeRem()"
          [style.font-size.rem]="fontSizeRem()"
          [ngClass]="colorClass()"
        >
          <span>{{ initials() }}</span>
        </div>
      }
    </div>
  `,
  imports: [NgClass],
  host: { class: 'contents' },
})
export class UserAvatarComponent {
  /** Pre-computed download URL for the user's avatar, or null/undefined. */
  readonly avatarUrl = input<string | null | undefined>(null);

  /** Full name (or first name) used to derive initials and pick a colour. */
  readonly name = input.required<string>();

  /**
   * Size in Tailwind units (1 unit = 0.25rem).
   * Defaults to 8 (= 2rem / 32px).
   */
  readonly size = input<number>(8);

  protected readonly sizeRem = computed(() => this.size() * 0.25);
  protected readonly fontSizeRem = computed(() => Math.max(0.5, this.size() * 0.25 * 0.4));

  protected readonly initials = computed(() => {
    const n = (this.name() ?? '').trim();
    if (!n) return '?';
    const parts = n.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n[0].toUpperCase();
  });

  protected readonly colorClass = computed(() => {
    const PALETTES = [
      'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
      'bg-teal-500/20 text-teal-700 dark:text-teal-300',
      'bg-purple-500/20 text-purple-700 dark:text-purple-300',
      'bg-rose-500/20 text-rose-700 dark:text-rose-300',
      'bg-amber-500/20 text-amber-700 dark:text-amber-300',
      'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
      'bg-blue-500/20 text-blue-700 dark:text-blue-300',
      'bg-orange-500/20 text-orange-700 dark:text-orange-300',
      'bg-pink-500/20 text-pink-700 dark:text-pink-300',
      'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300',
    ];
    const n = this.name() ?? '';
    let sum = 0;
    for (let i = 0; i < n.length; i++) sum += n.charCodeAt(i);
    return PALETTES[sum % PALETTES.length];
  });
}
