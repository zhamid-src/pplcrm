import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { parseHelpInline } from '@common';

import type { HelpInlineSegment } from '@common';

/**
 * Renders one legal-content mini-markup string as inline content: `**bold**`
 * and `[label](/route)` links. Mirrors `pc-docs-rich-text`, but legal
 * documents only ever link to other marketing-site pages (/privacy, /security,
 * /docs/...), so every link stays an internal router link instead of being
 * classified as an app deep link.
 */
@Component({
  selector: 'pc-legal-rich-text',
  imports: [RouterLink],
  template: `@for (seg of segments(); track $index) {
    @switch (seg.kind) {
      @case ('bold') {
        <strong class="font-semibold text-base-content">{{ seg.text }}</strong>
      }
      @case ('link') {
        @if (seg.route) {
          <a [routerLink]="seg.route" class="font-medium text-primary hover:underline">{{ seg.text }}</a>
        } @else {
          <span>{{ seg.text }}</span>
        }
      }
      @default {
        <span>{{ seg.text }}</span>
      }
    }
  }`,
})
export class LegalRichText {
  public readonly text = input.required<string>();

  protected readonly segments = computed<HelpInlineSegment[]>(() => parseHelpInline(this.text()));
}
