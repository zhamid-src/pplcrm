import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * `pc-table` — the lightweight presentational table shell.
 *
 * The counterpart to the house `pc-datagrid`: where the datagrid owns data
 * fetching, sorting, filtering, selection and inline editing, `pc-table` owns
 * only the *chrome* — the bordered shell, the micro-caps header row, cell
 * density and the shared skeleton-loading idiom. It exists so bespoke tables
 * (Tags, Issues, Donations) stay visually identical to the datagrid without
 * inheriting its machinery. See the `pplcrm-table` skill.
 *
 * All visual styling comes from the shared, global `.pc-table-shell` / `.pc-table`
 * contract in `apps/frontend/src/styles.css` — the single source of truth both
 * this component and the datagrid consume. This component ships no styles of its
 * own (emulated encapsulation could not reach the projected rows anyway).
 *
 * Consumers keep full control of every cell and of the empty state (which is
 * per-entity by design — see design principles §3), projecting:
 *   - `[pcTableHead]` — the `<th>` cells for the header row
 *   - the default slot — the body rows *and* the page's own empty-state row,
 *     rendered only when not loading
 *   - `[pcTableFooter]` — optional caption/pagination hint rendered inside the
 *     shell, below the table (e.g. "Showing the latest 25 of 312")
 *
 * ```html
 * <pc-table [loading]="loading()" [columns]="5">
 *   <ng-container pcTableHead>
 *     <th>Tag</th><th>People</th><th>Last applied</th><th class="w-10"></th>
 *   </ng-container>
 *
 *   @if (rows().length === 0) {
 *     <tr><td colspan="5">…guided empty state…</td></tr>
 *   } @else {
 *     @for (row of rows(); track row.id) {
 *       <tr [class.animate-saved-flash]="highlightId() === row.id">…</tr>
 *     }
 *   }
 * </pc-table>
 * ```
 */
@Component({
  selector: 'pc-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pc-table-shell">
      <table class="table pc-table w-full">
        <thead>
          <tr>
            <ng-content select="[pcTableHead]"></ng-content>
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            @for (row of skeletonList(); track row) {
              <tr>
                <td [attr.colspan]="columns()">
                  <div class="skeleton h-6 w-full"></div>
                </td>
              </tr>
            }
          } @else {
            <ng-content></ng-content>
          }
        </tbody>
      </table>
      <ng-content select="[pcTableFooter]"></ng-content>
    </div>
  `,
})
export class Table {
  /** Number of columns — drives the skeleton row's colspan so it spans the table. */
  public readonly columns = input.required<number>();

  /** When true, render placeholder skeleton rows instead of the projected body. */
  public readonly loading = input<boolean>(false);

  /** How many skeleton rows to show while loading. */
  public readonly skeletonRows = input<number>(5);

  protected readonly skeletonList = computed<number[]>(() => Array.from({ length: this.skeletonRows() }, (_, i) => i));
}
