import { CommonModule } from "@angular/common";
import { Component, signal } from "@angular/core";
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { AddTagType } from "@common";
import { AlertService } from "@services/alert.service";
import { TagsService } from "@services/tags.service";
import { IconsComponent } from "@uxcommon/icons/icons.component";

@Component({
  selector: "pc-add-tag",
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IconsComponent],
  templateUrl: "./addTag.component.html",
  styleUrl: "./addTag.component.scss",
})
export class AddTagComponent {
  protected processing = signal(false);

  protected form = this.fb.group({
    name: ["", [Validators.required]],
    description: [""],
  });

  constructor(
    private fb: FormBuilder,
    private tagSvc: TagsService,
    private alertSvc: AlertService,
  ) {}

  async add() {
    this.processing.set(true);
    const formObj = this.form.getRawValue() as AddTagType;
    await this.tagSvc
      .add(formObj)
      .then(() => this.alertSvc.showSuccess("Tag added successfully."))
      .catch((err) => this.alertSvc.showError(err.message))
      .finally(() => this.processing.set(false));
  }
}
