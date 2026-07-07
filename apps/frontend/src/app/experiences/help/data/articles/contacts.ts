import type { HelpArticle } from '../help-types';

export const CONTACTS_ARTICLES: HelpArticle[] = [
  {
    id: 'add-people',
    category: 'contacts',
    title: 'Add and edit people',
    summary: 'Create person records one at a time, edit them safely, and understand what happens to unsaved changes.',
    keywords: ['add person', 'create contact', 'new person', 'edit person', 'contact details', 'unsaved changes'],
    related: ['person-profile', 'import', 'tags-issues', 'households'],
    blocks: [
      { kind: 'h2', id: 'add-one', text: 'Add a person' },
      {
        kind: 'steps',
        items: [
          { title: 'Open [People](/people)', detail: 'Everything about individual contacts starts in this grid.' },
          { title: 'Click the + button in the toolbar', detail: 'The new-person form opens.' },
          {
            title: 'Fill in what you know',
            detail:
              'Fields validate as you type — problems are explained right under the field, so you can fix them before saving.',
          },
          { title: 'Save', detail: 'You land on the new profile, ready for tags, a household, or a follow-up task.' },
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Have a spreadsheet?',
        text: 'Do not type hundreds of rows by hand — [Import data from CSV](/help/import) brings them in at once, and the [Duplicates](/help/duplicates) finder cleans up any overlap afterwards.',
      },
      { kind: 'h2', id: 'editing', text: 'Edit an existing person' },
      {
        kind: 'p',
        text: 'Open the profile and use its edit action for the full form, or edit simple fields straight in the grid — double-click a cell, change the value, and it saves on the spot with a brief green flash to confirm. Grid edits can be undone with the undo arrow in the toolbar.',
      },
      {
        kind: 'p',
        text: 'In the form, tags and issues offer suggestion chips drawn from values already in use — click one to apply it instead of retyping. The address is not edited here: because addresses belong to households, the form shows it read-only with an “Edit on household” link, so everyone at that address stays in sync.',
      },
      {
        kind: 'p',
        text: 'If you try to leave a form with unsaved changes, PeopleCRM asks before discarding them — it names exactly which fields would be lost, so nothing disappears silently.',
      },
      { kind: 'h2', id: 'deleting', text: 'Delete with care' },
      {
        kind: 'p',
        text: 'Delete lives in the record menu (and in the grid, appears once you select rows). You will always be asked to confirm, because deleting a person also removes them from the lists and histories that reference them.',
      },
    ],
  },
  {
    id: 'person-profile',
    category: 'contacts',
    title: 'Inside a person profile',
    summary:
      'The profile gathers everything about one person — here is what each tab shows and where the numbers come from.',
    keywords: ['profile', 'person view', 'detail page', 'tabs', 'history', 'activity', 'donations tab', 'emails tab'],
    related: ['add-people', 'activity-log', 'donations', 'events-shifts'],
    blocks: [
      {
        kind: 'p',
        text: 'Open any person from the [People](/people) grid by clicking their name in the first column. The header answers the essentials — who this is and their status — and the tabs below collect their entire history. Tab labels carry counts, so you can see at a glance where the substance is before you click.',
      },
      {
        kind: 'p',
        text: 'The contact card on the left carries the essentials — email, phone, address (which links to the household), preferred contact channel, tags, and issues of interest — with the record’s notes just below it.',
      },
      { kind: 'h2', id: 'tabs', text: 'What each tab holds' },
      {
        kind: 'list',
        items: [
          '**Activity** — the audit trail of changes and touches on this record, newest first.',
          '**Emails** — messages exchanged with this person through the [Inbox](/inbox), followed by their newsletter engagement (opens, clicks, bounces).',
          '**Donations** — every gift on record, showing date, amount, method (card or manual, with a “· monthly” note for pledge-linked gifts), and receipt status. An active monthly pledge also lights up a “Monthly donor” chip beside the name.',
          '**Volunteer** — their shift history and hours.',
          '**Events** — event registrations and attendance.',
          '**Household** — everyone at the same address, plus this person’s connections.',
        ],
      },
      { kind: 'h2', id: 'navigating', text: 'Working through many profiles' },
      {
        kind: 'p',
        text: 'Arriving from a filtered grid, the header shows “N of M filtered” with previous/next arrows — use `J` and `K` to walk the whole set hands-on-keyboard. See [Finding your way around](/help/getting-around).',
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Empty tab? That is a prompt, not a dead end',
        text: 'Empty states name the cause and offer the next step — for example, a person with no household shows an assign action right there.',
      },
    ],
  },
  {
    id: 'households',
    category: 'contacts',
    title: 'Households',
    summary: 'Group people who live together so mailings, door-knocks, and donation asks treat them as one unit.',
    keywords: ['household', 'family', 'address', 'members', 'assign household', 'home'],
    related: ['add-people', 'person-profile', 'duplicates'],
    blocks: [
      {
        kind: 'p',
        text: 'A household groups the people at one address. Use households to avoid mailing the same home twice, to canvass efficiently, and to understand giving at the family level.',
      },
      { kind: 'h2', id: 'create', text: 'Create a household' },
      {
        kind: 'steps',
        items: [
          {
            title: 'Open [Households](/households)',
            detail:
              'From [People](/people), click the **Households** tab under the header — People, Households, and Companies are three views of the same contacts. The grid lists every household with its members.',
          },
          { title: 'Click the + button', detail: 'Name the household and give it an address.' },
          { title: 'Add members', detail: 'Assign people from their profiles, or from the household page itself.' },
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Start from the person',
        text: 'On a profile with no household yet, the household area offers **Assign household** directly — often the fastest route.',
      },
      { kind: 'h2', id: 'dedupe', text: 'Keep households clean' },
      {
        kind: 'p',
        text: 'Imports sometimes create near-identical households. The [Duplicates](/duplicates) finder has a dedicated households view for merging them — see [Find and merge duplicates](/help/duplicates).',
      },
    ],
  },
  {
    id: 'companies',
    category: 'contacts',
    title: 'Companies',
    summary: 'Track employers, sponsors, and partner organizations, and connect people to them.',
    keywords: ['company', 'organization', 'employer', 'business', 'sponsor', 'corporate'],
    related: ['person-profile', 'duplicates', 'grid-basics'],
    blocks: [
      {
        kind: 'p',
        text: 'Companies hold the organizations in your world — employers of your supporters, sponsors, vendors, and institutional partners. Each company page shows its details and the people connected to it, with counts on every tab.',
      },
      { kind: 'h2', id: 'create', text: 'Add a company' },
      {
        kind: 'steps',
        items: [
          {
            title: 'Open [Companies](/companies)',
            detail:
              'From [People](/people), click the **Companies** tab under the header. Browse or search existing companies first to avoid creating a twin.',
          },
          { title: 'Click the + button', detail: 'Fill in the name and any contact details you have.' },
          { title: 'Connect people', detail: 'Link people to the company so both sides show the relationship.' },
        ],
      },
      {
        kind: 'p',
        text: 'Companies get the full grid toolkit — filters, tags, CSV import and export, and inline editing — plus their own view in the [Duplicates](/duplicates) finder.',
      },
    ],
  },
  {
    id: 'teams',
    category: 'contacts',
    title: 'Teams',
    summary: 'Organize volunteers and staff into teams with their own members, lists, and tasks.',
    keywords: ['team', 'volunteers', 'staff', 'group', 'organizing', 'crew'],
    related: ['events-shifts', 'tasks', 'lists'],
    blocks: [
      {
        kind: 'p',
        text: 'Teams turn a crowd of volunteers into working units — a canvassing crew, a phone-bank team, an events committee. Each team page carries its own tabs for activity, volunteers, lists, and tasks, so the team’s whole world lives in one place.',
      },
      { kind: 'h2', id: 'create', text: 'Set up a team' },
      {
        kind: 'steps',
        items: [
          { title: 'Open [Teams](/teams)', detail: 'The grid shows every team at a glance.' },
          { title: 'Click the + button', detail: 'Name the team and describe its purpose.' },
          { title: 'Add volunteers', detail: 'Build the roster from your existing people.' },
          {
            title: 'Give it work',
            detail: 'Attach lists to call through and tasks to complete — the team page tracks both.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Teams pair well with shifts',
        text: 'Schedule a team’s work as volunteer shifts and attendance flows back to each member’s profile — see [Events and volunteer shifts](/help/events-shifts).',
      },
    ],
  },
];
