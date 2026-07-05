import { Component, input, output } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';
import { PcBreadcrumb } from '../breadcrumbs/breadcrumbs';
import { DetailHeader } from '../detail-header/detail-header';

@Component({
  selector: 'pc-detail-layout',
  imports: [Icon, DetailHeader],
  host: {
    '(document:keydown)': 'handleKeydown($event)',
  },
  template: `
    <div class="flex min-h-full flex-col bg-base-200/50 p-6">
      <div class="flex w-full max-w-7xl flex-col gap-6">
        <!-- Header -->
        <pc-detail-header
          [title]="title()"
          [subtitle]="subtitle()"
          [crumbs]="crumbs()"
          [eyebrow]="eyebrow()"
          [statusChip]="statusChip()"
          [icon]="icon()"
          [iconSize]="iconSize()"
          [isLoading]="isLoading()"
          [disabled]="disabled()"
          [showActions]="showActions()"
          [showDelete]="showDelete()"
          [deleteText]="deleteText()"
          [btn1Text]="btn1Text()"
          [btn1Icon]="btn1Icon()"
          [positionLabel]="positionLabel()"
          [hasPrev]="hasPrev()"
          [hasNext]="hasNext()"
          [prevLabel]="prevLabel()"
          [nextLabel]="nextLabel()"
          (save)="save.emit($event)"
          (delete)="delete.emit()"
          (prevRecord)="prevRecord.emit()"
          (nextRecord)="nextRecord.emit()"
        >
          <ng-content select="[pc-actions-prefix]" pc-actions-prefix></ng-content>
          <ng-content select="[pc-actions-suffix]" pc-actions-suffix></ng-content>
          <ng-content select="[pc-overflow-extra]" pc-overflow-extra></ng-content>
        </pc-detail-header>

        <!-- Body/Content Area -->
        @if (isLoading()) {
          <div class="flex justify-center items-center py-20">
            <progress class="progress w-56"></progress>
          </div>
        } @else if (error()) {
          <div class="alert alert-error shadow-md border-error/20 flex items-center gap-3">
            <pc-icon name="exclamation-triangle" [size]="6"></pc-icon>
            <span>{{ error() }}</span>
          </div>
        } @else if (!hasRecord()) {
          <div class="alert alert-error shadow-md border-error/20 flex items-center gap-3">
            <pc-icon name="exclamation-triangle" [size]="6"></pc-icon>
            <span>{{ notFoundText() }}</span>
          </div>
        } @else {
          <!-- Main Content Slot -->
          <ng-content></ng-content>
        }
      </div>
    </div>
  `,
})
export class DetailLayout {
  public title = input.required<string>();
  public subtitle = input<string | null | undefined>();
  public crumbs = input<PcBreadcrumb[]>([]);
  public eyebrow = input<string>('');
  /** Optional success-tinted status chip beside the title (§3). */
  public statusChip = input<string | null>(null);
  public icon = input<PcIconNameType | null | undefined>();
  public iconSize = input<number>(6);
  public isLoading = input.required<boolean>();
  public error = input<string | null | undefined>();
  public hasRecord = input<boolean>(true);
  public notFoundText = input<string>('Record not found or failed to load.');

  public showActions = input<boolean>(true);
  public showDelete = input<boolean>(false);
  public deleteText = input<string>('Delete');
  public btn1Text = input<string>('Edit');
  public btn1Icon = input<PcIconNameType>('pencil-square');
  public disabled = input<boolean>(false);

  /** Optional "N of M filtered" pager; also drives J/K keyboard navigation while this page is open. */
  public positionLabel = input<string | null>(null);
  public hasPrev = input<boolean>(false);
  public hasNext = input<boolean>(false);
  public prevLabel = input<string>('Previous record');
  public nextLabel = input<string>('Next record');

  public readonly save = output<any>();
  public readonly delete = output<void>();
  public readonly prevRecord = output<void>();
  public readonly nextRecord = output<void>();

  protected handleKeydown(event: KeyboardEvent): void {
    if (!this.positionLabel()) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isEditableTarget(event.target)) return;

    const key = event.key.toLowerCase();
    if (key === 'j' && this.hasNext()) {
      event.preventDefault();
      this.nextRecord.emit();
    } else if (key === 'k' && this.hasPrev()) {
      event.preventDefault();
      this.prevRecord.emit();
    }
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}
