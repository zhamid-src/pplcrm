import { Component, inject, viewChild, signal } from '@angular/core';
import { form, submit, required, pattern, FormField } from '@angular/forms/signals';
import { TagsService } from '@experiences/tags/services/tags-service';
import { TRPCClientError } from '@trpc/client';
import { FormActions } from '@uxcommon/components/form-actions/form-actions';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { TagOptionsService } from '@frontend/shared/components/datagrid/services/tag-options.service';

/**
 * A component for adding new tags to the system.
 * It includes a form with name and optional description,
 * and handles validation, submission, and error feedback.
 */
@Component({
  selector: 'pc-add-tag',
  imports: [FormField, FormActions],
  template: `<div class="flex min-h-full flex-col bg-base-100">
    <form (submit)="add($event)" class="mx-5 my-10 sm:mx-10" novalidate>
      <div class="flex flex-col gap-2">
        <label class="label text-base font-light">
          Enter a unique tag name (and optionally, give it a description)
        </label>
        <input class="input" placeholder="Tag Name" [formField]="form.name" />
        <input class="input" placeholder="Optional description" [formField]="form.description" />
        <div class="flex items-center gap-2">
          <label class="label-text font-light text-sm">Colour</label>
          <input class="input input-bordered input-sm w-24" type="color" [formField]="form.color" />
          @if (form.color().invalid() && form.color().touched()) {
            <span class="text-error text-xs">Use a value like #3366ff</span>
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

  /**
   * Signal to track form submission (used to show _loadings or disable form).
   */
  private _loading = createLoadingGate();

  /**
   * Backing payload signal for tag creation.
   * Properties are typed as concrete strings to prevent compiler errors from nullable schema types.
   */
  protected readonly payload = signal({
    name: '',
    description: '',
    color: '#0ea5e9',
  });

  /**
   * Signal-based form with validations.
   */
  public readonly form = form(this.payload, (p) => {
    required(p.name);
    pattern(p.color, /^#([0-9a-fA-F]{6})$/);
  });

  protected isLoading = this._loading.visible;

  /**
   * Reference to the `FormActions` component used for handling UI state like "stay or cancel".
   * Populated after view initialization.
   */
  public readonly formActions = viewChild(FormActions);

  /**
   * Submits the form to create a new tag.
   * Shows success or error messages based on result.
   * If successful, resets the `FormActions` component's state.
   */
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
            color: '#0ea5e9',
          });

          this.formActions()?.stayOrCancel();
        } catch (err: unknown) {
          if (err instanceof TRPCClientError) {
            this.alertSvc.showError(err.message);
          } else if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
            this.alertSvc.showError((err as { message: string }).message);
          } else {
            this.alertSvc.showError("We've hit an unknown error. Please try again.");
          }
        } finally {
          end();
        }
        return null;
      },
    });
  }
}
