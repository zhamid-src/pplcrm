
import { Component } from '@angular/core';
import { AlertService } from '@services/alert.service';
import { TagsComponent } from '@uxcommon/tags/tags.component';

@Component({
    selector: 'pc-summary',
    imports: [TagsComponent],
    templateUrl: './summary.component.html',
    styleUrl: './summary.component.css'
})
export class SummaryComponent {
  public allowDetele = true;
  public readonly = false;
  public tags = ['hello', 'you', 'fool'];

  constructor(private alert: AlertService) {}

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
    console.log(e, this.tags);
  }
}
