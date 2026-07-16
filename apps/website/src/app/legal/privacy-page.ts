import { Component } from '@angular/core';

import { LegalPage } from './legal-page';
import { PRIVACY_DOC } from './privacy-content';

@Component({
  selector: 'pc-privacy-page',
  imports: [LegalPage],
  template: `<pc-legal-page [doc]="doc" />`,
})
export class PrivacyPage {
  protected readonly doc = PRIVACY_DOC;
}
