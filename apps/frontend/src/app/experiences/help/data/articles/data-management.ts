import type { HelpArticle } from '../help-types';

export const DATA_ARTICLES: HelpArticle[] = [
  {
    id: 'import',
    category: 'data',
    title: 'Import data from CSV',
    summary:
      'Bring existing spreadsheets into PeopleCRM, watch progress live, and clean up afterwards with the duplicates finder.',
    keywords: ['import', 'csv', 'spreadsheet', 'upload data', 'migrate', 'bulk add', 'excel'],
    related: ['duplicates', 'export', 'tags-issues', 'add-people'],
    blocks: [
      {
        kind: 'p',
        text: 'Any grid that supports it has **Import CSV** in its toolbar — [People](/people), [Companies](/companies), and more. The [Imports](/imports) page is mission control: every import you have run, its status, and its results.',
      },
      { kind: 'h2', id: 'prepare', text: 'Prepare the file' },
      {
        kind: 'list',
        items: [
          'Use a CSV with a header row — column names like “First name” or “Email” map naturally.',
          'One entity per file: import people into the People grid, companies into Companies.',
          'A quick pass in your spreadsheet first (split names, tidy emails) beats fixing records one by one after.',
        ],
      },
      { kind: 'h2', id: 'run', text: 'Run the import' },
      {
        kind: 'steps',
        items: [
          {
            title: 'Click **Import CSV** in the grid toolbar',
            detail: 'Pick your file and follow the prompts to match your columns to fields.',
          },
          {
            title: 'Let it run in the background',
            detail: 'Big files process server-side — keep working; the [Imports](/imports) page shows live progress.',
          },
          {
            title: 'Read the summary',
            detail: 'When it finishes you get an import summary notification with the results.',
          },
        ],
      },
      { kind: 'h2', id: 'after', text: 'After the import' },
      {
        kind: 'list',
        items: [
          'Spot-check a few records against the source file.',
          'Run the [Duplicates](/duplicates) finder — overlap with existing records is normal, and merging is painless. See [Find and merge duplicates](/help/duplicates).',
          'Tag the cohort if you have not already, so “everyone from the spring petition” stays one filter away.',
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Test with ten rows first',
        text: 'Import a ten-row slice before the full file. If the mapping is off you fix ten records, not ten thousand.',
      },
    ],
  },
  {
    id: 'export',
    category: 'data',
    title: 'Export your data',
    summary: 'Download any grid — or just your selection — as CSV, and collect finished exports from one page.',
    keywords: ['export', 'csv', 'download', 'backup', 'report', 'extract', 'spreadsheet'],
    related: ['import', 'bulk-actions', 'filters'],
    blocks: [
      {
        kind: 'p',
        text: 'Your data is yours. Every grid has **Export CSV** in its toolbar, and the file reflects the grid as you see it — filters applied. For a subset, select rows first and use **Export** in the bulk action bar: exactly those rows, nothing more.',
      },
      { kind: 'h2', id: 'exports-page', text: 'The Exports page' },
      {
        kind: 'p',
        text: 'Large exports are prepared in the background. The [Exports](/exports) page lists every export with its status and a download link when ready — and the export-ready notification tells you the moment it is done, so there is no need to wait around.',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Filter first, export second',
        text: 'Need “donors in Springfield since January”? Build the filter in the grid, confirm the match count, then export — the CSV is your report, no spreadsheet surgery required. See [Filters and the query builder](/help/filters).',
      },
      {
        kind: 'callout',
        tone: 'warning',
        title: 'Exports leave the safety of the app',
        text: 'A CSV on a laptop has none of the CRM’s access controls. Share exports deliberately and delete stale copies.',
      },
    ],
  },
  {
    id: 'duplicates',
    category: 'data',
    title: 'Find and merge duplicates',
    summary:
      'Review likely duplicate people, households, and companies side by side, and merge each pair in one confirmed click.',
    keywords: ['duplicate', 'merge', 'dedupe', 'clean up', 'data quality', 'double entry'],
    related: ['import', 'bulk-actions', 'households', 'companies'],
    blocks: [
      {
        kind: 'p',
        text: 'Duplicates creep in through imports, forms, and honest retyping — and they split a person’s history across two half-records. The [Duplicates](/duplicates) finder hunts them down across people, households, and companies.',
      },
      { kind: 'h2', id: 'review', text: 'Review and merge' },
      {
        kind: 'steps',
        items: [
          { title: 'Open [Duplicates](/duplicates)', detail: 'Choose people, households, or companies.' },
          {
            title: 'Compare each group side by side',
            detail: 'The finder surfaces likely matches; you stay the judge.',
          },
          {
            title: 'Merge — or skip',
            detail:
              'Merging folds the duplicate into the primary record and you confirm before anything happens. Not actually the same? Skip the group.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'warning',
        title: 'Merges are permanent',
        text: 'The duplicate record is removed for good — the confirmation names both records so you know exactly what is merging into what. When unsure, open both profiles first.',
      },
      {
        kind: 'p',
        text: 'Caught a pair in a grid instead? Select exactly two rows and use **Merge** in the bulk action bar — same result, no trip to the finder. See [Selection, bulk actions, and merging](/help/bulk-actions).',
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Make it a habit',
        text: 'A five-minute duplicates pass after every import keeps the database trustworthy — far cheaper than a heroic annual cleanup.',
      },
    ],
  },
];
