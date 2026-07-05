import type { HelpArticle } from '../help-types';

export const SEGMENTATION_ARTICLES: HelpArticle[] = [
  {
    id: 'tags-issues',
    category: 'segmentation',
    title: 'Tags and issues',
    summary:
      'Tags describe who people are; issues capture what they care about. Both filter every grid and target every newsletter.',
    keywords: ['tag', 'label', 'issue', 'interest', 'categorize', 'organize', 'bulk tag', 'remove tag'],
    related: ['lists', 'filters', 'bulk-actions', 'newsletters'],
    blocks: [
      {
        kind: 'p',
        text: 'Tags are free-form labels — **volunteer**, **major-donor**, **lawn-sign** — that describe a record. Issues work the same way but capture policy interests: what a supporter cares about, not what they are. Keeping the two apart keeps both useful.',
      },
      { kind: 'h2', id: 'apply', text: 'Apply tags' },
      {
        kind: 'list',
        items: [
          'On a profile — add or remove tags directly on the record.',
          'In bulk — select rows in a grid and use **Add tag** to label hundreds at once; see [Selection, bulk actions, and merging](/help/bulk-actions).',
          'On import — tag an incoming CSV so you can always find that cohort again; see [Import data from CSV](/help/import).',
        ],
      },
      { kind: 'h2', id: 'use', text: 'Put them to work' },
      {
        kind: 'p',
        text: 'Every grid has a tag filter and an issue filter — check several and they combine with OR (match any), landing as one removable chip. Newsletters target audiences by including and excluding tags, so disciplined tagging pays off directly in [Create and send a newsletter](/help/newsletters).',
      },
      { kind: 'h2', id: 'manage', text: 'Manage the vocabulary (administrators)' },
      {
        kind: 'p',
        text: 'Administrators curate the shared vocabulary under [Tags](/tags) and [Issues](/issues) in the System section — rename strays, delete stale labels, and keep the set small enough that everyone uses the same words.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'A tag taxonomy that stays useful',
        text: 'Prefer a handful of well-known tags over dozens of near-synonyms. If volunteer, Volunteers, and vol-2024 all exist, filters and audiences quietly miss people.',
      },
    ],
  },
  {
    id: 'lists',
    category: 'segmentation',
    title: 'Static and dynamic lists',
    summary:
      'Lists are reusable audiences — fixed rosters you curate by hand, or living queries that keep themselves current.',
    keywords: ['list', 'audience', 'segment', 'static list', 'dynamic list', 'smart list', 'membership', 'query'],
    related: ['tags-issues', 'filters', 'newsletters'],
    blocks: [
      {
        kind: 'p',
        text: 'A list is a saved group of people you can reuse anywhere — as a grid filter, a newsletter audience, or a team’s call sheet. Lists come in two flavors, and choosing the right one saves hours later.',
      },
      { kind: 'h2', id: 'static', text: 'Static lists: a roster you control' },
      {
        kind: 'p',
        text: 'A static list is a fixed set of members — it changes only when someone adds or removes people. Use one for a curated invite list, a board roster, or the attendees of a specific event.',
      },
      { kind: 'h2', id: 'dynamic', text: 'Dynamic lists: a query that stays fresh' },
      {
        kind: 'p',
        text: 'A dynamic list is defined by conditions in the query builder — “everyone tagged volunteer in Springfield”. Membership updates itself as records change: new matches join, non-matches drop out. Nobody maintains it, and it is never stale.',
      },
      { kind: 'h2', id: 'create', text: 'Create a list' },
      {
        kind: 'steps',
        items: [
          {
            title: 'Open [Lists](/lists) and click +',
            detail: 'Name the list something your teammates will recognize in a dropdown.',
          },
          { title: 'Pick static or dynamic', detail: 'Ask: should this group maintain itself? If yes, go dynamic.' },
          {
            title: 'Build it',
            detail:
              'Static: add members. Dynamic: compose conditions in the query builder and check the matching count before saving.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Lists are how good newsletters start',
        text: 'A newsletter audience built on a dynamic list is accurate on send day by definition — see [Create and send a newsletter](/help/newsletters).',
      },
    ],
  },
];
