import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AddTagType } from '@common';
import { AlertService } from '@services/alert.service';
import { TagsGridService } from '@services/grid/tags-grid.service';
import { IconsComponent } from '@uxcommon/icons/icons.component';

@Component({
  selector: 'pc-add-tag',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IconsComponent],
  templateUrl: './addTag.component.html',
  styleUrl: './addTag.component.scss',
})
export class AddTagComponent {
  protected form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
  });
  protected processing = signal(false);

  constructor(
    private fb: FormBuilder,
    private tagSvc: TagsGridService,
    private alertSvc: AlertService,
    private router: Router,
  ) {}

  public async add(addMore: boolean = false) {
    this.processing.set(true);
    const formObj = this.form.getRawValue() as AddTagType;
    await this.tagSvc
      .add(formObj)
      .then(() => this.alertSvc.showSuccess('Tag added successfully.'))
      .catch((err) => this.alertSvc.showError(err.message))
      .finally(() => this.processing.set(false));

    // TODO: create URL tree
    if (!addMore) {
      this.router.navigate(['/console/tags']);
    }
  }
}
