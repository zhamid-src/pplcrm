import { Component, inject } from '@angular/core';
import { AlertService } from '@uxcommon/alerts/alert-service';
import { Tags } from '@uxcommon/tags/tags';

@Component({
  selector: 'pc-summary',
  imports: [Tags],
  templateUrl: './summary.html',
})
export class Summary {
  private readonly _alert = inject(AlertService);

  public canDelete = true;
  public readonly = false;

  public Error() {
    this._alert.show({
      text: 'This is an error alert',
      type: 'error',
    });
  }

  public Info() {
    this._alert.showInfo("This is an <a href='/console/households' class='link'>info</a> alert");
  }

  public Success() {
    this._alert.show({
      text: 'This is an success alert',
      type: 'success',
      title: 'SUCCESS!',
      OKBtn: 'OK',
    });
  }

  public Warning() {
    this._alert.show({
      text: 'This is an warning alert',
      type: 'warning',
      title: 'W!',
    });
  }

  public tagsChanged(_e: string[]) {
    // intentionally empty
  }
}
