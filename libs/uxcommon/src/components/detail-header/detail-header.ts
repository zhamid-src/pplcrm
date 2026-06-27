import { Component, input, output } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

import { FormActions } from '../form-actions/form-actions';

@Component({
  selector: 'pc-detail-header',
  imports: [Icon, FormActions],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-base-200 pb-4">
      <div class="flex justify-center gap-3">
        @if (icon()) {
          <pc-icon [name]="icon()!" class="text-primary" [size]="iconSize()"></pc-icon>
        }
        <div>
          <h1 class="text-xl font-bold">{{ title() }}</h1>
          @if (subtitle()) {
            <p class="text-sm text-base-content/60 mt-0.5">{{ subtitle() }}</p>
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
            [buttonsToShow]="buttonsToShow()"
            [btn1Text]="btn1Text()"
            [btn1Icon]="btn1Icon()"
            [showDelete]="showDelete()"
            [deleteText]="deleteText()"
            (btn1Clicked)="save.emit($event)"
            (deleteClicked)="delete.emit()"
          ></pc-form-actions>
        }
        <ng-content select="[pc-actions-suffix]"></ng-content>
      </div>
    </div>
  `,
})
export class DetailHeader {
  public readonly delete = output<void>();
  public readonly save = output<any>();

  public btn1Icon = input<PcIconNameType>('save');
  public btn1Text = input<string>('SAVE');
  public buttonsToShow = input<'two' | 'three'>('three');
  public deleteText = input<string>('DELETE');
  public disabled = input<boolean>(false);
  public form = input<any>();
  public icon = input<PcIconNameType | null | undefined>();
  public iconSize = input<number>(5);
  public isLoading = input.required<boolean>();
  public showActions = input<boolean>(true);
  public showDelete = input<boolean>(false);
  public subtitle = input<string | null | undefined>();
  public title = input.required<string>();
}
