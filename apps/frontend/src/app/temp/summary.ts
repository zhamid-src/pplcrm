import { Component, inject } from '@angular/core';
import { AlertService } from '@uxcommon/alerts/alert-service';
import { Tags } from '@uxcommon/tags/tags';

@Component({
  selector: 'pc-summary',
  imports: [Tags],
  templateUrl: './summary.html',
})
export class Summary {
  private alert = inject(AlertService);

  public canDelete = true;
  public readonly = false;
  public tags = ['hello', 'you', 'fool'];

  public Error() {
    this.alert.show({
      text: 'This is an error alert',
      type: 'error',
    });
  }

  public Info() {
    this.alert.showInfo("This is an <a href='/console/households' class='link'>info</a> alert");
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

  public tagsChanged(e: string[]) {
    this.tags = e;
    console.log(e, this.tags);
  }
}
