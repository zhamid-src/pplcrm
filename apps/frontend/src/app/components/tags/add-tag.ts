import { Component, ViewChild, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AddTagType } from '@common';
import { AlertService } from '@uxcommon/alert-service';
import { TagsService } from 'apps/frontend/src/app/components/tags/tags-service';
import { TRPCError } from '@trpc/server';
import { AddBtnRow } from '@uxcommon/add-btn-row';
import { FormInput } from '@uxcommon/formInput';

@Component({
  selector: 'pc-add-tag',
  imports: [ReactiveFormsModule, FormInput, AddBtnRow],
  templateUrl: './add-tag.html',
})
export class AddTag {
  private fb = inject(FormBuilder);
  private tagSvc = inject(TagsService);
  private alertSvc = inject(AlertService);

  @ViewChild(AddBtnRow) public addBtnRow!: AddBtnRow;

  protected form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
  });
  protected processing = signal(false);

  protected async add() {
    this.processing.set(true);
    const formObj = this.form.getRawValue() as AddTagType;
    try {
      await this.tagSvc.add(formObj);
      this.alertSvc.showSuccess('Tag added successfully.');
      this.addBtnRow.stayOrCancel();
    } catch (err: unknown) {
      if (err instanceof TRPCError) this.alertSvc.showError(err.message);
      else this.alertSvc.showError("We've hit an unknown error. Please try again.");
    }
    this.processing.set(false);
  }
}
