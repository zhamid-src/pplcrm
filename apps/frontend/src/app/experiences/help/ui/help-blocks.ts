import { Component, input } from '@angular/core';
import { Icon } from '@icons/icon';

import { HelpRichText } from './help-rich-text';

import type { PcIconNameType } from '@icons/icons.index';
import type { HelpBlock } from '@common';

/** Renders an article's typed content blocks with the house styling. */
@Component({
  selector: 'pc-help-blocks',
  imports: [HelpRichText, Icon],
  templateUrl: './help-blocks.html',
})
export class HelpBlocks {
  public readonly blocks = input.required<HelpBlock[]>();

  protected calloutIcon(tone: 'info' | 'tip' | 'warning'): PcIconNameType {
    switch (tone) {
      case 'tip':
        return 'check-circle';
      case 'warning':
        return 'exclamation-triangle';
      case 'info':
        return 'information-circle';
      default: {
        const _exhaustive: never = tone;
        return _exhaustive;
      }
    }
  }
}
