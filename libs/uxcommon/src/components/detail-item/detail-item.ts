import { Component, inject, input, output } from '@angular/core';
import { AlertService } from '../alerts/alert-service';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

@Component({
  selector: 'pc-detail-item',
  imports: [Icon],
  template: `
    <div class="flex flex-col gap-1 mb-4">
      <span class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
        {{ label() }}
      </span>
      <div class="flex items-center gap-2">
        @if (icon()) {
          <pc-icon [name]="icon()!" [size]="4" class="text-base-content/40 flex-shrink-0"></pc-icon>
        }
        @if (value() && link()) {
          <button
            type="button"
            class="text-left text-sm font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary break-words"
            (click)="linkClicked.emit()"
          >
            {{ value() }}
          </button>
        } @else {
          <span class="text-sm font-medium text-base-content break-words">
            @if (value()) {
              {{ value() }}
            } @else {
              <span class="italic text-base-content/30">Not provided</span>
            }
          </span>
        }
        @if (value() && copyable()) {
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-primary tooltip flex-shrink-0"
            [attr.data-tip]="'Copy ' + label()"
            (click)="copyToClipboard($event)"
          >
            <pc-icon name="document-duplicate" [size]="4"></pc-icon>
          </button>
        }
      </div>
    </div>
  `,
})
export class DetailItem {
  public label = input.required<string>();
  public value = input<string | null | undefined>();
  public icon = input<PcIconNameType | null | undefined>();
  public copyable = input<boolean>(false);
  /** Render the value as a clickable link that emits `linkClicked` (e.g. Address → Household). */
  public link = input<boolean>(false);
  public readonly linkClicked = output<void>();

  private readonly alertSvc = inject(AlertService);

  protected copyToClipboard(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    const val = this.value();
    if (!val) return;

    navigator.clipboard
      .writeText(val)
      .then(() => {
        this.alertSvc.showSuccess(`${this.label()} copied to clipboard`);
      })
      .catch(() => {
        this.alertSvc.showError(`Failed to copy ${this.label()}`);
      });
  }
}
