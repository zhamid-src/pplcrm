// attachment-icon.component.ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICON_FOR_KEY, iconKeyForFilename } from '@uxcommon/pipes/file-icon.util';

import { Icon } from './icon';

@Component({
  selector: 'pc-attachment-icon',
  standalone: true,
  imports: [Icon],
  template: ` <pc-icon [name]="icon()" [size]="size()" [class]="className()" [attr.title]="title()"></pc-icon> `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentIconComponent {
  public className = input<string>('');

  // Inputs (signals API)
  public filename = input.required<string>();
  public icon = computed(() => {
    const key = iconKeyForFilename(this.filename());
    return ICON_FOR_KEY[key] ?? ICON_FOR_KEY.unknown;
  });
  public size = input<number>(6);
  public title = input<string | undefined>(undefined);
}
