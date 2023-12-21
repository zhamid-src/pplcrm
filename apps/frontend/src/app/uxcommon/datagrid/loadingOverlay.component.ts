import { Component } from "@angular/core";
import { ILoadingOverlayAngularComp } from "ag-grid-angular";
import { ILoadingOverlayParams } from "ag-grid-community";

@Component({
  selector: "pplcrm-loading-overlay",
  templateUrl: "./loadingOverlay.component.html",
  styleUrls: ["./loadingOverlay.component.scss"],
})
export class LoadingOverlayComponent implements ILoadingOverlayAngularComp {
  params: ILoadingOverlayParams | undefined;

  agInit(params: ILoadingOverlayParams): void {
    this.params = params;
  }

  sendAbort() {
    this.params?.context?.sendAbort();
  }
}
