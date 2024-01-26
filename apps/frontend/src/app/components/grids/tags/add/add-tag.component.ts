import { CommonModule } from '@angular/common';
import { Component, ViewChild, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AddTagType } from '@common';
import { AlertService } from '@services/alert.service';
import { TagsService } from '@services/backend/tags.service';
import { TRPCError } from '@trpc/server';
import { AddBtnRowComponent } from '@uxcommon/add-btn-row/AddBtnRow.component';
import { FormInputComponent } from '@uxcommon/form-input/formInput.component';
import { IconsComponent } from '@uxcommon/icons/icons.component';

@Component({
  selector: 'pc-add-tag',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IconsComponent,
    FormInputComponent,
    AddBtnRowComponent,
  ],
  templateUrl: './add-tag.component.html',
  styleUrl: './add-tag.component.scss',
})
export class AddTagComponent {
  @ViewChild(AddBtnRowComponent) public addBtnRow!: AddBtnRowComponent;

  protected form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
  });
  protected processing = signal(false);

  constructor(
    private fb: FormBuilder,
    private tagSvc: TagsService,
    private alertSvc: AlertService,
  ) {}

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
