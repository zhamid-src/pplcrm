import { Component, inject } from '@angular/core';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Tags } from '@uxcommon/components/tags/tags';
import { createLoadingGate } from '@uxcommon/loading-gate';

@Component({
  selector: 'pc-summary',
  imports: [Tags],
  templateUrl: './summary.html',
})
export class Summary {
  private readonly _loading = createLoadingGate();
  private readonly alert = inject(AlertService);

  protected readonly isLoading = this._loading.visible;

  public canDelete = true;
  public readonly = false;

  public Error() {
    this.alert.show({
      text: 'This is an error alert',
      type: 'error',
    });
  }

  public Info() {
    this.alert.showInfo("This is an <a href='/households' class='link'>info</a> alert");
  }

  public Success() {
    this.alert.show({
      text: 'This is an success alert',
      type: 'success',
      title: 'SUCCESS!',
      OKBtn: 'OK',
    });
  }

  public Warning() {
    this.alert.show({
      text: 'This is an warning alert',
      type: 'warning',
      title: 'W!',
    });
  }

  public spinner() {
    console.log('spinner starting');
    const end = this._loading.begin();

    setTimeout(() => {
      console.log('spinner ending');
      end();
    }, 300);
  }
}
