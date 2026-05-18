import { Component, inject, signal , ChangeDetectionStrategy} from '@angular/core';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { Icon } from '@uxcommon/components/icons/icon';
import { Tags } from '@uxcommon/components/tags/tags';
import { createLoadingGate } from '@uxcommon/loading-gate';
import { icons } from '@uxcommon/components/icons/icons.index';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'pc-summary',
  imports: [Tags, Icon],
  templateUrl: './summary.html',
})
export class Summary {
  private readonly _loading = createLoadingGate();
  private readonly alert = inject(AlertService);

  protected readonly isLoading = this._loading.visible;
  protected ravenLoaded = signal(false);

  /** All registered icons, sorted alphabetically, for the gallery */
  protected readonly iconList = Object.keys(icons)
    .filter((k) => k !== 'none')
    .sort()
    .map((name) => ({ name: name as keyof typeof icons }));

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

  public toggleRaven() {
    this.ravenLoaded.set(!this.ravenLoaded());
  }
}
