import { Component, inject, input } from '@angular/core';
import { AlertService } from '../alerts/alert-service';
import { Card as PcCard } from '../card/card';
import { Icon } from '../icons/icon';

@Component({
  selector: 'pc-public-link-panel',
  imports: [Icon, PcCard],
  templateUrl: './public-link-panel.html',
})
export class PublicLinkPanel {
  readonly url = input.required<string>();
  readonly label = input<string>('Public Link');
  readonly subtitle = input<string>('Share this link so people can sign up.');

  private readonly alertSvc = inject(AlertService);

  protected copyUrl(): void {
    navigator.clipboard
      .writeText(this.url())
      .then(() => {
        this.alertSvc.showSuccess('Link copied to clipboard!');
      })
      .catch((_e) => this.alertSvc.showError('Could not copy link to clipboard'));
  }
}
