import { Component, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AddTagType } from '@common';
import { TagsService } from '@experiences/tags/services/tags-service';
import { TRPCClientError } from '@trpc/client';
import { AddBtnRow } from '@uxcommon/components/add-btn-row/add-btn-row';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';

/**
 * A component for adding new tags to the system.
 * It includes a form with name and optional description,
 * and handles validation, submission, and error feedback.
 */
@Component({
  selector: 'pc-add-tag',
  imports: [ReactiveFormsModule, AddBtnRow],
  template: `<div class="flex min-h-full flex-col bg-base-100">
    <form [formGroup]="form" class="mx-5 my-10 sm:mx-10">
      <div class="flex flex-col gap-2">
        <label class="label text-base font-light">
          Enter a unique tag name (and optionally, give it a description)
        </label>
        <input class="input" placeholder="Tag Name" formControlName="name" />
        <input class="input" placeholder="Optional description" formControlName="description" />
        <div class="flex items-center gap-2">
          <label class="label-text font-light text-sm">Colour</label>
          <input class="input input-bordered input-sm w-24" type="color" formControlName="color" />
          @if (form.get('color')?.invalid && form.get('color')?.touched) {
            <span class="text-error text-xs">Use a value like #3366ff</span>
          }
        </div>
        <pc-add-btn-row [isLoading]="isLoading()" (btn1Clicked)="add()"></pc-add-btn-row>
      </div>
    </form>
  </div>`,
})
export class AddTag {
  private readonly alertSvc = inject(AlertService);
  private readonly fb = inject(FormBuilder);
  private readonly tagSvc = inject(TagsService);

  /**
   * Signal to track form submission (used to show _loadings or disable form).
   */
  private _loading = createLoadingGate();

  /**
   * Reactive form for tag creation.
   * - `name`: required tag name.
   * - `description`: optional description for the tag.
   */
  protected form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
    color: ['#0ea5e9', [Validators.pattern(/^#([0-9a-fA-F]{6})$/)]],
  });
  protected isLoading = this._loading.visible;

  /**
   * Reference to the `AddBtnRow` component used for handling UI state like "stay or cancel".
   * Populated after view initialization.
   */
  @ViewChild(AddBtnRow)
  public addBtnRow!: AddBtnRow;

  /**
   * Submits the form to create a new tag.
   * Shows success or error messages based on result.
   * If successful, resets the `AddBtnRow` component's state.
   */
  protected async add() {
    const formObj = this.form.getRawValue() as AddTagType;
    const end = this._loading.begin();
    try {
      await this.tagSvc.add(formObj);
      this.alertSvc.showSuccess('Tag added successfully.');
      this.addBtnRow.stayOrCancel();
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
  }
}
