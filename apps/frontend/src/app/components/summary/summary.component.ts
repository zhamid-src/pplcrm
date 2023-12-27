import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { AlertService } from "@services/alert.service";
import { AlertComponent } from "@uxcommon/alert/alert.component";
import { TagsComponent } from "@uxcommon/tags/tags.component";

@Component({
  selector: "pc-summary",
  standalone: true,
  imports: [CommonModule, TagsComponent, AlertComponent],
  templateUrl: "./summary.component.html",
  styleUrl: "./summary.component.scss",
})
export class SummaryComponent {
  tags = ["hello", "you", "fool"];
  readonly = false;
  allowDetele = false;

  constructor(private alert: AlertService) {}

  tagsChanged(e: string[]) {
    console.log(e, this.tags);
  }

  Info() {
    this.alert.show({
      text: "This is an info alert",
      type: "info",
      title: "INFO",
      OKBtn: "OK",
    });
  }
  Success() {
    this.alert.show({
      text: "This is an success alert",
      type: "success",
      title: "SUCCESS!",
      OKBtn: "OK",
    });
  }
  Warning() {
    this.alert.show({
      text: "This is an warning alert",
      type: "warning",
      title: "W!",
    });
  }
  Error() {
    this.alert.show({
      text: "This is an error alert",
      type: "error",
    });
  }
}
