import type { Transaction } from 'kysely';
import type { Models } from '../../../../../../libs/common/src/lib/kysely.models';
import { FORM_TEMPLATES, fieldsForTemplate } from '../../../../../../libs/common/src';
import type { FormType } from '../../../../../../libs/common/src';
import { fingerprintFull, fingerprintStreet } from '../../lib/address-normalize';

export async function seedOnboardingData(
  params: {
    tenant_id: string;
    user_id: string;
    campaign_id: string | bigint;
  },
  trx: Transaction<Models>,
) {
  const { tenant_id, user_id } = params;
  const campaign_id = String(params.campaign_id);

  // ── 1. Two sample households ─────────────────────────────────────────────
  const households = await trx
    .insertInto('households')
    .values([
      {
        tenant_id: tenant_id,
        campaign_id,
        street1: '123 Sample Street',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'US',
        address_fp_street: fingerprintStreet({ street1: '123 Sample Street' }),
        address_fp_full: fingerprintFull({
          street1: '123 Sample Street',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
          country: 'US',
        }),
        notes: '[SAMPLE] Sample household. Delete when you add your real contacts.',
        createdby_id: user_id,
        updatedby_id: user_id,
      },
      {
        tenant_id: tenant_id,
        campaign_id,
        street1: '456 Demo Avenue',
        city: 'Springfield',
        state: 'IL',
        zip: '62702',
        country: 'US',
        address_fp_street: fingerprintStreet({ street1: '456 Demo Avenue' }),
        address_fp_full: fingerprintFull({
          street1: '456 Demo Avenue',
          city: 'Springfield',
          state: 'IL',
          zip: '62702',
          country: 'US',
        }),
        notes: '[SAMPLE] Sample household. Delete when you add your real contacts.',
        createdby_id: user_id,
        updatedby_id: user_id,
      },
    ])
    .returning('id')
    .execute();

  const [hh1Id, hh2Id] = households.map((h) => h.id) as [string, string];

  // ── 2. Three sample persons ───────────────────────────────────────────────
  const persons = await trx
    .insertInto('persons')
    .values([
      {
        tenant_id: tenant_id,
        campaign_id,
        household_id: hh1Id,
        first_name: 'Alex',
        last_name: '[Sample]',
        email: 'alex.sample@example.com',
        mobile: '555-0101',
        notes: '[SAMPLE] Marked as a strong supporter. Delete when ready to use real contacts.',
        createdby_id: user_id,
        updatedby_id: user_id,
      },
      {
        tenant_id: tenant_id,
        campaign_id,
        household_id: hh1Id,
        first_name: 'Sam',
        last_name: '[Sample]',
        email: 'sam.sample@example.com',
        mobile: '555-0102',
        notes: '[SAMPLE] Tagged as Volunteer. Delete when ready to use real contacts.',
        createdby_id: user_id,
        updatedby_id: user_id,
      },
      {
        tenant_id: tenant_id,
        campaign_id,
        household_id: hh2Id,
        first_name: 'Jordan',
        last_name: '[Sample]',
        email: 'jordan.sample@example.com',
        mobile: '555-0103',
        notes: '[SAMPLE] Marked as against. Delete when ready to use real contacts.',
        createdby_id: user_id,
        updatedby_id: user_id,
      },
    ])
    .returning('id')
    .execute();

  const [alexId, samId, jordanId] = persons.map((p) => p.id) as [string, string, string];

  // ── 3. Tag + support-level assignments ────────────────────────────────────
  // Support is a per-campaign fact (§15), not a tag: Alex/Jordan get facts rows
  // in the office context. Sam keeps the volunteer tag — that one is still a tag.
  const tagRows = await trx
    .selectFrom('tags')
    .select(['id', 'name'])
    .where('tenant_id', '=', tenant_id)
    .where('name', '=', 'volunteer')
    .where('type', '=', 'tag')
    .execute();

  const volunteerTagId = tagRows[0]?.id;
  if (volunteerTagId) {
    await trx
      .insertInto('map_peoples_tags')
      .values({
        tenant_id: tenant_id,
        person_id: samId,
        tag_id: volunteerTagId,
        createdby_id: user_id,
        updatedby_id: user_id,
      })
      .execute();
  }

  await trx
    .insertInto('campaign_person_facts')
    .values(
      (
        [
          { person_id: alexId, support_level: 'strong' },
          { person_id: jordanId, support_level: 'against' },
        ] as const
      ).map(({ person_id, support_level }) => ({
        tenant_id: tenant_id,
        campaign_id,
        person_id,
        support_level,
        support_source: 'import',
        support_recorded_by: user_id,
        support_recorded_at: new Date(),
        createdby_id: user_id,
        updatedby_id: user_id,
      })),
    )
    .execute();

  // ── 4. Sample tasks ───────────────────────────────────────────────────────
  await trx
    .insertInto('tasks')
    .values([
      {
        tenant_id: tenant_id,
        name: 'Add your first real contact [SAMPLE]',
        details:
          'Go to People and add someone from your real list. You can delete the three sample contacts (Alex, Sam, Jordan) anytime.',
        status: 'todo' as const,
        priority: 'low' as const,
        position: 1,
        createdby_id: user_id,
        updatedby_id: user_id,
      },
      {
        tenant_id: tenant_id,
        name: 'Explore tags and lists to segment your contacts [SAMPLE]',
        details:
          'Tags like "volunteer", "staff", and "vip" are already set up — support level and email consent live on the person record per campaign. Open a sample person and try adding a tag. Then visit Lists to group people automatically by criteria.',
        status: 'todo' as const,
        priority: 'low' as const,
        position: 2,
        createdby_id: user_id,
        updatedby_id: user_id,
      },
      {
        tenant_id: tenant_id,
        name: 'Publish a sample form to start collecting responses [SAMPLE]',
        details:
          'Six sample forms — Volunteer signup, Newsletter signup, Recurring donation, One-time donation, Yard sign request and Issues survey — have been created under Forms as drafts. Open one, customize it, then publish it to get a public link for your website.',
        status: 'todo' as const,
        priority: 'medium' as const,
        position: 3,
        createdby_id: user_id,
        updatedby_id: user_id,
      },
    ])
    .execute();

  // ── 5. Sample forms (draft) ───────────────────────────────────────────────
  const sampleForms: {
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
      name: 'Volunteer Signup [SAMPLE]',
      slug: 'volunteer-signup',
      description: 'Sample volunteer signup form for your website. Customize the fields or delete and create your own.',
      submitLabel: FORM_TEMPLATES.signup.submitLabel,
      thanksBody: 'You’re signed up — we’ll be in touch soon.',
      confirmSubject: 'Thanks for signing up',
      confirmBody: 'Hi [First name],\n\nThanks for signing up to volunteer — we’ll be in touch soon.',
    },
    {
      key: 'signup',
      formType: 'standard',
      name: 'Newsletter Sign-Up [SAMPLE]',
      slug: 'newsletter-sign-up',
      description: 'Sample sign-up form for your website. Customize the fields or delete and create your own.',
      submitLabel: FORM_TEMPLATES.signup.submitLabel,
      thanksBody: 'You’re on the list — thanks for signing up.',
      confirmSubject: 'Thanks for signing up',
      confirmBody: 'Hi [First name],\n\nThanks for signing up — we’ll be in touch soon.',
    },
    {
      key: 'pledge',
      formType: 'recurring_donation',
      name: 'Recurring Donation [SAMPLE]',
      slug: 'recurring-donation',
      description: 'Sample monthly-giving form. Customize the fields or delete and create your own.',
      submitLabel: 'Set up recurring gift',
      thanksBody: 'Your recurring gift means a lot to us.',
      confirmSubject: 'Thanks for your recurring gift',
      confirmBody: 'Hi [First name],\n\nThanks for setting up a recurring gift — we’ll send a receipt each month.',
    },
    {
      key: 'pledge',
      formType: 'donation',
      name: 'One-Time Donation [SAMPLE]',
      slug: 'one-time-donation',
      description: 'Sample one-time donation form. Customize the fields or delete and create your own.',
      submitLabel: 'Give now',
      thanksBody: 'Your gift means a lot to us.',
      confirmSubject: 'Thanks for your gift',
      confirmBody: 'Hi [First name],\n\nThanks for your gift — a receipt is on its way.',
    },
    {
      key: 'request',
      formType: 'standard',
      name: 'Yard Sign Request [SAMPLE]',
      slug: 'yard-sign-request',
      description:
        'Sample yard sign request form for your website. Customize the fields or delete and create your own.',
      submitLabel: FORM_TEMPLATES.request.submitLabel,
      thanksBody: 'We’ll deliver your yard sign soon.',
      confirmSubject: 'Your yard sign request',
      confirmBody: 'Hi [First name],\n\nThanks for your request — a volunteer will drop off your sign soon.',
    },
    {
      key: 'survey',
      formType: 'standard',
      name: 'Issues Survey [SAMPLE]',
      slug: 'issues-survey',
      description: 'Sample issues survey for your website. Customize the fields or delete and create your own.',
      submitLabel: FORM_TEMPLATES.survey.submitLabel,
      thanksBody: 'Thanks for sharing your priorities with us.',
      confirmSubject: 'Thanks for your input',
      confirmBody: 'Hi [First name],\n\nThanks for filling out our survey — your input helps shape our priorities.',
    },
  ];

  await trx
    .insertInto('web_forms')
    .values(
      sampleForms.map((f) => ({
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
    .execute();

  // ── 6. Sample list (Supporters) with Alex pre-added ──────────────────────
  const list = await trx
    .insertInto('lists')
    .values({
      tenant_id: tenant_id,
      campaign_id,
      name: 'Supporters [SAMPLE]',
      description:
        'Sample list pre-populated with a supporter. Use lists to group contacts for newsletters or exports.',
      object: 'people',
      is_dynamic: false,
      status: 'idle',
      createdby_id: user_id,
      updatedby_id: user_id,
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  await trx
    .insertInto('map_lists_persons')
    .values({
      tenant_id: tenant_id,
      list_id: list.id,
      person_id: alexId,
      createdby_id: user_id,
      updatedby_id: user_id,
    })
    .execute();

  // ── 7. Sample volunteer event with Sam signed up ──────────────────────────
  const eventStart = new Date();
  eventStart.setDate(eventStart.getDate() + 30);
  eventStart.setHours(10, 0, 0, 0);
  const eventEnd = new Date(eventStart);
  eventEnd.setHours(14, 0, 0, 0);

  const event = await trx
    .insertInto('volunteer_events')
    .values({
      tenant_id: tenant_id,
      name: 'Community Kickoff [SAMPLE]',
      description:
        'Sample volunteer event. Edit the details, date, and location — then share the public sign-up link with your volunteers.',
      location_address: '789 Town Hall Square, Springfield, IL',
      start_time: eventStart,
      end_time: eventEnd,
      capacity: 20,
      is_private: false,
      send_reminder: false,
      send_signup_confirmation: false,
      send_volunteer_alert: false,
      slug: `sample-community-kickoff-${tenant_id.replace(/-/g, '').slice(0, 8)}`,
      createdby_id: user_id,
      updatedby_id: user_id,
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  await trx
    .insertInto('volunteer_shifts')
    .values({
      tenant_id: tenant_id,
      event_id: event.id,
      person_id: samId,
      status: 'signed_up',
      createdby_id: user_id,
      updatedby_id: user_id,
    })
    .execute();

  // ── 8. Sample newsletter (draft) ─────────────────────────────────────────
  await trx
    .insertInto('newsletters')
    .values({
      tenant_id: tenant_id,
      campaign_id,
      name: 'Welcome Newsletter [SAMPLE]',
      status: 'draft',
      subject: 'Welcome — we are glad you are here!',
      preview_text: 'A quick introduction to who we are and how to get involved.',
      audience_description: 'All supporters and subscribers',
      html_content:
        '<h1>Welcome!</h1><p>Thanks for joining us. We are excited to have you on board.</p><p>Stay tuned for updates, events, and ways to get involved.</p>',
      plain_text_content:
        'Welcome! Thanks for joining us. We are excited to have you on board. Stay tuned for updates, events, and ways to get involved.',
      createdby_id: user_id,
      updatedby_id: user_id,
    })
    .execute();

  // ── 9. Sample team with the owner as lead and Sam as a member ─────────────
  const team = await trx
    .insertInto('teams')
    .values({
      tenant_id: tenant_id,
      name: 'Sample Team [SAMPLE]',
      description: 'Sample team. Teams let you assign contacts and lists to a group of users working together.',
      team_lead_user_id: user_id,
      createdby_id: user_id,
      updatedby_id: user_id,
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  await trx
    .insertInto('map_teams_persons')
    .values({
      tenant_id: tenant_id,
      team_id: team.id,
      person_id: samId,
      createdby_id: user_id,
      updatedby_id: user_id,
    })
    .execute();
}
