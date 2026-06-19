import { Component, input, output } from '@angular/core';
import { Icon } from '@icons/icon';

@Component({
  selector: 'pc-side-drawer',
  imports: [Icon],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-30 flex justify-end">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/30 transition-opacity duration-300" (click)="onClose()"></div>
        <!-- Panel -->
        <div
          class="relative h-full w-full max-w-[90vw] bg-base-100 shadow-xl border-l border-base-300 flex flex-col z-10 transition-transform duration-300"
          [class]="widthClass()"
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b border-base-300">
            <div class="font-semibold text-base-content text-lg">
              {{ title() }}
            </div>
            <button class="btn btn-ghost btn-sm btn-circle" (click)="onClose()" aria-label="Close drawer">
              <pc-icon name="x-mark" [size]="4"></pc-icon>
            </button>
          </div>
          <!-- Body -->
          <div class="p-4 flex flex-col gap-3 overflow-y-auto flex-grow">
            <ng-content></ng-content>
          </div>
          <!-- Footer -->
          <ng-content select="[pc-drawer-footer]"></ng-content>
        </div>
      </div>
    }
  `,
})
export class SideDrawer {
  public isOpen = input.required<boolean>();
  public title = input<string>('');
  public size = input<'sm' | 'md' | 'lg'>('sm');
  public close = output<void>();

  protected onClose() {
    this.close.emit();
  }

  protected widthClass() {
    const s = this.size();
    if (s === 'lg') return 'sm:w-[700px]';
    if (s === 'md') return 'sm:w-[540px]';
    return 'sm:w-[420px]';
  }
}
