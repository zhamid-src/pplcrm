import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild } from '@angular/core';

import { Icon } from '../icons/icon';

/** Feeds the unique `id`/`anchor-name` pair each instance needs to anchor its popover. */
let nextRowActionsId = 0;

/**
 * `pc-row-actions` — the house ⋯ overflow menu for a table row.
 *
 * The one idiom for per-row actions (design principles §4: destructive actions are
 * demoted to the ⋯ menu). Before this existed, five pages hand-rolled the same
 * DaisyUI dropdown and drifted apart on width, z-index, trigger element and border.
 *
 * It renders as a **popover-mode DaisyUI dropdown**: the menu carries the native
 * `popover` attribute, so an open menu is promoted to the browser's top layer and
 * placed against the trigger via CSS anchor positioning (`anchor-name` on the
 * button, `position-anchor` on the menu). This is what makes it usable inside a
 * table at all — `.pc-table-shell` sets `overflow-x: auto`, which per spec forces
 * `overflow-y: auto` too, so a normal absolutely-positioned `.dropdown-content` is
 * clipped by the shell's scroll box. No z-index can defeat ancestor clipping; only
 * leaving the shell's clipping context can, and the top layer does exactly that.
 *
 * Everything else — placement, open/close, Esc, light-dismiss, focus — is the
 * platform's (design §6, rung 1: DaisyUI + CSS, no JS positioning). The only
 * TypeScript here is the one bit of genuine state logic: closing the menu after an
 * action is chosen.
 *
 * Browsers without CSS anchor positioning (Safari < 26, Firefox < 144) fall back to
 * DaisyUI's own centered top-layer menu with a backdrop — unanchored, but never
 * clipped or truncated.
 *
 * Projected content is the menu body: `<li>` items, exactly as DaisyUI's `menu`
 * expects. Keep destructive items last and mark them `class="text-error"`.
 *
 * ```html
 * <td class="text-right">
 *   <pc-row-actions label="Route actions">
 *     <li><button type="button" (click)="openAssign(row)">Assign volunteer</button></li>
 *     <li><button type="button" class="text-error" (click)="deleteRoute(row)">Delete route</button></li>
 *   </pc-row-actions>
 * </td>
 * ```
 */
@Component({
  selector: 'pc-row-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <button
      type="button"
      class="btn btn-ghost btn-xs btn-circle"
      [attr.popovertarget]="menuId"
      [style.anchor-name]="anchorName"
      [attr.aria-label]="label()"
    >
      <pc-icon name="ellipsis-vertical" [size]="4" />
    </button>

    <!-- popover promotes the open menu to the top layer, escaping the table
         shell's scroll box; position-anchor pins it back to the button. -->
    <ul
      #menu
      popover
      [id]="menuId"
      [style.position-anchor]="anchorName"
      class="dropdown dropdown-end pc-dropdown-sheet menu sm:w-56 sm:rounded-box border border-base-300 bg-base-100 p-1 shadow-lg"
      (click)="closeMenu()"
    >
      <ng-content></ng-content>
    </ul>
  `,
  styles: `
    :host {
      display: inline-block;
    }

    /* Near the bottom of the viewport, drop the menu above the trigger instead of
       off-screen. position-area alone does not reposition itself. Scoped to sm+
       because below sm the menu is a pc-dropdown-sheet, and this unlayered
       component style would otherwise beat the utility's fallback reset. */
    @media (width >= 40rem) {
      ul[popover] {
        position-try-fallbacks: flip-block;
      }
    }
  `,
})
export class RowActions {
  private readonly menu = viewChild.required<ElementRef<HTMLElement>>('menu');

  protected readonly anchorName = `--pc-row-actions-${nextRowActionsId}`;
  protected readonly menuId = `pc-row-actions-${nextRowActionsId++}`;

  /** Accessible name for the ⋯ trigger. Name the record where you can: "Actions for Amira Hassan". */
  public readonly label = input<string>('Row actions');

  /**
   * Dismiss once an item is chosen. `popover="auto"` light-dismisses on outside
   * clicks and Esc, but a click *inside* the menu is not a dismissal to the
   * platform — and every item here is a terminal action, so it is to us.
   */
  protected closeMenu(): void {
    this.menu().nativeElement.hidePopover();
  }
}
