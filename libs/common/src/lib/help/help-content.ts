import { ADMIN_ARTICLES } from './articles/administration';
import { CONTACTS_ARTICLES } from './articles/contacts';
import { DATA_ARTICLES } from './articles/data-management';
import { ENGAGEMENT_ARTICLES } from './articles/engagement';
import { GETTING_STARTED_ARTICLES } from './articles/getting-started';
import { GRIDS_ARTICLES } from './articles/grids';
import { OUTREACH_ARTICLES } from './articles/outreach';
import { PRODUCTIVITY_ARTICLES } from './articles/productivity';
import { SEGMENTATION_ARTICLES } from './articles/segmentation';

import type { HelpArticle, HelpCategory, HelpCategoryId } from './help-types';

/** Display order of the help center's categories. */
export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    blurb: 'Your first session: the tour, navigation habits, search, and shortcuts.',
    icon: 'map',
  },
  {
    id: 'contacts',
    label: 'People & relationships',
    blurb: 'People, households, companies, and teams: the heart of the CRM.',
    icon: 'identification',
  },
  {
    id: 'grids',
    label: 'Grids & data entry',
    blurb: 'One grid everywhere: filters, inline editing, selection, and bulk work.',
    icon: 'table-cells',
  },
  {
    id: 'segmentation',
    label: 'Tags, issues & lists',
    blurb: 'Describe people, capture what they care about, and build reusable audiences.',
    icon: 'label',
  },
  {
    id: 'outreach',
    label: 'Newsletters & email',
    blurb: 'Campaigns, the shared inbox, and automations that follow through for you.',
    icon: 'megaphone',
  },
  {
    id: 'engagement',
    label: 'Donations, events & forms',
    blurb: 'Raise money, run events and shifts, and collect signups from the web.',
    icon: 'currency-dollar',
  },
  {
    id: 'productivity',
    label: 'Tasks & files',
    blurb: 'Track the work on a board and keep shared documents one search away.',
    icon: 'task',
  },
  {
    id: 'data',
    label: 'Import, export & data quality',
    blurb: 'Move data in and out by CSV and keep the database free of duplicates.',
    icon: 'arrow-up-tray',
  },
  {
    id: 'admin',
    label: 'Account & administration',
    blurb: 'Profiles, roles and access, workspace configuration, and the audit trail.',
    icon: 'cog-6-tooth',
  },
];

/** Every article, in category display order. */
export const HELP_ARTICLES: HelpArticle[] = [
  ...GETTING_STARTED_ARTICLES,
  ...CONTACTS_ARTICLES,
  ...GRIDS_ARTICLES,
  ...SEGMENTATION_ARTICLES,
  ...OUTREACH_ARTICLES,
  ...ENGAGEMENT_ARTICLES,
  ...PRODUCTIVITY_ARTICLES,
  ...DATA_ARTICLES,
  ...ADMIN_ARTICLES,
];

/** Shown as quick links under the search box on the help home page. */
export const POPULAR_ARTICLE_IDS: string[] = [
  'welcome',
  'grid-basics',
  'filters',
  'newsletters',
  'import',
  'shortcuts',
];

const ARTICLES_BY_ID: ReadonlyMap<string, HelpArticle> = new Map(HELP_ARTICLES.map((a) => [a.id, a]));
const CATEGORIES_BY_ID: ReadonlyMap<HelpCategoryId, HelpCategory> = new Map(HELP_CATEGORIES.map((c) => [c.id, c]));

export function getHelpArticle(id: string): HelpArticle | undefined {
  return ARTICLES_BY_ID.get(id);
}

export function getHelpCategory(id: HelpCategoryId): HelpCategory | undefined {
  return CATEGORIES_BY_ID.get(id);
}

export function articlesInCategory(id: HelpCategoryId): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.category === id);
}

/**
 * Related reading for an article: its hand-picked `related` ids first,
 * topped up with neighbors from the same category, capped at `limit`.
 */
export function relatedArticles(article: HelpArticle, limit = 3): HelpArticle[] {
  const picked: HelpArticle[] = [];
  const seen = new Set<string>([article.id]);

  for (const id of article.related ?? []) {
    const found = ARTICLES_BY_ID.get(id);
    if (found && !seen.has(found.id)) {
      picked.push(found);
      seen.add(found.id);
    }
  }
  for (const neighbor of articlesInCategory(article.category)) {
    if (picked.length >= limit) break;
    if (!seen.has(neighbor.id)) {
      picked.push(neighbor);
      seen.add(neighbor.id);
    }
  }
  return picked.slice(0, limit);
}

/** Previous/next article within the same category, in display order. */
export function categoryNeighbors(article: HelpArticle): { next?: HelpArticle; prev?: HelpArticle } {
  const siblings = articlesInCategory(article.category);
  const index = siblings.findIndex((a) => a.id === article.id);
  if (index === -1) return {};
  return {
    prev: index > 0 ? siblings[index - 1] : undefined,
    next: index < siblings.length - 1 ? siblings[index + 1] : undefined,
  };
}
