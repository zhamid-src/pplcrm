import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SiteFooter } from '../ui/site-footer';
import { SiteHeader } from '../ui/site-header';

import { LegalRichText } from './legal-rich-text';

import type { LegalDoc } from './legal-types';

const CONTACT_EMAIL = 'hello@pplcrm.com';

/** One "On this page" entry, derived from the document's h2 blocks. */
interface TocEntry {
  readonly id: string;
  readonly text: string;
}

/**
 * Shared shell for the legal documents (privacy, EULA, security): centered
 * hero with the revision date, an "On this page" contents box driven by the
 * document's h2 anchors, the typed body blocks, and a quiet questions card.
 * Each document is plain data (see legal-types.ts); pages differ only in the
 * `doc` they pass in.
 */
@Component({
  selector: 'pc-legal-page',
  imports: [RouterLink, SiteHeader, SiteFooter, LegalRichText],
  template: `
    <pc-site-header variant="solid" />

    <!-- Hero -->
    <section class="border-b border-line bg-base-200 px-5 py-14 sm:px-8">
      <div class="mx-auto max-w-[760px] text-center">
        <div class="eyebrow">{{ doc().eyebrow }}</div>
        <h1 class="mt-3 text-[clamp(1.875rem,5vw,2.375rem)] font-bold tracking-[-0.02em]">{{ doc().title }}</h1>
        <p class="mx-auto mt-3.5 max-w-[560px] text-[15.5px] leading-relaxed text-base-content/60">
          {{ doc().intro }}
        </p>
        <p class="mt-4 text-xs uppercase tracking-wide text-base-content/45">Last updated {{ doc().updated }}</p>
      </div>
    </section>

    <article class="px-5 py-10 sm:px-8">
      <div class="mx-auto max-w-[760px]">
        <!-- On this page -->
        <nav class="rounded-xl border border-line bg-base-50 p-5" aria-label="On this page">
          <div class="eyebrow">On this page</div>
          <ol class="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            @for (entry of toc(); track entry.id) {
              <li>
                <a
                  [routerLink]="[]"
                  [fragment]="entry.id"
                  class="text-[13.5px] text-base-content/70 hover:text-primary"
                  >{{ entry.text }}</a
                >
              </li>
            }
          </ol>
        </nav>

        <!-- Body -->
        <div class="mt-8 space-y-5">
          @for (block of doc().blocks; track $index) {
            @switch (block.kind) {
              @case ('p') {
                <p class="text-[14.5px] leading-[1.7] text-base-content/70">
                  <pc-legal-rich-text [text]="block.text" />
                </p>
              }
              @case ('h2') {
                <h2
                  [id]="block.id"
                  class="scroll-mt-24 border-t border-line pt-7 text-[19px] font-bold tracking-[-0.01em] text-base-content"
                >
                  {{ block.text }}
                </h2>
              }
              @case ('list') {
                @if (block.ordered) {
                  <ol
                    class="list-decimal space-y-2 pl-6 text-[14.5px] leading-[1.7] text-base-content/70 marker:text-base-content/40"
                  >
                    @for (item of block.items; track $index) {
                      <li><pc-legal-rich-text [text]="item" /></li>
                    }
                  </ol>
                } @else {
                  <ul
                    class="list-disc space-y-2 pl-6 text-[14.5px] leading-[1.7] text-base-content/70 marker:text-primary/60"
                  >
                    @for (item of block.items; track $index) {
                      <li><pc-legal-rich-text [text]="item" /></li>
                    }
                  </ul>
                }
              }
            }
          }
        </div>

        <!-- Questions card -->
        <div class="mt-12 rounded-2xl border border-line bg-base-200 p-6 text-center">
          <p class="text-[15px] font-semibold text-base-content">Questions about this document?</p>
          <p class="mx-auto mt-1.5 max-w-[420px] text-sm leading-relaxed text-base-content/60">
            Write to
            <a class="font-semibold text-primary hover:text-secondary" [href]="mailto">{{ email }}</a>
            and a human replies. We are happy to walk through any of it.
          </p>
        </div>
      </div>
    </article>

    <pc-site-footer />
  `,
})
export class LegalPage {
  public readonly doc = input.required<LegalDoc>();

  protected readonly email = CONTACT_EMAIL;
  protected readonly mailto = `mailto:${CONTACT_EMAIL}`;

  protected readonly toc = computed<TocEntry[]>(() =>
    this.doc()
      .blocks.filter((block) => block.kind === 'h2')
      .map((block) => ({ id: block.id, text: block.text })),
  );
}
