import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { PplCrmToastrService } from "@services/pplcrm-toast.service";

@Component({
  selector: "pc-summary",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./summary.component.html",
  styleUrl: "./summary.component.scss",
})
export class SummaryComponent {
  constructor(private readonly _toastService: PplCrmToastrService) {}
  openToast(type: string) {
    console.log("openToast", type);
    switch (type) {
      case "info":
        this._toastService.info("Hello world");
        break;
      case "success":
        this._toastService.success("Hello world s");
        break;
      case "warning":
        this._toastService.warn("Hello world w");
        break;
      case "error":
        this._toastService.error("Hello world e");
        break;
    }
  }
}
