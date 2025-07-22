import { ILoadingOverlayAngularComp } from '@ag-grid-community/angular';
import { ILoadingOverlayParams } from '@ag-grid-community/core';
import { Component } from '@angular/core';

@Component({
  selector: 'pc-loading-overlay',
  template: `
    <div class="flex flex-col p-5">
      <div class="flex flex-row justify-between gap-2 text-gray-500">
        <span class="text-lg font-bold">Fetching data</span>
        <span class="loading loading-dots"></span>
      </div>
      <a (click)="sendAbort()" class="btn btn-link btn-sm hover:no-underline">Cancel</a>
    </div>
  `,
  standalone: false,
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
