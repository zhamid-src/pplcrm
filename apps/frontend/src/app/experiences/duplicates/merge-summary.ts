import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';
import { LowerCasePipe } from '@angular/common';

@Component({
  selector: 'pc-duplicate-page-shell',
  imports: [RouterLink, Icon, LowerCasePipe],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <div class="mb-4">
        <a
          routerLink="/duplicates"
          class="btn btn-ghost btn-sm gap-2 text-base-content/60 hover:text-base-content px-0 no-underline"
        >
          <pc-icon name="arrow-left" [size]="4"></pc-icon>
          Back to Duplicate Types
        </a>
      </div>

      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-base-content flex items-center gap-2">
            <pc-icon [name]="icon()" class="text-primary" [size]="7"></pc-icon>
            Manage Duplicate {{ title() }}
          </h1>
          <p class="text-sm text-base-content/60 mt-1">{{ description() }}</p>
        </div>
      </div>

      @if (isLoading()) {
        <div class="flex flex-col items-center justify-center py-20">
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <p class="text-base-content/60 mt-4 font-light">Scanning database...</p>
        </div>
      }

      @if (!isLoading() && isEmpty()) {
        <div class="card bg-base-100 border border-base-300 shadow-xl max-w-xl mx-auto mt-10">
          <div class="card-body items-center text-center py-16">
            <div class="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center mb-4 animate-bounce">
              <pc-icon name="check-circle" class="text-success" [size]="10"></pc-icon>
            </div>
            <h2 class="card-title text-xl font-bold text-success">Clean Database!</h2>
            <p class="text-base-content/60 mt-2">No potential duplicate {{ title() | lowercase }} were found.</p>
            <div class="card-actions mt-6">
              <a [routerLink]="['/', entityRoute()]" class="btn btn-primary">Go to {{ title() }}</a>
            </div>
          </div>
        </div>
      }

      @if (!isLoading() && !isEmpty()) {
        <div class="grid gap-6">
          <ng-content></ng-content>
        </div>

        @if (totalPages() > 1) {
          <div
            class="flex flex-col sm:flex-row items-center justify-between mt-8 bg-base-100 border border-base-300 p-4 rounded-xl shadow-sm gap-4"
          >
            <div class="text-sm text-base-content/60 font-light">
              Page <span class="font-semibold text-base-content">{{ currentPage() }}</span> of
              <span class="font-semibold text-base-content">{{ totalPages() }}</span>
              ({{ totalGroups() }} duplicate groups total)
            </div>
            <div class="join">
              <button
                class="join-item btn btn-outline btn-sm gap-1"
                [disabled]="currentPage() === 1"
                (click)="onPrev.emit()"
              >
                <pc-icon name="chevron-left" [size]="4"></pc-icon> Previous
              </button>
              <button
                class="join-item btn btn-outline btn-sm gap-1"
                [disabled]="currentPage() >= totalPages()"
                (click)="onNext.emit()"
              >
                Next <pc-icon name="chevron-right" [size]="4"></pc-icon>
              </button>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class DuplicatePageShellComponent {
  title = input.required<string>();
  icon = input.required<PcIconNameType>();
  description = input.required<string>();
  entityRoute = input.required<string>();
  isLoading = input.required<boolean>();
  isEmpty = input.required<boolean>();
  currentPage = input.required<number>();
  totalPages = input.required<number>();
  totalGroups = input.required<number>();

  onNext = output<void>();
  onPrev = output<void>();
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
            <div class="text-base-content/50 py-4 italic text-center text-xs">
              Select which record to Keep and which to Merge.
            </div>
          } @else {
            <div class="space-y-3">
              <div class="alert alert-info py-2 text-[11px] leading-relaxed">
                <span>{{ mergeDescription() }}</span>
              </div>
              <div class="text-xs space-y-1.5 bg-base-100 p-2.5 rounded-lg border border-base-300">
                <div class="font-semibold text-base-content/70">Merge Actions:</div>
                <div class="flex justify-between text-success gap-2">
                  <span class="flex-shrink-0">Keep Primary:</span>
                  <span class="font-bold truncate text-right flex-1" [title]="targetName()">{{ targetName() }}</span>
                </div>
                <div class="flex justify-between text-error gap-2">
                  <span class="flex-shrink-0">Remove Duplicate:</span>
                  <span class="font-bold truncate text-right flex-1" [title]="sourceName()">{{ sourceName() }}</span>
                </div>
              </div>
            </div>
          }
        </div>

        <div class="card-actions mt-4 pt-3 border-t border-base-300">
          <button class="btn btn-primary btn-sm w-full gap-2" [disabled]="!hasSelections()" (click)="onMerge.emit()">
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
  onMerge = output<void>();
}
