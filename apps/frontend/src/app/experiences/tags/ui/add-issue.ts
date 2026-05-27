import { Component, inject, viewChild, signal } from '@angular/core';
import { form, submit, required, pattern, FormField } from '@angular/forms/signals';
import { TagsService } from '@experiences/tags/services/tags-service';
import { TRPCClientError } from '@trpc/client';
import { AddBtnRow } from '@uxcommon/components/add-btn-row/add-btn-row';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { TagOptionsService } from '@uxcommon/components/datagrid/services/tag-options.service';

/**
 * A component for adding new issues to the system.
 * Identical to AddTag but hardcodes `type: 'issue'` on submission.
 */
@Component({
  selector: 'pc-add-issue',
  imports: [FormField, AddBtnRow],
  template: `<div class="flex min-h-full flex-col bg-base-100">
    <form (submit)="add($event)" class="mx-5 my-10 sm:mx-10" novalidate>
      <div class="flex flex-col gap-2">
        <label class="label text-base font-light">
          Enter a unique issue name (and optionally, give it a description)
        </label>
        <input class="input" placeholder="Issue Name" [formField]="form.name" />
        <input class="input" placeholder="Optional description" [formField]="form.description" />
        <div class="flex items-center gap-2">
          <label class="label-text font-light text-sm">Colour</label>
          <input class="input input-bordered input-sm w-24" type="color" [formField]="form.color" />
          @if (form.color().invalid() && form.color().touched()) {
            <span class="text-error text-xs">Use a value like #3366ff</span>
          }
        </div>
        <pc-add-btn-row [isLoading]="isLoading()" [signalForm]="form" (btn1Clicked)="add()"></pc-add-btn-row>
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
    color: '#ef4444',
  });

  public readonly form = form(this.payload, (p) => {
    required(p.name);
    pattern(p.color, /^#([0-9a-fA-F]{6})$/);
  });

  protected isLoading = this._loading.visible;

  public readonly addBtnRow = viewChild(AddBtnRow);

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

          this.payload.set({ name: '', description: '', color: '#ef4444' });
          this.addBtnRow()?.stayOrCancel();
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
      }
    });
  }
}
