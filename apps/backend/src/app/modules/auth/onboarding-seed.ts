import type { Transaction } from 'kysely';
import type { Models } from '../../../../../../libs/common/src/lib/kysely.models';
import { FORM_TEMPLATES, fieldsForTemplate } from '../../../../../../libs/common/src';
import type { FormType } from '../../../../../../libs/common/src';

/**
 * Creates the six starter web forms (one of every kind, all drafts) for a new
 * tenant. These are deliberately separate from the demo dataset
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
      name: 'Volunteer signup',
      slug: 'volunteer-signup',
      description: 'Volunteer signup form for your website. Customize the fields, then publish to get a public link.',
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
