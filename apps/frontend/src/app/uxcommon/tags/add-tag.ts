import { Component, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AddTagType } from '@common';
import { TRPCError } from '@trpc/server';
import { AddBtnRow } from '@uxcommon/add-btn-row';
import { AlertService } from '@uxcommon/alerts/alert-service';
import { FormInput } from '@uxcommon/formInput';
import { TagsService } from '@uxcommon/tags/tags-service';

/**
 * A component for adding new tags to the system.
 * It includes a form with name and optional description,
 * and handles validation, submission, and error feedback.
 */
@Component({
  selector: 'pc-add-tag',
  imports: [ReactiveFormsModule, FormInput, AddBtnRow],
  templateUrl: './add-tag.html',
})
export class AddTag {
  private readonly alertSvc = inject(AlertService);
  private readonly fb = inject(FormBuilder);
  private readonly tagSvc = inject(TagsService);

  /**
   * Reactive form for tag creation.
   * - `name`: required tag name.
   * - `description`: optional description for the tag.
   */
  protected form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
  });

  /**
   * Signal to track form submission (used to show spinners or disable form).
   */
  protected loading = signal(false);

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
    this.loading.set(true);
    const formObj = this.form.getRawValue() as AddTagType;

    try {
      await this.tagSvc.add(formObj);
      this.alertSvc.showSuccess('Tag added successfully.');
      this.addBtnRow.stayOrCancel();
    } catch (err: unknown) {
      if (err instanceof TRPCError) {
        this.alertSvc.showError(err.message);
      } else {
        this.alertSvc.showError("We've hit an unknown error. Please try again.");
      }
    } finally {
      this.loading.set(false);
    }
  }
}
