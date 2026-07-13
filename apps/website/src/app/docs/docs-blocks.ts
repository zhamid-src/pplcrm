import { Component, input } from '@angular/core';

import { SiteIcon } from '../ui/site-icon';

import { DocsRichText } from './docs-rich-text';

import type { HelpBlock } from '@common';

/**
 * Renders an article's typed content blocks on the public docs site. Mirrors
 * the CRM's `pc-help-blocks` (the same six block kinds), but uses the website's
 * `pc-site-icon` for callouts and `pc-docs-rich-text` for inline markup.
 */
@Component({
  selector: 'pc-docs-blocks',
  imports: [DocsRichText, SiteIcon],
  templateUrl: './docs-blocks.html',
})
export class DocsBlocks {
  public readonly blocks = input.required<HelpBlock[]>();

  /** Heroicon base name for a callout tone. */
  protected calloutIcon(tone: 'info' | 'tip' | 'warning'): string {
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
