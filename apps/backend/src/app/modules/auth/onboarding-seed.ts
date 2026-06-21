import { Transaction } from 'kysely';
import { Models } from '../../../../../../libs/common/src/lib/kysely.models';
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
  const campaign_id = params.campaign_id as any;

  // ── 1. Two sample households ─────────────────────────────────────────────
  const households = await trx
    .insertInto('households')
    .values([
      {
        tenant_id: tenant_id as any,
        campaign_id,
        street1: '123 Sample Street',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'US',
        address_fp_street: fingerprintStreet({ street1: '123 Sample Street' }) as any,
        address_fp_full: fingerprintFull({
          street1: '123 Sample Street',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
          country: 'US',
        }) as any,
        notes: '[SAMPLE] Sample household. Delete when you add your real contacts.',
        createdby_id: user_id as any,
        updatedby_id: user_id as any,
      } as any,
      {
        tenant_id: tenant_id as any,
        campaign_id,
        street1: '456 Demo Avenue',
        city: 'Springfield',
        state: 'IL',
        zip: '62702',
        country: 'US',
        address_fp_street: fingerprintStreet({ street1: '456 Demo Avenue' }) as any,
        address_fp_full: fingerprintFull({
          street1: '456 Demo Avenue',
          city: 'Springfield',
          state: 'IL',
          zip: '62702',
          country: 'US',
        }) as any,
        notes: '[SAMPLE] Sample household. Delete when you add your real contacts.',
        createdby_id: user_id as any,
        updatedby_id: user_id as any,
      } as any,
    ])
    .returning('id')
    .execute();

  const [hh1Id, hh2Id] = households.map((h) => h.id);

  // ── 2. Three sample persons ───────────────────────────────────────────────
  const persons = await trx
    .insertInto('persons')
    .values([
      {
        tenant_id: tenant_id as any,
        campaign_id,
        household_id: hh1Id as any,
        first_name: 'Alex',
        last_name: '[Sample]',
        email: 'alex.sample@example.com',
        mobile: '555-0101',
        notes: '[SAMPLE] Tagged as Supporter. Delete when ready to use real contacts.',
        createdby_id: user_id as any,
        updatedby_id: user_id as any,
      } as any,
      {
        tenant_id: tenant_id as any,
        campaign_id,
        household_id: hh1Id as any,
        first_name: 'Sam',
        last_name: '[Sample]',
        email: 'sam.sample@example.com',
        mobile: '555-0102',
        notes: '[SAMPLE] Tagged as Volunteer. Delete when ready to use real contacts.',
        createdby_id: user_id as any,
        updatedby_id: user_id as any,
      } as any,
      {
        tenant_id: tenant_id as any,
        campaign_id,
        household_id: hh2Id as any,
        first_name: 'Jordan',
        last_name: '[Sample]',
        email: 'jordan.sample@example.com',
        mobile: '555-0103',
        notes: '[SAMPLE] Tagged as Non-Supporter. Delete when ready to use real contacts.',
        createdby_id: user_id as any,
        updatedby_id: user_id as any,
      } as any,
    ])
    .returning('id')
    .execute();

  const [alexId, samId, jordanId] = persons.map((p) => p.id);

  // ── 3. Tag assignments ────────────────────────────────────────────────────
  const tagRows = await trx
    .selectFrom('tags')
    .select(['id', 'name'])
    .where('tenant_id', '=', tenant_id)
    .where('name', 'in', ['supporter', 'volunteer', 'non-supporter'])
    .where('type', '=', 'tag')
    .execute();

  const tagMap = new Map(tagRows.map((t) => [String(t.name), t.id]));
  const supporterTagId = tagMap.get('supporter');
  const volunteerTagId = tagMap.get('volunteer');
  const nonSupporterTagId = tagMap.get('non-supporter');

  const tagMappings = [
    supporterTagId ? { person_id: alexId, tag_id: supporterTagId } : null,
    volunteerTagId ? { person_id: samId, tag_id: volunteerTagId } : null,
    nonSupporterTagId ? { person_id: jordanId, tag_id: nonSupporterTagId } : null,
  ].filter((m): m is { person_id: any; tag_id: any } => m !== null);

  if (tagMappings.length > 0) {
    await trx
      .insertInto('map_peoples_tags')
      .values(
        tagMappings.map(({ person_id, tag_id }) => ({
          tenant_id: tenant_id as any,
          person_id: person_id as any,
          tag_id: tag_id as any,
          createdby_id: user_id as any,
          updatedby_id: user_id as any,
        })),
      )
      .execute();
  }

  // ── 4. Sample tasks ───────────────────────────────────────────────────────
  await trx
    .insertInto('tasks')
    .values([
      {
        tenant_id: tenant_id as any,
        name: 'Add your first real contact [SAMPLE]',
        details:
          'Go to People and add someone from your real list. You can delete the three sample contacts (Alex, Sam, Jordan) anytime.',
        status: 'todo',
        priority: 'low',
        position: 1,
        createdby_id: user_id as any,
        updatedby_id: user_id as any,
      } as any,
      {
        tenant_id: tenant_id as any,
        name: 'Explore tags and lists to segment your contacts [SAMPLE]',
        details:
          'Tags like "supporter", "volunteer", and "donor" are already set up. Open a sample person and try adding a tag. Then visit Lists to group people automatically by criteria.',
        status: 'todo',
        priority: 'low',
        position: 2,
        createdby_id: user_id as any,
        updatedby_id: user_id as any,
      } as any,
      {
        tenant_id: tenant_id as any,
        name: 'Share your sign-up form with supporters [SAMPLE]',
        details:
          'A sample web form called "Newsletter Sign-Up" has been created under Forms. Copy the public link and put it on your website so new contacts land directly in this CRM.',
        status: 'todo',
        priority: 'medium',
        position: 3,
        createdby_id: user_id as any,
        updatedby_id: user_id as any,
      } as any,
    ])
    .execute();

  // ── 5. Sample web sign-up form ────────────────────────────────────────────
  await trx
    .insertInto('web_forms')
    .values({
      tenant_id: tenant_id as any,
      name: 'Newsletter Sign-Up [SAMPLE]',
      description: 'Sample sign-up form for your website. Customize the fields or delete and create your own.',
      fields: JSON.stringify(['first_name', 'last_name', 'email:required', 'mobile', 'notes']) as any,
      target_tags: JSON.stringify(['subscriber']) as any,
      status: 'active',
      send_confirmation: true as any,
      send_alert: false as any,
      form_type: 'standard',
      createdby_id: user_id as any,
      updatedby_id: user_id as any,
    } as any)
    .execute();

  // ── 6. Sample list (Supporters) with Alex pre-added ──────────────────────
  const list = await trx
    .insertInto('lists')
    .values({
      tenant_id: tenant_id as any,
      name: 'Supporters [SAMPLE]',
      description: 'Sample list pre-populated with a supporter. Use lists to group contacts for newsletters or exports.',
      object: 'people',
      is_dynamic: false,
      status: 'idle',
      createdby_id: user_id as any,
      updatedby_id: user_id as any,
    } as any)
    .returning('id')
    .executeTakeFirstOrThrow();

  await trx
    .insertInto('map_lists_persons')
    .values({
      tenant_id: tenant_id as any,
      list_id: list.id as any,
      person_id: alexId as any,
      createdby_id: user_id as any,
      updatedby_id: user_id as any,
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
      tenant_id: tenant_id as any,
      name: 'Community Kickoff [SAMPLE]',
      description:
        'Sample volunteer event. Edit the details, date, and location — then share the public sign-up link with your volunteers.',
      location_address: '789 Town Hall Square, Springfield, IL',
      start_time: eventStart as any,
      end_time: eventEnd as any,
      capacity: 20,
      is_private: false,
      send_reminder: false,
      send_signup_confirmation: false,
      send_volunteer_alert: false,
      slug: 'sample-community-kickoff',
      createdby_id: user_id as any,
      updatedby_id: user_id as any,
    } as any)
    .returning('id')
    .executeTakeFirstOrThrow();

  await trx
    .insertInto('volunteer_shifts')
    .values({
      tenant_id: tenant_id as any,
      event_id: event.id as any,
      person_id: samId as any,
      status: 'signed_up',
      createdby_id: user_id as any,
      updatedby_id: user_id as any,
    } as any)
    .execute();

  // ── 8. Sample newsletter (draft) ─────────────────────────────────────────
  await trx
    .insertInto('newsletters')
    .values({
      tenant_id: tenant_id as any,
      name: 'Welcome Newsletter [SAMPLE]',
      status: 'draft',
      subject: 'Welcome — we are glad you are here!',
      preview_text: 'A quick introduction to who we are and how to get involved.',
      audience_description: 'All supporters and subscribers',
      html_content:
        '<h1>Welcome!</h1><p>Thanks for joining us. We are excited to have you on board.</p><p>Stay tuned for updates, events, and ways to get involved.</p>',
      plain_text_content:
        'Welcome! Thanks for joining us. We are excited to have you on board. Stay tuned for updates, events, and ways to get involved.',
      createdby_id: user_id as any,
      updatedby_id: user_id as any,
    } as any)
    .execute();

  // ── 9. Sample team with the owner as lead and Sam as a member ─────────────
  const team = await trx
    .insertInto('teams')
    .values({
      tenant_id: tenant_id as any,
      name: 'Sample Team [SAMPLE]',
      description: 'Sample team. Teams let you assign contacts and lists to a group of users working together.',
      team_lead_user_id: user_id as any,
      createdby_id: user_id as any,
      updatedby_id: user_id as any,
    } as any)
    .returning('id')
    .executeTakeFirstOrThrow();

  await trx
    .insertInto('map_teams_persons')
    .values({
      tenant_id: tenant_id as any,
      team_id: team.id as any,
      person_id: samId as any,
      createdby_id: user_id as any,
      updatedby_id: user_id as any,
    })
    .execute();
}
