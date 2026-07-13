import { Component, input } from '@angular/core';

/**
 * The pplCRM wordmark, as text so it stays crisp at any size and adapts to the
 * dark/light header without shipping an image. Drop in a real logo later by
 * replacing this template with an <img>.
 */
@Component({
  selector: 'pc-site-logo',
  template: `
    <span class="text-[1.25rem] font-bold leading-none tracking-tight" [class.text-white]="onDark()">
      ppl<span class="text-primary">CRM</span>
    </span>
  `,
})
export class SiteLogo {
  public readonly onDark = input<boolean>(false);
}
