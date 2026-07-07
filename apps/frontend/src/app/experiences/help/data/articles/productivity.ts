import type { HelpArticle } from '../help-types';

export const PRODUCTIVITY_ARTICLES: HelpArticle[] = [
  {
    id: 'tasks',
    category: 'productivity',
    title: 'Tasks — list and board',
    summary:
      'Track the work — assign it, date it, and move it from to do to done, in whichever of the two views you prefer.',
    keywords: ['task', 'todo', 'board', 'kanban', 'assign', 'due date', 'priority', 'status', 'waiting', 'sla'],
    related: ['dashboard', 'teams', 'automations'],
    blocks: [
      {
        kind: 'p',
        text: 'Tasks capture commitments — call this donor back, print the signs, book the room. Every task carries a status, an optional priority, an assignee, and a due date, and it is the same data whichever of the two views you work from.',
      },
      { kind: 'h2', id: 'views', text: 'List or board — one dataset, two views' },
      {
        kind: 'list',
        items: [
          '[Tasks](/tasks) — the list view: tabs for All, Mine, Unassigned, and Done, grouped under Overdue/Today/Upcoming/No due date headings. Check a task off, or hand an unowned one to yourself with its Unassigned pill.',
          '[Task board](/tasks/board) — one column per status: To do, In progress, Waiting, Done. The ‹ › buttons on a card move it one column; they dim at either end of the row. Jump there anytime with `g` then `b`.',
          'Every header carries a swap button — Open board / Open list — so you never have to hunt for the sidebar to switch.',
        ],
      },
      {
        kind: 'p',
        text: 'Statuses run **to do → in progress → waiting → done**. "Waiting" is worth using honestly — a card with a waiting reason attached (shown with a clock icon) is a meeting agenda that writes itself. Tasks nobody is coming back to are archived, not left cluttering the board.',
      },
      { kind: 'h2', id: 'accountability', text: 'Assignment, due dates, and SLAs' },
      {
        kind: 'list',
        items: [
          'A task with no assignee shows a dashed Unassigned pill — one click takes it and assigns it to you. Assigning a task notifies the assignee; due-today and overdue reminders follow automatically. Everyone tunes their own notifications on their [Profile](/profile).',
          "If your workspace sets a task SLA, every open task shows an honest SLA pill (due-in or overdue, in working hours) and the sidebar's Tasks badge is the live breach count. The [Dashboard](/dashboard) shows the rollup — see [The dashboard and SLA health](/help/dashboard).",
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Tasks come from everywhere',
        text: 'Create one directly, turn an inbox thread into one from [Inbox](/inbox), or let an automation open one — "new major donor" can open a personal-call task for the right person automatically. See [Automations](/help/automations).',
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
