import { Component } from '@angular/core';

import { EULA_DOC } from './eula-content';
import { LegalPage } from './legal-page';

@Component({
  selector: 'pc-eula-page',
  imports: [LegalPage],
  template: `<pc-legal-page [doc]="doc" />`,
})
export class EulaPage {
  protected readonly doc = EULA_DOC;
}
