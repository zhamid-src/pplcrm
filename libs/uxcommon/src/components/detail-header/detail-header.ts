import { Component, DestroyRef, computed, effect, inject, input, output } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

import { PcBreadcrumb } from '../breadcrumbs/breadcrumbs';
import { BreadcrumbsService } from '../breadcrumbs/breadcrumbs.service';
import { FormActions } from '../form-actions/form-actions';

@Component({
  selector: 'pc-detail-header',
  imports: [Icon, FormActions],
  template: `
    <div class="flex flex-col gap-2 rounded-xl border border-base-200 bg-base-100 p-5 shadow-sm">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 items-center gap-3">
          @if (avatarText()) {
            <span
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
              aria-hidden="true"
              >{{ avatarText() }}</span
            >
          } @else if (icon()) {
            <pc-icon [name]="icon()!" class="text-primary" [size]="iconSize()"></pc-icon>
          }
          <div class="min-w-0">
            @if (eyebrow()) {
              <p class="text-[11px] font-semibold uppercase tracking-widest text-base-content/50">{{ eyebrow() }}</p>
            }
            <div class="flex min-w-0 items-center gap-2">
              <h1 class="truncate text-xl font-bold">{{ title() }}</h1>
              @if (statusChip()) {
                <span
                  class="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success whitespace-nowrap"
                  >{{ statusChip() }}</span
                >
              }
            </div>
            @if (dirtyFieldCount() > 0) {
              <p class="mt-0.5 flex items-center gap-1.5 text-sm text-warning">
                <span class="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true"></span>
                Unsaved changes · {{ dirtyFieldCount() }} field{{ dirtyFieldCount() === 1 ? '' : 's' }}
              </p>
            } @else if (subtitle()) {
              <p class="mt-0.5 text-sm text-base-content/60">{{ subtitle() }}</p>
            }
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- "N of M filtered" walk-the-list pager — lives in the header card (design source),
               so J/K navigation is visible next to the actions. Self-hides with no grid context. -->
          @if (positionLabel()) {
            <div class="mr-1 flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                class="btn btn-circle btn-ghost btn-xs"
                [attr.aria-label]="prevLabel()"
                [disabled]="!hasPrev()"
                [class.btn-ghost]="!hasPrev()"
                (click)="prevRecord.emit()"
              >
                <pc-icon name="chevron-left" [size]="4"></pc-icon>
              </button>
              <span class="whitespace-nowrap px-1 text-xs tabular-nums text-base-content/50">{{
                positionLabel()
              }}</span>
              <button
                type="button"
                class="btn btn-circle btn-xs"
                [attr.aria-label]="nextLabel()"
                [disabled]="!hasNext()"
                [class.btn-ghost]="!hasNext()"
                (click)="nextRecord.emit()"
              >
                <pc-icon name="chevron-right" [size]="4"></pc-icon>
              </button>
            </div>
          }
          <ng-content select="[pc-actions-prefix]"></ng-content>
          @if (showActions()) {
            <pc-form-actions
              size="xs"
              [isLoading]="isLoading()"
              [signalForm]="form()"
              [disabled]="disabled()"
              [saveAlwaysEnabled]="saveAlwaysEnabled()"
              [buttonsToShow]="formActionsButtons()"
              [btn1Text]="btn1Text()"
              [btn1Icon]="btn1Icon()"
              [showDelete]="false"
              [showCancel]="showCancel()"
              (btn1Clicked)="save.emit($event)"
            ></pc-form-actions>
          }
          <ng-content select="[pc-actions-suffix]"></ng-content>
          @if (showDelete()) {
            <div class="dropdown dropdown-end">
              <button type="button" tabindex="0" class="btn btn-circle btn-ghost btn-sm" aria-label="More actions">
                <pc-icon name="ellipsis-vertical" [size]="5"></pc-icon>
              </button>
              <ul
                tabindex="0"
                class="menu dropdown-content z-30 w-56 rounded-box border border-base-200 bg-base-100 p-2 shadow-lg"
              >
                <!-- Page-supplied overflow items (e.g. Export vCard, Merge…) render above Delete (§3) -->
                <ng-content select="[pc-overflow-extra]"></ng-content>
                <li>
                  <button type="button" class="text-error" [disabled]="isLoading()" (click)="delete.emit()">
                    <pc-icon name="trash" [size]="4"></pc-icon>
                    {{ deleteText() }}
                  </button>
                </li>
              </ul>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class DetailHeader {
  private readonly breadcrumbs = inject(BreadcrumbsService);

  public readonly delete = output<void>();
  public readonly save = output<any>();
  public readonly prevRecord = output<void>();
  public readonly nextRecord = output<void>();

  public btn1Icon = input<PcIconNameType>('save');
  public btn1Text = input<string>('Save');
  public buttonsToShow = input<'two' | 'three'>('three');
  public crumbs = input<PcBreadcrumb[]>([]);
  public deleteText = input<string>('Delete');
  public disabled = input<boolean>(false);
  /** §4: keep the primary button enabled regardless of validity/dirtiness. */
  public saveAlwaysEnabled = input<boolean>(false);
  public eyebrow = input<string>('');
  /** Optional success-tinted status chip beside the title, e.g. "Monthly donor" (§3). */
  public statusChip = input<string | null>(null);
  public form = input<any>();
  public icon = input<PcIconNameType | null | undefined>();
  public iconSize = input<number>(5);
  /** Optional initials shown in a circular avatar left of the title (e.g. "JB"). Takes precedence over icon(). */
  public avatarText = input<string | null>(null);
  public isLoading = input.required<boolean>();
  public showActions = input<boolean>(true);
  public showDelete = input<boolean>(false);
  /** Forwarded to form-actions. Defaults on for edit forms (used directly);
   * detail-layout overrides it to false for read views. */
  public showCancel = input<boolean>(true);
  public subtitle = input<string | null | undefined>();
  public title = input.required<string>();

  /** Optional "N of M filtered" pager, rendered inline with the breadcrumb trail. */
  public positionLabel = input<string | null>(null);
  public hasPrev = input<boolean>(false);
  public hasNext = input<boolean>(false);
  public prevLabel = input<string>('Previous record');
  public nextLabel = input<string>('Next record');

  /** When > 0, replaces the subtitle with an amber "Unsaved changes · N fields" line. */
  public dirtyFieldCount = input<number>(0);

  // Delete moved to the overflow menu. Suppressing the third button whenever
  // Delete is offered preserves the layout form-actions previously produced
  // when it rendered the Delete button inline.
  protected readonly formActionsButtons = computed<'two' | 'three'>(() =>
    this.showDelete() ? 'two' : this.buttonsToShow(),
  );

  constructor() {
    // The breadcrumb trail renders in the navbar; the record pager now lives in
    // this header card (design source), so publish the trail only and leave the
    // navbar pager empty to avoid a duplicate. Clear on destroy so the strip
    // empties when navigating to a page (e.g. a grid) that owns no trail.
    effect(() => {
      this.breadcrumbs.set({
        crumbs: this.crumbs(),
        positionLabel: null,
        hasPrev: false,
        hasNext: false,
        prevLabel: this.prevLabel(),
        nextLabel: this.nextLabel(),
        onPrev: () => this.prevRecord.emit(),
        onNext: () => this.nextRecord.emit(),
      });
    });

    inject(DestroyRef).onDestroy(() => this.breadcrumbs.clear());
  }
}
