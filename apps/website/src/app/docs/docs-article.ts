import { Component, computed, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { categoryNeighbors, getHelpArticle, getHelpCategory, readingMinutes, relatedArticles } from '@common';

import { SiteFooter } from '../ui/site-footer';
import { SiteHeader } from '../ui/site-header';
import { SiteIcon } from '../ui/site-icon';
import { SIGNUP_URL } from '../ui/site-nav';
import { SeoService } from '../ui/seo';

import { DocsBlocks } from './docs-blocks';

import type { HelpArticle, HelpCategory } from '@common';

/** Previous/next article within the same category. */
interface DocsNeighbors {
  readonly prev?: HelpArticle;
  readonly next?: HelpArticle;
}

/**
 * One public docs article — the marketing-site mirror of the in-app help
 * article view. Renders the typed blocks through `pc-docs-blocks`, plus related
 * reading and same-category prev/next. Sets the page `<title>`, meta
 * description, and a canonical link for SEO. If the id is unknown, redirects to
 * the docs index rather than showing an empty shell.
 */
@Component({
  selector: 'pc-docs-article',
  imports: [RouterLink, SiteHeader, SiteFooter, SiteIcon, DocsBlocks],
  templateUrl: './docs-article.html',
})
export class DocsArticle {
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  public readonly id = input.required<string>();

  protected readonly signupUrl = SIGNUP_URL;

  protected readonly article = computed<HelpArticle | undefined>(() => getHelpArticle(this.id()));

  protected readonly category = computed<HelpCategory | undefined>(() => {
    const article = this.article();
    return article ? getHelpCategory(article.category) : undefined;
  });

  protected readonly minutes = computed<number>(() => {
    const article = this.article();
    return article ? readingMinutes(article) : 0;
  });

  protected readonly related = computed<HelpArticle[]>(() => {
    const article = this.article();
    return article ? relatedArticles(article) : [];
  });

  protected readonly neighbors = computed<DocsNeighbors>(() => {
    const article = this.article();
    return article ? categoryNeighbors(article) : {};
  });

  constructor() {
    // Unknown slug: send readers to the browsable index, not an empty page.
    effect(() => {
      if (this.id() && this.article() === undefined) {
        void this.router.navigate(['/docs']);
      }
    });

    // Keep the document title, description, canonical URL and per-page social
    // tags in sync with the current article for SEO and prerendered HTML.
    effect(() => {
      const article = this.article();
      if (!article) return;
      this.seo.applyRoute({
        title: `${article.title} — pplCRM Docs`,
        description: article.summary,
        path: `/docs/${article.id}`,
      });
    });
  }
}
