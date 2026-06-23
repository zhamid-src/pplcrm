import { Component, input, inject } from '@angular/core';
import { Icon } from '../icons/icon';
import { AlertService } from '../alerts/alert-service';
import { Card as PcCard } from '../card/card';

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
    navigator.clipboard.writeText(this.url()).then(() => {
      this.alertSvc.showSuccess('Link copied to clipboard!');
    });
  }
}
