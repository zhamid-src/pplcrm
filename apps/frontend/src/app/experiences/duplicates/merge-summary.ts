import { Component, effect, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';
import { BreadcrumbsService } from '@uxcommon/components/breadcrumbs/breadcrumbs.service';

@Component({
  selector: 'pc-duplicate-page-shell',
  imports: [RouterLink, Icon],
  templateUrl: './merge-summary.html',
})
export class DuplicatePageShellComponent {
  private readonly breadcrumbs = inject(BreadcrumbsService);

  title = input.required<string>();
  icon = input.required<PcIconNameType>();
  description = input.required<string>();
  entityRoute = input.required<string>();
  isLoading = input.required<boolean>();
  isEmpty = input.required<boolean>();
  currentPage = input.required<number>();
  totalPages = input.required<number>();
  totalGroups = input.required<number>();
  /** "N possible duplicates waiting · found by the nightly sweep — ... · last sweep TIME"
   * (spec §9.3) — see `BaseDuplicateManager.sweepSentence`. */
  sweepSentence = input<string | null>(null);

  next = output<void>();
  prev = output<void>();

  constructor() {
    // Navbar trail is the way back to the Duplicates hub — no in-body back link.
    effect(() => {
      this.breadcrumbs.setCrumbs([
        { label: 'Duplicates', route: '/duplicates' },
        { label: `Duplicate ${this.title().toLowerCase()}` },
      ]);
    });
  }
}

@Component({
  selector: 'pc-merge-summary',
  imports: [Icon],
  template: `
    <div class="card bg-base-300/40 border border-base-300 flex flex-col justify-between h-full">
      <div class="card-body p-5">
        <h4 class="font-bold text-base-content mb-2 flex items-center gap-2">
          <pc-icon name="information-circle" class="text-warning" [size]="5"></pc-icon>
          Merge Summary
        </h4>

        <div class="space-y-3 text-sm flex-1">
          @if (!hasSelections()) {
            <div i18n class="text-base-content/50 py-4 italic text-center text-xs">
              Select which record to Keep and which to Merge.
            </div>
          } @else {
            <div class="space-y-3">
              <div class="alert alert-info py-2 text-[11px] leading-relaxed">
                <span>{{ mergeDescription() }}</span>
              </div>
              <div class="text-xs space-y-1.5 bg-base-100 p-2.5 rounded-lg border border-base-300">
                <div i18n class="font-semibold text-base-content/70">Merge Actions:</div>
                <div class="flex justify-between text-success gap-2">
                  <span i18n class="flex-shrink-0">Keep Primary:</span>
                  <span class="font-bold truncate text-right flex-1" [title]="targetName()">{{ targetName() }}</span>
                </div>
                <div class="flex justify-between text-error gap-2">
                  <span i18n class="flex-shrink-0">Remove Duplicate:</span>
                  <span class="font-bold truncate text-right flex-1" [title]="sourceName()">{{ sourceName() }}</span>
                </div>
              </div>
            </div>
          }
        </div>

        <div class="card-actions mt-4 pt-3 border-t border-base-300">
          <button class="btn btn-primary btn-sm w-full gap-2" [disabled]="!hasSelections()" (click)="merge.emit()">
            <pc-icon name="merge" [size]="4"></pc-icon> Merge Records
          </button>
        </div>
      </div>
    </div>
  `,
})
export class MergeSummaryComponent {
  hasSelections = input.required<boolean>();
  targetName = input<string>('');
  sourceName = input<string>('');
  mergeDescription = input.required<string>();
  merge = output<void>();
}
