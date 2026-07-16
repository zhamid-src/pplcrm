import { Component } from '@angular/core';

import { LegalPage } from './legal-page';
import { SECURITY_DOC } from './security-content';

@Component({
  selector: 'pc-security-page',
  imports: [LegalPage],
  template: `<pc-legal-page [doc]="doc" />`,
})
export class SecurityPage {
  protected readonly doc = SECURITY_DOC;
}
