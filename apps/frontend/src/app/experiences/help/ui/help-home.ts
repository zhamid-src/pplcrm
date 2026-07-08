import { afterNextRender, Component, computed, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';

import {
  articlesInCategory,
  getHelpArticle,
  getHelpCategory,
  HELP_CATEGORIES,
  POPULAR_ARTICLE_IDS,
} from '../data/help-content';
import { searchHelp } from '../data/help-search';
import { readingMinutes } from '../data/help-types';

import type { ElementRef } from '@angular/core';
import type { HelpArticle, HelpCategory } from '../data/help-types';

interface HelpCategorySection {
  articles: HelpArticle[];
  category: HelpCategory;
}

/** Help center landing page: search across all articles, or browse by topic. */
@Component({
  selector: 'pc-help-home',
  imports: [Icon, RouterLink],
  templateUrl: './help-home.html',
})
export class HelpHomePage {
  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('searchBox');

  protected readonly query = signal('');
  protected readonly searching = computed(() => this.query().trim().length > 0);
  protected readonly results = computed(() => searchHelp(this.query()));

  protected readonly sections: HelpCategorySection[] = HELP_CATEGORIES.map((category) => ({
    articles: articlesInCategory(category.id),
    category,
  }));

  protected readonly popular: HelpArticle[] = POPULAR_ARTICLE_IDS.map(getHelpArticle).filter(
    (a): a is HelpArticle => a !== undefined,
  );

  constructor() {
    afterNextRender(() => this.searchBox()?.nativeElement.focus());
  }

  protected categoryLabel(article: HelpArticle): string {
    return getHelpCategory(article.category)?.label ?? '';
  }

  protected clearSearch(): void {
    this.query.set('');
    this.searchBox()?.nativeElement.focus();
  }

  protected minutes(article: HelpArticle): number {
    return readingMinutes(article);
  }

  protected onSearchInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
}
