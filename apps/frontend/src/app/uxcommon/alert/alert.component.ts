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
  protected alerts = this.alertSvc.alerts;
  @Output() btn2Action = new EventEmitter();

  constructor(private alertSvc: AlertService) {
    effect(() => (this.alerts = this.alertSvc.alerts));
  }

  icon(type: ALERTTYPE) {
    return type === "success"
      ? "check-circle"
      : type === "warning"
        ? "exclamation-triangle"
        : type === "error"
          ? "x-circle"
          : "exclamation-circle";
  }

  dismiss(text: string) {
    this.alertSvc.dismiss(text);
  }

  btn2Click() {
    this.btn2Action?.emit();
  }
}
