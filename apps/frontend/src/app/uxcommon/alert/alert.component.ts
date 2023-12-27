import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Output, effect } from "@angular/core";
import { ALERTTYPE, AlertService } from "@services/alert.service";
import { IconsComponent } from "@uxcommon/icons/icons.component";

@Component({
  selector: "pc-alert",
  standalone: true,
  imports: [CommonModule, IconsComponent],
  templateUrl: "./alert.component.html",
  styleUrl: "./alert.component.scss",
})
export class AlertComponent {
  protected message: string | undefined;
  protected title: string | undefined;
  protected type: ALERTTYPE = "error";

  protected OKBtn: string | undefined;
  protected btn2: string | undefined;
  @Output() btn2Action = new EventEmitter();

  constructor(private alertSvc: AlertService) {
    effect(() => {
      this.message = this.alertSvc.newAlert?.text;
      this.type = this.alertSvc.newAlert?.type || "error";
    });
  }

  icon() {
    switch (this.type) {
      case "info":
        return "exclamation-circle";
      case "success":
        return "check-circle";
      case "warning":
        return "exclamation-triangle";
      case "error":
        return "x-circle";
    }
  }

  dismiss() {
    this.alertSvc.dismiss(this.message!);
  }

  btn2Click() {
    this.btn2Action?.emit();
  }
}
