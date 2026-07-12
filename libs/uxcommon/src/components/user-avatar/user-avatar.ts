import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'pc-user-avatar',
  template: `
    <div class="avatar" [class.placeholder]="!avatarUrl()">
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
            referrerpolicy="no-referrer"
          />
        </div>
      } @else {
        <div
          class="rounded-full grid place-items-center font-bold ring ring-base-100 ring-offset-1 bg-primary/15 text-primary"
          [style.width.rem]="sizeRem()"
          [style.height.rem]="sizeRem()"
          [style.font-size.rem]="fontSizeRem()"
        >
          <span>{{ initials() }}</span>
        </div>
      }
    </div>
  `,
  host: { class: 'contents' },
})
export class UserAvatarComponent {
  readonly avatarUrl = input<string | null | undefined>(null);

  readonly name = input.required<string>();

  readonly size = input<number>(8);

  protected readonly sizeRem = computed(() => this.size() * 0.25);
  protected readonly fontSizeRem = computed(() => Math.max(0.5, this.size() * 0.25 * 0.4));

  protected readonly initials = computed(() => {
    const n = (this.name() ?? '').trim();
    if (!n) return '?';
    const parts = n.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    }
    return n[0]!.toUpperCase();
  });
}
