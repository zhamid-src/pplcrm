import { Component, Signal, computed, input, output, signal } from '@angular/core';
import { Icon } from '@icons/icon';

/**
 * The `tagitem` component displays a single tag UI element with optional delete functionality and animation.
 *
 * ## Inputs
 * - `name`: The label or name of the tag (required).
 * - `canDelete`: Whether to show a delete icon (defaults to `true`).
 *
 * ## Outputs
 * - `click`: Emits the tag name when the tag is clicked.
 * - `close`: Emits the tag name when the tag is deleted. This should be handled by the parent to remove the tag from the array **after** a short delay to allow the CSS animation to complete.
 *
 * ## Template Notes
 * - The `destroy` flag should be bound to a CSS class to trigger the exit animation (`.destroy`).
 *
 * ## Usage
 * Used in tag lists or input interfaces to represent individual tags with interaction capabilities.
 */
@Component({
  selector: 'pc-tagitem',
  imports: [Icon],
  styleUrl: './tagitem.css',
  template: `<div
    class="badge rounded-lg px-0 gap-1 pl-2 bordered animate-flash"
    [style.background]="background() || null"
    [style.color]="textColor()"
    [style.borderColor]="borderColor()"
  >
    <span
      (click)="emitClick()"
      class="tag-label cursor-pointer font-light pr-1"
      [class.pr-2]="!canDelete()"
      [style.color]="textColor()"
    >
      {{ name() }}</span
    >
    <pc-icon
      name="x-mark"
      [size]="3"
      class="tag-remove hover:text-error cursor-pointer pr-1 mr-0"
      [style.color]="textColor()"
      [class.hidden]="!canDelete()"
      (click)="emitClose()"
    />
  </div> `,
})
export class TagItem {
  public readonly click = output<string>();
  public readonly close = output<string>();

  public canDelete = input<boolean>(true);
  public invisible = input<Signal<boolean>>(signal(false));
  public name = input.required<string>();
  public color = input<string | null | undefined>(null);

  protected readonly background = computed(() => this.normalizeColor(this.color()));
  protected readonly textColor = computed(() => this.computeTextColor(this.background()));
  protected readonly borderColor = computed(() => this.background() ?? '#d1d5db');

  public emitClick() {
    this.click.emit(this.name());
  }

  public emitClose() {
    // Destroy here sets the animation by adding the class 'destroy' to the tag
    // It does mean that the tag should be removed from the array in the parent component
    // after some delay, so that the animation can complete
    this.close.emit(this.name());
  }

  private normalizeColor(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!/^#?[0-9a-fA-F]{6}$/.test(trimmed)) return null;
    return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  }

  private computeTextColor(hex: string | null): string {
    if (!hex) return '#374151';
    const rgb = this.hexToRgb(hex);
    if (!rgb) return '#f9fafb';
    const [r, g, b] = rgb.map((v) => v / 255);
    const [rLin, gLin, bLin] = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    const luminance = 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
    return luminance > 0.5 ? '#111827' : '#f9fafb';
  }

  private hexToRgb(hex: string): [number, number, number] | null {
    const normalized = hex.replace('#', '');
    const int = parseInt(normalized, 16);
    if (Number.isNaN(int)) return null;
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
  }
}
