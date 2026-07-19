import type { HelpArticle } from '../help-types';

export const PRODUCTIVITY_ARTICLES: HelpArticle[] = [
  {
    id: 'tasks',
    category: 'productivity',
    title: 'Tasks: list and board',
    summary:
      'Track the work: assign it, date it, and move it from to do to done, in whichever of the two views you prefer.',
    keywords: ['task', 'todo', 'board', 'kanban', 'assign', 'due date', 'priority', 'status', 'waiting', 'sla'],
    related: ['dashboard', 'teams', 'automations'],
    blocks: [
      {
        kind: 'p',
        text: 'Tasks capture commitments: call this donor back, print the signs, book the room. Every task carries a status, an optional priority, an assignee, and a due date, and it is the same data whichever of the two views you work from.',
      },
      { kind: 'h2', id: 'views', text: 'List or board: one dataset, two views' },
      {
        kind: 'list',
        items: [
          '[Tasks](/tasks) is the list view: tabs for All, Mine, Unassigned, and Done, grouped under Overdue/Today/Upcoming/No due date headings. Check a task off, or hand an unowned one to yourself with its Unassigned pill.',
          '[Task board](/tasks/board) shows one column per status: To do, In progress, Waiting, Done. Drag a card to another column to change its status, or drag it up and down within a column to set the order you want; the order sticks. Prefer the keyboard? The ‹ › buttons on a card still move it one column and dim at either end of the row. Jump to the board anytime with `g` then `b`.',
          'Every header carries a swap button (Open board / Open list), so you never have to hunt for the sidebar to switch.',
        ],
      },
      {
        kind: 'p',
        text: 'Statuses run **to do → in progress → waiting → done**. "Waiting" is worth using honestly. A card with a waiting reason attached (shown with a clock icon) is a meeting agenda that writes itself. Tasks nobody is coming back to are archived, not left cluttering the board.',
      },
      {
        kind: 'p',
        text: 'Opening a task shows its full record: subtasks, discussion, attachments, and the activity history. Break the work into subtasks and drag them by the handle on the left of each row to reorder them. The header carries Archive and a ⋯ menu with **Rename task**, **Open task board**, and **Delete task**; the breadcrumb takes you back to the list, and opening from the list adds previous/next arrows (`J`/`K`) through the same filtered set.',
      },
      { kind: 'h2', id: 'accountability', text: 'Assignment, due dates, and SLAs' },
      {
        kind: 'list',
        items: [
          'A task with no assignee shows a dashed Unassigned pill. One click takes it and assigns it to you. Assigning a task notifies the assignee; due-today and overdue reminders follow automatically. Everyone tunes their own notifications on their [Profile](/profile).',
          "If your workspace sets a task SLA, every open task shows an honest SLA pill (due-in or overdue, in working hours) and the sidebar's Tasks badge is the live breach count. The [Dashboard](/dashboard) shows the rollup. See [The dashboard and SLA health](/help/dashboard).",
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Tasks come from everywhere',
        text: 'Create one directly, turn an inbox thread into one from [Inbox](/inbox), or let an automation open one; "new major donor" can open a personal-call task for the right person automatically. See [Automations](/help/automations).',
      },
    ],
  },
  {
    id: 'files',
    category: 'productivity',
    title: 'Storage & attachments',
    summary: 'Files live attached to the record they belong to; track total usage from Workspace settings.',
    keywords: ['file', 'upload', 'document', 'attachment', 'storage', 'pdf', 'quota'],
    related: ['grid-basics', 'newsletters'],
    blocks: [
      {
        kind: 'p',
        text: 'Files no longer live in their own standalone library. A file is attached directly to the record it belongs to (for example, a PDF flyer attached to a newsletter). This keeps every upload tied to why it was added, instead of sitting in an unsorted pile.',
      },
      { kind: 'h2', id: 'attach', text: 'Attach a file' },
      {
        kind: 'p',
        text: 'Open the record that should carry the file (e.g. a draft or scheduled newsletter) and use its "Attach file" button. Attachments can only be added or removed before the record has sent.',
      },
      { kind: 'h2', id: 'storage', text: 'Check total usage' },
      {
        kind: 'steps',
        items: [
          {
            title: 'Open [Workspace settings → Storage](/workspace/storage)',
            detail: 'Shows how much of your plan quota is used, and which files are the largest.',
          },
          {
            title: 'Delete a large file',
            detail:
              'Removing it from the Storage tab detaches it from whatever it was attached to and frees the space.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Quota affects newsletter sending',
        text: 'If your workspace is at 100% of its storage quota, newsletters still send but skip their attachments. Free up space first if attachments matter for that send.',
      },
    ],
  },
];
