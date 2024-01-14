import { CommonModule } from '@angular/common';
import { Component, ViewChild, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AddTagType } from '@common';
import { AlertService } from '@services/alert.service';
import { TagsGridService } from '@services/grid/tags-grid.service';
import { AddBtnRowComponent } from '@uxcommon/add-btn-row/AddBtnRow.component';
import { IconsComponent } from '@uxcommon/icons/icons.component';
import { InputComponent } from '@uxcommon/input/input.component';

@Component({
  selector: 'pc-add-tag',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IconsComponent,
    InputComponent,
    AddBtnRowComponent,
  ],
  templateUrl: './add-tag.component.html',
  styleUrl: './add-tag.component.scss',
})
export class AddTagComponent {
  @ViewChild(AddBtnRowComponent) addBtnRow!: AddBtnRowComponent;
  protected form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
  });
  protected processing = signal(false);

  constructor(
    private fb: FormBuilder,
    private tagSvc: TagsGridService,
    private alertSvc: AlertService,
  ) {}

  protected async add(addMore: boolean = false) {
    this.processing.set(true);
    const formObj = this.form.getRawValue() as AddTagType;
    try {
      await this.tagSvc.add(formObj);
      this.alertSvc.showSuccess('Tag added successfully.');
      this.addBtnRow.stayOrCancel();
    } catch (err: any) {
      this.alertSvc.showError(err.message);
    }
    this.processing.set(false);
  }
}
