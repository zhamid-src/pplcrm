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
})
export class LoadingOverlayComponent implements ILoadingOverlayAngularComp {
  /**
   * The parameters provided by AG Grid when the overlay is initialized.
   * This typically contains a `context` object which can include
   * custom methods like `sendAbort` to cancel grid actions.
   */
  public params: ILoadingOverlayParams | undefined;

  /**
   * Called once after the overlay is created by AG Grid.
   * Used to initialize any parameters passed by the grid.
   *
   * @param params - Parameters supplied by AG Grid for the loading overlay.
   */
  public agInit(params: ILoadingOverlayParams): void {
    this.params = params;
  }

  /**
   * Cancels the current data fetching operation.
   * Calls the `sendAbort()` method on the AG Grid context if it exists.
   */
  public sendAbort(): void {
    this.params?.context?.sendAbort();
  }
}
