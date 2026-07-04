import { Component, computed, input, output } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

import { Breadcrumbs, PcBreadcrumb } from '../breadcrumbs/breadcrumbs';
import { FormActions } from '../form-actions/form-actions';

@Component({
  selector: 'pc-detail-header',
  imports: [Icon, FormActions, Breadcrumbs],
  template: `
    <div class="flex flex-col gap-2 border-b border-base-200 pb-4">
      @if (crumbs().length) {
        <pc-breadcrumbs [crumbs]="crumbs()"></pc-breadcrumbs>
      }
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 items-center gap-3">
          @if (icon()) {
            <pc-icon [name]="icon()!" class="text-primary" [size]="iconSize()"></pc-icon>
          }
          <div class="min-w-0">
            @if (eyebrow()) {
              <p class="text-[11px] font-semibold uppercase tracking-widest text-base-content/50">{{ eyebrow() }}</p>
            }
            <h1 class="truncate text-xl font-bold">{{ title() }}</h1>
            @if (subtitle()) {
              <p class="mt-0.5 text-sm text-base-content/60">{{ subtitle() }}</p>
            }
          </div>
        </div>

        <div class="flex items-center gap-2">
          <ng-content select="[pc-actions-prefix]"></ng-content>
          @if (showActions()) {
            <pc-form-actions
              class="w-full"
              [isLoading]="isLoading()"
              [signalForm]="form()"
              [disabled]="disabled()"
              [buttonsToShow]="formActionsButtons()"
              [btn1Text]="btn1Text()"
              [btn1Icon]="btn1Icon()"
              [showDelete]="false"
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
                class="menu dropdown-content z-30 w-48 rounded-box border border-base-200 bg-base-100 p-2 shadow-lg"
              >
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
  public readonly delete = output<void>();
  public readonly save = output<any>();

  public btn1Icon = input<PcIconNameType>('save');
  public btn1Text = input<string>('Save');
  public buttonsToShow = input<'two' | 'three'>('three');
  public crumbs = input<PcBreadcrumb[]>([]);
  public deleteText = input<string>('Delete');
  public disabled = input<boolean>(false);
  public eyebrow = input<string>('');
  public form = input<any>();
  public icon = input<PcIconNameType | null | undefined>();
  public iconSize = input<number>(5);
  public isLoading = input.required<boolean>();
  public showActions = input<boolean>(true);
  public showDelete = input<boolean>(false);
  public subtitle = input<string | null | undefined>();
  public title = input.required<string>();

  // Delete moved to the overflow menu. Suppressing the third button whenever
  // Delete is offered preserves the layout form-actions previously produced
  // when it rendered the Delete button inline.
  protected readonly formActionsButtons = computed<'two' | 'three'>(() =>
    this.showDelete() ? 'two' : this.buttonsToShow(),
  );
}
