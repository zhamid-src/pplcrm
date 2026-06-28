import { Component, inject, viewChild, signal } from '@angular/core';
import { form, submit, required, pattern, FormField } from '@angular/forms/signals';
import { TagsService } from '@experiences/tags/services/tags-service';

import { FormActions } from '@uxcommon/components/form-actions/form-actions';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { Input as PcInput } from '@uxcommon/components/input/input';
import { TagOptionsService } from '@frontend/shared/components/datagrid/services/tag-options.service';

function randomHexColor(): string {
  return (
    '#' +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')
  );
}

@Component({
  selector: 'pc-add-tag',
  imports: [PcInput, FormField, FormActions],
  template: `<div class="flex min-h-full flex-col bg-base-100">
    <form (submit)="add($event)" class="mx-5 my-10 sm:mx-10" novalidate>
      <div class="flex flex-col gap-2">
        <label i18n class="label text-base font-light">
          Enter a unique tag name (and optionally, give it a description)
        </label>
        <pc-input placeholder="Tag Name" i18n-placeholder [formField]="form.name"></pc-input>
        <pc-input placeholder="Optional description" i18n-placeholder [formField]="form.description"></pc-input>
        <div class="flex items-center gap-2">
          <label i18n class="label-text font-light text-sm">Colour</label>
          <input class="input input-bordered input-sm w-24" type="color" [formField]="form.color" />
          @if (form.color().invalid() && form.color().touched()) {
            <span i18n class="text-error text-xs">Use a value like #3366ff</span>
          }
        </div>
        <pc-form-actions [isLoading]="isLoading()" [signalForm]="form" (btn1Clicked)="add()"></pc-form-actions>
      </div>
    </form>
  </div>`,
})
export class AddTag {
  private readonly alertSvc = inject(AlertService);
  private readonly tagSvc = inject(TagsService);
  private readonly tagOptionsSvc = inject(TagOptionsService);

  private _loading = createLoadingGate();

  protected readonly payload = signal({
    name: '',
    description: '',
    color: randomHexColor(),
  });

  public readonly form = form(this.payload, (p) => {
    required(p.name);
    pattern(p.color, /^#([0-9a-fA-F]{6})$/);
  });

  protected isLoading = this._loading.visible;

  public readonly formActions = viewChild(FormActions);

  protected async add(event?: any) {
    if (event instanceof Event) {
      event.preventDefault();
    }

    if (this.isLoading()) {
      return;
    }

    // force validation messages to appear
    this.form().markAsTouched();

    if (!this.form().valid) {
      return;
    }

    await submit(this.form, {
      action: async () => {
        const end = this._loading.begin();
        try {
          const formObj = this.payload();
          await this.tagSvc.add(formObj);
          await this.tagOptionsSvc.invalidate('tag');
          this.tagSvc.triggerRefresh();
          this.alertSvc.showSuccess('Tag added successfully.');

          // Reset the backing signal
          this.payload.set({
            name: '',
            description: '',
            color: randomHexColor(),
          });

          this.formActions()?.stayOrCancel();
        } catch (err: any) {
          this.alertSvc.showError(err.message || "We've hit an unknown error. Please try again.");
        } finally {
          end();
        }
        return null;
      },
    });
  }
}
