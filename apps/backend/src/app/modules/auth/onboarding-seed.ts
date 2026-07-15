import type { Transaction } from 'kysely';
import type { Models } from '../../../../../../libs/common/src/lib/kysely.models';
import { FORM_TEMPLATES, fieldsForTemplate } from '../../../../../../libs/common/src';
import type { FormType } from '../../../../../../libs/common/src';

export interface StarterTagDef {
  name: string;
  description: string;
  color: string;
}

/**
 * Starter tag vocabulary (freeform organizational labels). Donor / supporter /
 * subscriber are structured concepts in this product (donations table,
 * campaign_person_facts, campaign_subscriptions) and were retired as tags —
 * the starter vocabulary must not resurrect them.
 *
 * The demo dataset (modules/demo/demo-seed-data.ts) attaches demo persons and
 * households to these by NAME — keep the two in sync when renaming.
 */
export const STARTER_TAGS: StarterTagDef[] = [
  { name: 'community leader', description: 'Runs or anchors a local association, league, or board.', color: '#8b5cf6' },
  { name: 'small business owner', description: 'Owns or operates a business in the riding.', color: '#f97316' },
  { name: 'senior', description: 'Prefers daytime calls and print material.', color: '#64748b' },
  { name: 'student', description: 'Student — usually reachable evenings and weekends.', color: '#22c55e' },
  { name: 'new to riding', description: 'Moved into the riding within the last year.', color: '#06b6d4' },
  { name: 'letter writer', description: 'Has written letters to the editor or to council.', color: '#eab308' },
  { name: 'media contact', description: 'Journalist or newsletter editor — route through comms.', color: '#ef4444' },
  { name: 'union member', description: 'Active local union member.', color: '#3b82f6' },
  { name: 'faith community', description: 'Active in a local faith community.', color: '#a855f7' },
  { name: 'lawn sign location', description: 'Household that has agreed to display a lawn sign.', color: '#16a34a' },
];

/**
 * Starter issue vocabulary (tags with type 'issue' — the structured
 * what-do-they-care-about list). Deliberately generic doorstep topics; the
 * demo dataset attaches demo persons to these by NAME.
 */
export const STARTER_ISSUES: StarterTagDef[] = [
  {
    name: 'housing affordability',
    description: 'Rents, missing-middle supply, and three-bedroom family units.',
    color: '#f43f5e',
  },
  {
    name: 'transit reliability',
    description: 'On-time performance, frequency, and coverage on the core routes.',
    color: '#0ea5e9',
  },
  {
    name: 'road safety',
    description: 'Traffic calming, crossings, and lighting on residential streets.',
    color: '#f59e0b',
  },
  {
    name: 'parks & greenspace',
    description: 'Park maintenance, trail access, and tree cover.',
    color: '#22c55e',
  },
  {
    name: 'small business support',
    description: 'Main-street vacancy, patio rules, and local procurement.',
    color: '#f97316',
  },
  {
    name: 'climate action',
    description: 'Retrofit programs, clean air and water, and active transportation.',
    color: '#14b8a6',
  },
];

/**
 * Creates the starter tag + issue vocabulary for a new tenant. Like the
 * starter forms below, these are deliberately separate from the demo dataset
 * (modules/demo/demo-seed.ts): exiting demo mode deletes the demo data but
 * keeps this vocabulary — a ready-made starting point that also shows what
 * tags and issues are for. All rows are `deletable: true` (suggestions, not
 * system data — the user can rename, recolor, merge, or delete them).
 *
 * Must run BEFORE seedDemoData: the demo seeder attaches demo persons and
 * households to these rows by name.
 */
export async function seedStarterTags(
  params: { tenant_id: string; user_id: string },
  trx: Transaction<Models>,
): Promise<void> {
  const audit = { tenant_id: params.tenant_id, createdby_id: params.user_id, updatedby_id: params.user_id };
  await trx
    .insertInto('tags')
    .values([
      ...STARTER_TAGS.map((t) => ({
        ...audit,
        name: t.name,
        description: t.description,
        color: t.color,
        deletable: true,
        type: 'tag' as const,
      })),
      ...STARTER_ISSUES.map((t) => ({
        ...audit,
        name: t.name,
        description: t.description,
        color: t.color,
        deletable: true,
        type: 'issue' as const,
      })),
    ])
    .execute();
}

/**
 * Creates the seven starter web forms (all drafts) for a new tenant: one of
 * each standard kind (signup ×2, request, survey), a standard fundraising
 * pledge form, plus the two donation giving pages (one-time + recurring). These
 * are deliberately separate from the demo dataset
 * (modules/demo/demo-seed.ts): exiting demo mode deletes the demo data but
 * keeps these forms — a ready-made starting point the user publishes when
 * they're ready.
 *
 * Returns the created ids + slugs so the demo seeder can attach sample
 * submissions to two of them.
 */
