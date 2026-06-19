import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'pc-system-metadata',
  imports: [DatePipe],
  template: `
    <div
      class="w-full mt-6 pt-4 border-t border-base-200 text-[10px] text-base-content/40 flex gap-4 leading-normal"
      [class.justify-between]="layout() === 'row'"
      [class.flex-col]="layout() === 'col'"
      [class.gap-1]="layout() === 'col'"
    >
      @if (createdAt()) {
        <span
          >Created
          @if (createdBy() && createdBy() !== '?') {
            by {{ createdBy() }}
          }
          on {{ createdAt() | date: dateFormat() }}</span
        >
      }
      @if (updatedAt()) {
        <span
          >Updated {{ updatedAt() | date: dateFormat() }}
          @if (updatedBy() && updatedBy() !== '?') {
            by {{ updatedBy() }}
          }
        </span>
      }
    </div>
  `,
})
export class SystemMetadata {
  public createdAt = input<any>();
  public updatedAt = input<any>();
  public createdBy = input<string | null | undefined>();
  public updatedBy = input<string | null | undefined>();
  public layout = input<'row' | 'col'>('row');
  public dateFormat = input<string>('M/d/yyyy');
}
