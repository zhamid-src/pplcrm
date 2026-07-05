import type { HelpArticle } from '../help-types';

export const PRODUCTIVITY_ARTICLES: HelpArticle[] = [
  {
    id: 'tasks',
    category: 'productivity',
    title: 'Tasks and the board',
    summary: 'Track the work — assign it, date it, and move it across a kanban board from to-do to done.',
    keywords: ['task', 'todo', 'board', 'kanban', 'assign', 'due date', 'priority', 'status', 'blocked'],
    related: ['dashboard', 'teams', 'automations'],
    blocks: [
      {
        kind: 'p',
        text: 'Tasks capture commitments — call this donor back, print the signs, book the room. Every task carries a status, a priority, an assignee, and a due date, and you can work them from two views of the same data.',
      },
      { kind: 'h2', id: 'views', text: 'Grid or board — your choice' },
      {
        kind: 'list',
        items: [
          '[Tasks](/tasks) — the grid view: filter, sort into your own order, edit inline, work in bulk.',
          '[Task board](/board) — the kanban view: one column per status. Drag a card to a new column and its status updates instantly.',
        ],
      },
      {
        kind: 'p',
        text: 'Statuses run **to do → in progress → blocked → done → canceled**. “Blocked” is worth using honestly — a column of blocked cards is a meeting agenda that writes itself.',
      },
      { kind: 'h2', id: 'accountability', text: 'Assignment, due dates, and SLAs' },
      {
        kind: 'list',
        items: [
          'Assigning a task notifies the assignee; due-today and overdue reminders follow automatically. Everyone tunes their own notifications on their [Profile](/profile).',
          'If your workspace sets a task SLA, open tasks count against it and the [Dashboard](/summary) shows the rollup — see [The dashboard and SLA health](/help/dashboard).',
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Tasks come from everywhere',
        text: 'Automations can create tasks too — “new major donor” can open a personal-call task for the right person automatically. See [Automations](/help/automations).',
      },
    ],
  },
  {
    id: 'files',
    category: 'productivity',
    title: 'Files',
    summary: 'One shared library for the documents your team actually reuses — uploaded once, findable by everyone.',
    keywords: ['file', 'upload', 'document', 'attachment', 'storage', 'pdf', 'library'],
    related: ['grid-basics', 'export'],
    blocks: [
      {
        kind: 'p',
        text: 'The [Files](/files) area is your workspace’s shared drive inside the CRM: flyers, scripts, permits, photos — uploaded once, visible to the team, and searchable like any grid.',
      },
      { kind: 'h2', id: 'upload', text: 'Add and find files' },
      {
        kind: 'steps',
        items: [
          { title: 'Open [Files](/files)', detail: 'The grid lists every uploaded file with its details.' },
          { title: 'Upload', detail: 'Pick the file and it lands in the library, ready to open or download.' },
          {
            title: 'Find it later',
            detail: 'Search with `⌘K` or the grid filters — naming files descriptively pays off here.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Name for your future self',
        text: '“2026-06 canvassing script v2.pdf” beats “final_FINAL.pdf” every time someone searches.',
      },
    ],
  },
];