export async function seedStarterForms(
  params: {
    tenant_id: string;
    user_id: string;
    campaign_id: string | bigint;
  },
  trx: Transaction<Models>,
): Promise<{ id: string; slug: string }[]> {
  const { tenant_id, user_id } = params;
  const campaign_id = String(params.campaign_id);

  const starterForms: {
    key: FormType;
    formType: 'standard' | 'donation' | 'recurring_donation';
    name: string;
    slug: string;
    description: string;
    submitLabel: string;
    thanksBody: string;
    confirmSubject: string;
    confirmBody: string;
  }[] = [
    {
      key: 'signup',
      formType: 'standard',
      name: 'Volunteer sign-up',
      slug: 'volunteer-signup',
      description: 'Volunteer sign-up form for your website. Customize the fields, then publish to get a public link.',
      submitLabel: FORM_TEMPLATES.signup.submitLabel,
      thanksBody: 'You’re signed up — we’ll be in touch soon.',
      confirmSubject: 'Thanks for signing up',
      confirmBody: 'Hi [First name],\n\nThanks for signing up to volunteer — we’ll be in touch soon.',
    },
    {
      key: 'signup',
      formType: 'standard',
      name: 'Newsletter sign-up',
      slug: 'newsletter-sign-up',
      description: 'Sign-up form for your email newsletter. Customize the fields, then publish to get a public link.',
      submitLabel: FORM_TEMPLATES.signup.submitLabel,
      thanksBody: 'You’re on the list — thanks for signing up.',
      confirmSubject: 'Thanks for signing up',
      confirmBody: 'Hi [First name],\n\nThanks for signing up — we’ll be in touch soon.',
    },
    {
      key: 'pledge',
      formType: 'recurring_donation',
      name: 'Recurring donation',
      slug: 'recurring-donation',
      description: 'Monthly-giving form. Customize the fields, then publish to start accepting recurring gifts.',
      submitLabel: 'Set up recurring gift',
      thanksBody: 'Your recurring gift means a lot to us.',
      confirmSubject: 'Thanks for your recurring gift',
      confirmBody: 'Hi [First name],\n\nThanks for setting up a recurring gift — we’ll send a receipt each month.',
    },
    {
      key: 'pledge',
      formType: 'donation',
      name: 'One-time donation',
      slug: 'one-time-donation',
      description: 'One-time donation form. Customize the fields, then publish to start accepting gifts.',
      submitLabel: 'Give now',
      thanksBody: 'Your gift means a lot to us.',
      confirmSubject: 'Thanks for your gift',
      confirmBody: 'Hi [First name],\n\nThanks for your gift — a receipt is on its way.',
    },
    {
      key: 'pledge',
      formType: 'standard',
      name: 'Fundraising pledge',
      slug: 'fundraising-pledge',
      description:
        'Collect pledges of support from your website. Responses become people you can follow up with — no payment is taken here (use the Fundraising donation pages for card gifts).',
      submitLabel: FORM_TEMPLATES.pledge.submitLabel,
      thanksBody: 'Thank you for pledging your support — we’ll be in touch about next steps.',
      confirmSubject: 'Thanks for your pledge',
      confirmBody: 'Hi [First name],\n\nThank you for pledging your support — we’ll be in touch about next steps soon.',
    },
    {
      key: 'request',
      formType: 'standard',
      name: 'Yard sign request',
      slug: 'yard-sign-request',
      description: 'Yard sign request form for your website. Requests feed the Deliveries page for route planning.',
      submitLabel: FORM_TEMPLATES.request.submitLabel,
      thanksBody: 'We’ll deliver your yard sign soon.',
      confirmSubject: 'Your yard sign request',
      confirmBody: 'Hi [First name],\n\nThanks for your request — a volunteer will drop off your sign soon.',
    },
    {
      key: 'survey',
      formType: 'standard',
      name: 'Issues survey',
      slug: 'issues-survey',
      description: 'Issues survey for your website. Answers help you rank what your community cares about.',
      submitLabel: FORM_TEMPLATES.survey.submitLabel,
      thanksBody: 'Thanks for sharing your priorities with us.',
      confirmSubject: 'Thanks for your input',
      confirmBody: 'Hi [First name],\n\nThanks for filling out our survey — your input helps shape our priorities.',
    },
  ];

  const created = await trx
    .insertInto('web_forms')
    .values(
      starterForms.map((f) => ({
        tenant_id: tenant_id,
        campaign_id,
        name: f.name,
        description: f.description,
        fields: JSON.stringify(fieldsForTemplate(f.key)),
        target_tags: JSON.stringify([]),
        target_lists: JSON.stringify([]),
        status: 'draft' as const,
        type: f.key,
        slug: f.slug,
        submit_label: f.submitLabel,
        thanks_title: 'Thank you!',
        thanks_body: f.thanksBody,
        confirm_subject: f.confirmSubject,
        confirm_body: f.confirmBody,
        send_confirmation: true,
        send_alert: false,
        notify_team_on: false,
        form_type: f.formType,
        createdby_id: user_id,
        updatedby_id: user_id,
      })),
    )
    .returning(['id', 'slug'])
    .execute();

  return created.map((f) => ({ id: String(f.id), slug: f.slug }));
}
