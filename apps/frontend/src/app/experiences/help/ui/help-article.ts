import { Component, computed, DestroyRef, effect, ElementRef, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';
import { BreadcrumbsService } from '@uxcommon/components/breadcrumbs/breadcrumbs.service';

import {
  categoryNeighbors,
  getHelpArticle,
  getHelpCategory,
  readingMinutes,
  relatedArticles,
  stripHelpInline,
} from '@common';

import { HelpBlocks } from './help-blocks';

import type { PcBreadcrumb } from '@uxcommon/components/breadcrumbs/breadcrumbs';
import type { HelpArticle, HelpBlock } from '@common';

interface TocEntry {
  id: string;
  label: string;
}

/** One help article: header, typed content blocks, on-page TOC, related reading. */
@Component({
  selector: 'pc-help-article',
  imports: [HelpBlocks, Icon, RouterLink],
  templateUrl: './help-article.html',
})
export class HelpArticlePage {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly breadcrumbs = inject(BreadcrumbsService);

  public readonly id = input.required<string>();

  protected readonly article = computed(() => getHelpArticle(this.id()));
  protected readonly category = computed(() => {
    const article = this.article();
    return article ? getHelpCategory(article.category) : undefined;
  });

  protected readonly crumbs = computed<PcBreadcrumb[]>(() => [
    { label: 'Help', route: '/help' },
    { label: this.article()?.title ?? 'Article' },
  ]);

  protected readonly minutes = computed(() => {
    const article = this.article();
    return article ? readingMinutes(article) : 0;
  });

  protected readonly related = computed<HelpArticle[]>(() => {
    const article = this.article();
    return article ? relatedArticles(article) : [];
  });

  protected readonly neighbors = computed(() => {
    const article = this.article();
    return article ? categoryNeighbors(article) : {};
  });

  protected readonly toc = computed<TocEntry[]>(() => {
    const article = this.article();
    if (!article) return [];
    return article.blocks
      .filter((b): b is Extract<HelpBlock, { kind: 'h2' }> => b.kind === 'h2')
      .map((b) => ({ id: b.id, label: stripHelpInline(b.text) }));
  });

  constructor() {
    // Jump back to the top whenever the reader moves to another article.
    // Optional call: jsdom (unit tests) doesn't implement scrollIntoView.
    effect(() => {
      this.id();
      this.host.nativeElement.scrollIntoView?.({ block: 'start' });
    });

    // Hoist the crumb trail into the navbar (no record pager on help pages).
    effect(() => {
      this.breadcrumbs.set({
        crumbs: this.crumbs(),
        positionLabel: null,
        hasPrev: false,
        hasNext: false,
        prevLabel: 'Previous record',
        nextLabel: 'Next record',
        onPrev: () => undefined,
        onNext: () => undefined,
      });
    });

    inject(DestroyRef).onDestroy(() => this.breadcrumbs.clear());
  }

  protected scrollTo(anchorId: string): void {
    document.getElementById(anchorId)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }
}
