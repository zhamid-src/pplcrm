import { CommonModule } from "@angular/common";
import { Component, signal } from "@angular/core";
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { TagsManagerService } from "@services/tagsmanager.service";
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
    private tagSvc: TagsManagerService,
  ) {}

  async add() {
    this.processing.set(true);
    //await this.tagSvc.add();
  }
}
