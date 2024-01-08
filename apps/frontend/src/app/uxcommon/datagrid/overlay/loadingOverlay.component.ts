import { Component } from '@angular/core';
import { ILoadingOverlayAngularComp } from 'ag-grid-angular';
import { ILoadingOverlayParams } from 'ag-grid-community';

@Component({
  selector: 'pc-loading-overlay',
  templateUrl: './loadingOverlay.component.html',
  styleUrls: ['./loadingOverlay.component.scss'],
})
export class LoadingOverlayComponent implements ILoadingOverlayAngularComp {
  public params: ILoadingOverlayParams | undefined;

  public agInit(params: ILoadingOverlayParams): void {
    this.params = params;
  }

  public sendAbort() {
    this.params?.context?.sendAbort();
  }
}
