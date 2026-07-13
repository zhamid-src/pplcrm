import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { classifyHelpRoute, parseHelpInline } from '@common';

import { environment } from '../../environments/environment';

import type { HelpInlineSegment } from '@common';

/**
 * One rendered inline segment, pre-resolved for the template so the switch
 * stays declarative. Link segments carry the product routing decision:
 *  - `docsLink` set  -> an in-help article link, kept on the marketing site as
 *    an internal `/docs/:id` router link.
 *  - `appHref` set   -> any other in-app route, rendered as an external anchor
 *    that deep-links into the CRM app (`${environment.appUrl}${path}`).
 */
interface RenderSegment {
  readonly kind: 'bold' | 'code' | 'link' | 'text';
  readonly text: string;
  /** Internal `/docs/:id` route (link segments that classify as help). */
  readonly docsLink?: string;
  /** Absolute CRM app URL (link segments that classify as an app route). */
  readonly appHref?: string;
}

/**
 * Renders one help mini-markup string as inline content on the public site:
 * `**bold**`, `` `code` `` and `[label](/route)` links. Mirrors the CRM's
 * `pc-help-rich-text`, but routes links per the marketing-site product rule:
 * `/help/:id` links stay on this site as `/docs/:id`; every other in-app route
 * becomes an external deep link into the app. Everything is interpolated text,
 * so there is no HTML-injection surface.
 */
@Component({
  selector: 'pc-docs-rich-text',
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
        @if (seg.docsLink) {
          <a [routerLink]="seg.docsLink" class="font-medium text-primary hover:underline">{{ seg.text }}</a>
        } @else {
          <a [href]="seg.appHref" class="font-medium text-primary hover:underline">{{ seg.text }}</a>
        }
      }
      @default {
        <span>{{ seg.text }}</span>
      }
    }
  }`,
})
export class DocsRichText {
  public readonly text = input.required<string>();

  protected readonly segments = computed<RenderSegment[]>(() =>
    parseHelpInline(this.text()).map((seg) => this.toRenderSegment(seg)),
  );

  private toRenderSegment(seg: HelpInlineSegment): RenderSegment {
    if (seg.kind !== 'link' || seg.route === undefined) {
      return { kind: seg.kind, text: seg.text };
    }
    const target = classifyHelpRoute(seg.route);
    switch (target.kind) {
      case 'help':
        return { kind: 'link', text: seg.text, docsLink: `/docs/${target.id}` };
      case 'app':
        return { kind: 'link', text: seg.text, appHref: `${environment.appUrl}${target.path}` };
      default: {
        const _exhaustive: never = target;
        return _exhaustive;
      }
    }
  }
}
