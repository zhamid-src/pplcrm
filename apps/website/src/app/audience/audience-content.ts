import type { PreviewKind } from '../ui/app-preview';

export interface AudienceFeature {
  readonly icon: string;
  readonly title: string;
  readonly body: string;
}

export interface AudienceOutcome {
  readonly stat: string;
  readonly label: string;
  readonly body: string;
}

export interface AudiencePageConfig {
  readonly eyebrow: string;
  readonly h1: string;
  readonly sub: string;
  readonly previewKind: PreviewKind;
  readonly previewUrl: string;
  /** Real product screenshot; when absent the <pc-app-preview> mock is shown. */
  readonly previewImg?: string;
  readonly featuresHeading: string;
  readonly features: readonly AudienceFeature[];
  readonly outcomes: readonly AudienceOutcome[];
  readonly quote: string;
  readonly quoteWho: string;
}

export const AUDIENCE_CONFIG: Record<string, AudiencePageConfig> = {
  offices: {
    eyebrow: 'For constituency offices',
    h1: 'Every case answered. Every constituent remembered.',
    sub: 'A shared inbox, tasks with due dates and a long memory. Casework that survives staff turnover and election cycles.',
    previewKind: 'inbox',
    previewUrl: 'app.pplcrm.com/inbox',
    previewImg: 'assets/site-shots/01-shot.png',
    featuresHeading: 'Casework that doesn’t fall through the cracks.',
    features: [
      {
        icon: 'inbox',
        title: 'A shared inbox with owners',
        body: 'Every message gets an owner and a due date. Nobody writes to your office twice about the same pothole.',
      },
      {
        icon: 'clock',
        title: 'Tasks that chase themselves',
        body: 'Follow-ups surface on the day they’re due, not the week after a constituent gives up on you.',
      },
      {
        icon: 'users',
        title: 'A memory longer than one term',
        body: 'The full history of a household stays put when staff change and when the mandate turns over.',
      },
      {
        icon: 'megaphone',
        title: 'Newsletters by ward and issue',
        body: 'Write once, send to the people it’s actually for. Segments come straight from your real list.',
      },
      {
        icon: 'identification',
        title: 'People, not tickets',
        body: 'A case is attached to a person and a household, so context travels with the human, not a number.',
      },
      {
        icon: 'arrow-up-tray',
        title: 'Your spreadsheet, welcomed',
        body: 'Import what you have; duplicates merge on the way in. Export everything, any time you like.',
      },
    ],
    outcomes: [
      {
        stat: 'Day one',
        label: 'Triaging real cases',
        body: 'Most offices are working live casework their first morning — no training week.',
      },
      {
        stat: '1 inbox',
        label: 'For the whole team',
        body: 'Correspondence, tasks and notes in one place instead of five personal mailboxes.',
      },
      {
        stat: '0 lost',
        label: 'Cases between terms',
        body: 'History and open work carry over when staff and mandates change.',
      },
    ],
    quote:
      'The office used to lose casework every time someone left. Now the constituent’s whole story is right there, no matter who picks it up.',
    quoteWho: 'The pitch we’re building toward',
  },
  campaigns: {
    eyebrow: 'For campaigns',
    h1: 'Built for the people who knock.',
    sub: 'Turf cutting, live field reports, donations and yard-sign routes. A campaign HQ that keeps score.',
    previewKind: 'canvassing',
    previewUrl: 'app.pplcrm.com/canvassing',
    previewImg: 'assets/site-shots/02-shot.png',
    featuresHeading: 'From the office whiteboard to the doorstep.',
    features: [
      {
        icon: 'map-pin',
        title: 'Cut turf in minutes',
        body: 'Slice the map into walkable turfs in the office; the crew sees them on their phones, offline-first.',
      },
      {
        icon: 'presentation-chart-line',
        title: 'A field report that’s live',
        body: 'Every knock syncs back as it happens, so you know where you stand before the night’s over.',
      },
      {
        icon: 'ticket',
        title: 'Yard-sign routes',
        body: 'Each sign request becomes a stop on an optimised route. Mark it placed and roll on.',
      },
      {
        icon: 'house-modern',
        title: 'Lit drops & deliveries',
        body: 'Leaflets and notices become driver routes with per-street progress you can actually see.',
      },
      {
        icon: 'currency-dollar',
        title: 'Donations that reconcile',
        body: 'Gifts, pledges and receipts sit on the same record as the door you knocked. One number, not three.',
      },
      {
        icon: 'user-group',
        title: 'Volunteers without seats',
        body: 'The field crew joins by invite to the companion apps and never eats a staff seat.',
      },
    ],
    outcomes: [
      {
        stat: 'Offline',
        label: 'First, always',
        body: 'Door lists and routes work with no signal and sync when the crew is back in range.',
      },
      {
        stat: 'Live',
        label: 'Field reporting',
        body: 'Knocks land on the HQ report the moment they happen — no end-of-day data entry.',
      },
      {
        stat: '1 record',
        label: 'Voter to donor',
        body: 'The same person’s doors, gifts and sign request live in one place.',
      },
    ],
    quote:
      'We stopped running the campaign out of a stack of spreadsheets and a group chat. The turf, the knocks and the money finally live together.',
    quoteWho: 'The pitch we’re building toward',
  },
  nonprofits: {
    eyebrow: 'For non-profits',
    h1: 'Donors, volunteers and neighbors. One list.',
    sub: 'Stop reconciling three spreadsheets. Gifts, drives and newsletters live on one person’s record.',
    previewKind: 'donations',
    previewUrl: 'app.pplcrm.com/donations',
    previewImg: 'assets/site-shots/03-shot.png',
    featuresHeading: 'One relationship, not three databases.',
    features: [
      {
        icon: 'currency-dollar',
        title: 'Donations, gratefully',
        body: 'Every donor thanked on time. Pledges, receipts and totals without a second spreadsheet.',
      },
      {
        icon: 'user-group',
        title: 'Volunteers remembered',
        body: 'Who showed up, what they did and when — attached to the same person who also gave last spring.',
      },
      {
        icon: 'megaphone',
        title: 'Newsletters that land',
        body: 'Segment by giving, interest or neighborhood and write once to the people it’s for.',
      },
      {
        icon: 'house-modern',
        title: 'Drives & deliveries',
        body: 'Hampers, mailers and meeting notices become routes with per-street progress for your drivers.',
      },
      {
        icon: 'users',
        title: 'Households, not rows',
        body: 'A family is one door with a shared history, not five disconnected spreadsheet lines.',
      },
      {
        icon: 'arrow-up-tray',
        title: 'Bring your data, keep it',
        body: 'Import your lists; duplicates merge automatically. Export everything, on every plan.',
      },
    ],
    outcomes: [
      {
        stat: '3 → 1',
        label: 'Spreadsheets retired',
        body: 'Donors, volunteers and contacts stop living in separate, drifting files.',
      },
      {
        stat: 'On time',
        label: 'Thank-yous',
        body: 'Gifts are logged against a person, so gratitude never slips through.',
      },
      {
        stat: 'Yours',
        label: 'Data, always',
        body: 'Export the whole thing to CSV whenever you want. Delete means deleted.',
      },
    ],
    quote:
      'Our donor list, our volunteer list and our newsletter list were three different truths. Now they’re one person’s record.',
    quoteWho: 'The pitch we’re building toward',
  },
};
