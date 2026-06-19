import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'pc-entity-overview',
  imports: [DatePipe],
  template: `
    <div class="card bg-base-200/50 border border-base-300 shadow-md">
      <div class="card-body p-5 space-y-3">
        <h4 class="font-bold text-sm text-base-content uppercase tracking-wider">{{ title() }}</h4>
        <div class="text-xs text-base-content/75 space-y-2">
          <ng-content select="[pc-overview-prefix]"></ng-content>

          @if (createdAt()) {
            <div class="flex justify-between">
              <span>Created:</span>
              <span class="font-semibold">{{ createdAt() | date: 'medium' }}</span>
            </div>
          }
          @if (updatedAt()) {
            <div class="flex justify-between">
              <span>Last Updated:</span>
              <span class="font-semibold">{{ updatedAt() | date: 'medium' }}</span>
            </div>
          }
          @if (createdBy()) {
            <div class="flex justify-between">
              <span>Created By:</span>
              <span class="font-semibold">{{ createdBy() }}</span>
            </div>
          }

          <ng-content select="[pc-overview-suffix]"></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class EntityOverview {
  public title = input<string>('Overview');
  public createdAt = input<string | Date | null | undefined>();
  public updatedAt = input<string | Date | null | undefined>();
  public createdBy = input<string | null | undefined>();
}
