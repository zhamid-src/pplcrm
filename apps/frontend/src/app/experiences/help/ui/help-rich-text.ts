import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { parseHelpInline } from '../data/help-types';

/**
 * Renders one help mini-markup string as inline content:
 * `**bold**`, `` `code` `` and `[label](/route)` links.
 * Everything is interpolated text — no HTML injection surface.
 * Segments are rendered back-to-back with no template whitespace so
 * spacing is controlled entirely by the segment text itself.
 */
@Component({
  selector: 'pc-help-rich-text',
  imports: [RouterLink],
  template: `@for (seg of segments(); track $index) {
    @switch (seg.kind) {
      @case ('bold') {
        <strong class="font-semibold text-base-content">{{ seg.text }}</strong>
      }
      @case ('code') {
        <code class="rounded bg-base-200 px-1 py-0.5 font-mono text-[0.85em]">{{ seg.text }}</code>
      }
      @case ('link') {
        <a [routerLink]="seg.route" class="font-medium text-primary hover:underline">{{ seg.text }}</a>
      }
      @default {
        <span>{{ seg.text }}</span>
      }
    }
  }`,
})
export class HelpRichText {
  public readonly text = input.required<string>();

  protected readonly segments = computed(() => parseHelpInline(this.text()));
}
