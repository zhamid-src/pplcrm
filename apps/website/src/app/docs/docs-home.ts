import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { articlesInCategory, HELP_CATEGORIES } from '@common';

import { SiteFooter } from '../ui/site-footer';
import { SiteHeader } from '../ui/site-header';
import { SiteIcon } from '../ui/site-icon';
import { SIGNUP_URL } from '../ui/site-nav';

import type { HelpArticle, HelpCategory } from '@common';

/** One category card: the category plus every article in it (display order). */
interface DocsSection {
  readonly category: HelpCategory;
  readonly icon: string;
  readonly articles: readonly HelpArticle[];
}

/**
 * Public docs index — the marketing-site mirror of the in-app Help home. Every
 * article is listed under its category as a plain `/docs/:id` link, so the whole
 * library is reachable by a crawler from this one static page. No search box
 * (that's an in-app nicety); this is a browsable index.
 */
@Component({
  selector: 'pc-docs-home',
  imports: [RouterLink, SiteHeader, SiteFooter, SiteIcon],
  templateUrl: './docs-home.html',
})
export class DocsHome {
  protected readonly signupUrl = SIGNUP_URL;

  protected readonly sections: readonly DocsSection[] = HELP_CATEGORIES.map((category) => ({
    category,
    icon: category.icon,
    articles: articlesInCategory(category.id),
  })).filter((section) => section.articles.length > 0);
}
