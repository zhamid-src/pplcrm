import { Component, ElementRef, inject, input, output } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

@Component({
  selector: 'pc-grid-tool-btn',
  host: { '(document:click)': 'onDocumentClick($event)' },
  template: `
    <li
      [class.tooltip-left]="placement() === 'left'"
      [class.tooltip-right]="placement() === 'right'"
      [class.tooltip-top]="placement() === 'top'"
      [class.tooltip-bottom]="placement() === 'bottom'"
      [class.hidden]="hidden()"
      [class.disabled]="!enabled() || spinning()"
      [class.cursor-not-allowed]="!enabled() || spinning()"
      [class.text-neutral-400]="!enabled() || spinning()"
      [class.opacity-50]="spinning()"
      class="tooltip tooltip-accent "
      [class.text-primary]="active()"
      [attr.data-tip]="tip()"
      (click)="onLiClick($event)"
    >
      @if (hasDropdown()) {
        <details class="dropdown group" [class.dropdown-end]="dropdownEnd()">
          <summary
            class="list-none cursor-pointer"
            [class.pc-no-caret]="hideCaret()"
            [class.touch-target]="touch()"
            (click)="onSummaryClick($event)"
          >
            <div class="flex h-full items-center justify-center ">
              <a role="button" class="relative pointer-events-none ">
                <pc-icon
                  [name]="icon()"
                  [size]="4"
                  class="group-hover:text-primary"
                  [class]="spinning() ? 'animate-spin' : ''"
                ></pc-icon>
                @if (badge() && badge()! > 0) {
                  <span class="badge badge-primary badge-xs absolute -top-0.5 -right-0.5 scale-75">
                    {{ badge() }}
                  </span>
                }
              </a>
            </div>
          </summary>
          <ng-content></ng-content>
        </details>
      } @else {
        <a class="flex items-center justify-center" [class.touch-target]="touch()"
          ><pc-icon
            [name]="icon()"
            [size]="4"
            class="group-hover:text-primary"
            [class]="spinning() ? 'animate-spin' : ''"
          ></pc-icon
        ></a>
      }
    </li>
  `,
  imports: [Icon],
  styles: [
    `
      :host {
        display: contents;
      }
      /* Suppress DaisyUI's .menu accordion caret (summary::after) on icon-only
         dropdown buttons that opt out via [hideCaret]. */
      summary.pc-no-caret::after {
        display: none;
      }
    `,
  ],
})
export class GridActionComponent {
  private readonly el = inject(ElementRef);

  public readonly action = output<void>();

  public enabled = input(true);
  public hidden = input(false);
  public active = input(false);
  public spinning = input(false);
  public icon = input.required<PcIconNameType>();
  public tip = input.required<string>();
  public placement = input<'top' | 'bottom' | 'left' | 'right'>('bottom');
  public hasDropdown = input(false);
  public dropdownEnd = input(true);
  /** Enlarge the tap surface to the 44×44px minimum touch target (mobile toolbar). */
  public touch = input(false);
  /** Hide the DaisyUI accordion caret for icon-only dropdown triggers. */
  public hideCaret = input(false);
  public badge = input<number | undefined>(undefined);

  public emitClick() {
    this.action.emit();
  }

  public onLiClick(_event: MouseEvent) {
    if (this.hasDropdown()) {
      return;
    }
    if (this.enabled() && !this.spinning()) {
      this.emitClick();
    }
  }

  public onSummaryClick(event: MouseEvent) {
    if (!this.enabled() || this.spinning()) {
      event.preventDefault();
    }
  }

  public onDocumentClick(event: MouseEvent) {
    if (!this.hasDropdown()) return;
    const detailsEl = this.el.nativeElement.querySelector('details');
    if (detailsEl && detailsEl.hasAttribute('open') && !this.el.nativeElement.contains(event.target)) {
      detailsEl.removeAttribute('open');
    }
  }
}
