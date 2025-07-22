import { Component, ViewChild, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AddTagType } from '@common';
import { AlertService } from '@services/alert.service';
import { TagsService } from '@services/backend/tags.service';
import { TRPCError } from '@trpc/server';
import { AddBtnRowComponent } from '@uxcommon/add-btn-row/AddBtnRow.component';
import { FormInputComponent } from '@uxcommon/form-input/formInput.component';

@Component({
  selector: 'pc-add-tag',
  imports: [ReactiveFormsModule, FormInputComponent, AddBtnRowComponent],
  templateUrl: './add-tag.component.html',
  styleUrl: './add-tag.component.css',
})
export class AddTagComponent {
  private fb = inject(FormBuilder);
  private tagSvc = inject(TagsService);
  private alertSvc = inject(AlertService);

  @ViewChild(AddBtnRowComponent) public addBtnRow!: AddBtnRowComponent;

  protected form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
  });
  protected processing = signal(false);

  protected async add() {
    this.processing.set(true);
    const formObj = this.form.getRawValue() as AddTagType;
    console.log(formObj);
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
    }
    this.processing.set(false);
  }
}
