import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { TagsComponent } from "@uxcommon/tags/tags.component";

@Component({
  selector: "pc-summary",
  standalone: true,
  imports: [CommonModule, TagsComponent],
  templateUrl: "./summary.component.html",
  styleUrl: "./summary.component.scss",
})
export class SummaryComponent {
  tags = ["hello", "you", "fool"];
  readonly = false;
  allowDetele = false;

  tagsChanged(e: string[]) {
    console.log(e, this.tags);
  }
}
