import { Component, inject, viewChild, signal } from '@angular/core';
import { form, submit, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TagsService } from '@experiences/tags/services/tags-service';
import { AddTagObj } from '../../../../../../../libs/common/src';

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
  selector: 'pc-add-issue',
  imports: [PcInput, FormField, FormActions],
  template: `<div class="flex min-h-full flex-col bg-base-100">
    <form (submit)="add($event)" class="mx-5 my-10 sm:mx-10" novalidate>
      <div class="flex flex-col gap-2">
        <label i18n class="label text-base font-light">
          Enter a unique issue name (and optionally, give it a description)
        </label>
        <pc-input placeholder="Issue Name" i18n-placeholder [formField]="form.name"></pc-input>
        <pc-input placeholder="Optional description" i18n-placeholder [formField]="form.description"></pc-input>
        <div class="flex items-center gap-2">
          <label i18n class="label-text font-light text-sm">Colour</label>
          <input
            class="input input-bordered input-sm w-24"
            type="color"
            [formField]="form.color"
            [class.input-error]="form.color().invalid() && (form.color().dirty() || form.color().touched())"
          />
          @if (form.color().invalid() && (form.color().dirty() || form.color().touched())) {
            @for (err of form.color().errors(); track err) {
              <span class="text-error text-xs">{{ err.message }}</span>
            }
          }
        </div>
        <pc-form-actions [isLoading]="isLoading()" [signalForm]="form" (btn1Clicked)="add()"></pc-form-actions>
      </div>
    </form>
  </div>`,
})
export class AddIssue {
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
    validateStandardSchema(p, AddTagObj);
  });

  protected isLoading = this._loading.visible;

  public readonly formActions = viewChild(FormActions);

  protected async add(event?: any) {
    if (event instanceof Event) {
      event.preventDefault();
    }

    if (this.isLoading()) return;

    this.form().markAsTouched();
    if (!this.form().valid) return;

    await submit(this.form, {
      action: async () => {
        const end = this._loading.begin();
        try {
          const formObj = this.payload();
          await this.tagSvc.add({ ...formObj, type: 'issue' });
          await this.tagOptionsSvc.invalidate('issue');
          this.tagSvc.triggerRefresh();
          this.alertSvc.showSuccess('Issue added successfully.');

          this.payload.set({ name: '', description: '', color: randomHexColor() });
          this.formActions()?.stayOrCancel();
        } catch (err) {
          this.alertSvc.showError(
            err instanceof Error && err.message ? err.message : "We've hit an unknown error. Please try again.",
          );
        } finally {
          end();
        }
        return null;
      },
    });
  }
}
