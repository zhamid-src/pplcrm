import type { PcIconNameType } from '@icons/icons.index';
import type { WorkflowExitCondition, WorkflowSendCondition, WorkflowTriggerType } from '@common';

import type { SequenceStepPayload } from './automations.model';

/**
 * Pre-built automation recipes (the Action Network insight: recipes beat a blank canvas).
 * Pure UI seed data: choosing one prefills the builder through the existing create + saveSteps
 * mutations, the workflow stays in draft, and the user reviews and activates it themselves.
 * Email bodies use the same {{first_name}} merge tokens as the newsletter composer; the drip
 * handler substitutes them per recipient at send time.
 */
export interface AutomationRecipe {
  id: string;
  icon: PcIconNameType;
  title: string;
  description: string;
  /** Prefilled workflow name. */
  name: string;
  trigger_type: WorkflowTriggerType;
  trigger_event_id: string | null;
  /** Sequence goals prefilled into "End the sequence early when...". */
  exit_conditions?: readonly WorkflowExitCondition[];
  steps: SequenceStepPayload[];
}

function emailStep(subject: string, paragraphs: string[], sendCondition?: WorkflowSendCondition): SequenceStepPayload {
  const html = paragraphs.map((p) => `<p>${p}</p>`).join('\n');
  const text = paragraphs.map((p) => p.replace(/<[^>]+>/g, '')).join('\n\n');
  return {
    kind: 'send_email',
    config: sendCondition ? { send_condition: sendCondition } : null,
    delay_days: 0,
    delay_unit: 'days',
    subject,
    preview_text: null,
    html_content: html,
    plain_text_content: text,
  };
}

function waitStep(days: number): SequenceStepPayload {
  return {
    kind: 'wait',
    config: null,
    delay_days: days,
    delay_unit: 'days',
    subject: null,
    preview_text: null,
    html_content: null,
    plain_text_content: null,
  };
}

export const AUTOMATION_RECIPES: readonly AutomationRecipe[] = [
  {
    id: 'welcome-series',
    icon: 'add-newsletter',
    title: 'Welcome new supporters',
    description: 'Three emails over two weeks: who we are, how to get involved, then a soft ask.',
    name: 'Welcome series',
    trigger_type: 'new_subscriber',
    trigger_event_id: null,
    // Someone who already chipped in should not get the soft ask at the end.
    exit_conditions: ['donated'],
    steps: [
      emailStep('Welcome aboard, {{first_name}}!', [
        'Hi {{first_name}},',
        'Thanks for joining us. We are a community of neighbors who believe local action changes things, and you just made that community stronger.',
        'Over the next couple of weeks we will share what we are working on and a few easy ways to take part. No pressure; read at your own pace.',
        'Glad to have you with us.',
      ]),
      waitStep(3),
      emailStep('Three ways to get involved this week', [
        'Hi {{first_name}},',
        'Ready to do more than read? Here are three easy starting points: come to our next event and meet the team, share our signup page with two friends, or tell us which issues matter most to you by replying to this email.',
        'Whatever fits your life; every bit genuinely helps.',
      ]),
      waitStep(7),
      emailStep('Can you chip in, {{first_name}}?', [
        'Hi {{first_name}},',
        'Everything we do is powered by people like you. If you are able, a small contribution goes further than you might think: printing, signs, coffee for volunteers.',
        'If now is not the right time, no worries at all. Showing up and spreading the word matter just as much.',
      ]),
    ],
  },
  {
    id: 'donation-thank-you',
    icon: 'add-fundraising',
    title: 'Thank every donor',
    description: 'A same-day thank-you email, plus a task to send a personal note.',
    name: 'Donation thank-you',
    trigger_type: 'donation_recorded',
    trigger_event_id: null,
    steps: [
      emailStep('Thank you for your gift, {{first_name}}', [
        'Hi {{first_name}},',
        'Thank you so much for your contribution. Gifts like yours are what keep this work going, and we do not take a single one for granted.',
        'You will see exactly what your support makes possible in our updates. If you ever have questions about where the money goes, just reply to this email.',
        'With real gratitude,',
      ]),
      {
        kind: 'create_task',
        config: { task_title: 'Send a personal thank-you note to this donor' },
        delay_days: 0,
        delay_unit: 'days',
        subject: null,
        preview_text: null,
        html_content: null,
        plain_text_content: null,
      },
    ],
  },
  {
    id: 'volunteer-follow-up',
    icon: 'add-volunteer',
    title: 'Follow up after a shift',
    description: 'Thank volunteers who showed up, then invite them to their next shift two days later.',
    name: 'Volunteer follow-up',
    trigger_type: 'volunteer_shift_status',
    trigger_event_id: 'attended',
    steps: [
      emailStep('Thanks for showing up, {{first_name}}!', [
        'Hi {{first_name}},',
        'Thank you for volunteering with us today. Work like this only happens because people give their actual time, and you did.',
        'Rest up; we will be in touch soon with what is next.',
      ]),
      waitStep(2),
      emailStep('Your next shift is waiting', [
        'Hi {{first_name}},',
        'Still riding the momentum? We have more shifts coming up and a spot with your name on it.',
        'Reply to this email or check the volunteer page to grab a time that works for you.',
      ]),
    ],
  },
  {
    id: 'reengage-lapsed',
    icon: 'file-calendar',
    title: 'Re-engage quiet supporters',
    description:
      'When someone has not opened anything in 90 days: a check-in, then a catch-up only if the check-in also went unopened. The sequence ends the moment they engage.',
    name: 'Re-engage lapsed supporters',
    trigger_type: 'supporter_lapsed',
    trigger_event_id: '90',
    // The goal is re-engagement, so any open or click ends the sequence early.
    exit_conditions: ['opened_any_email', 'clicked_any_email'],
    steps: [
      emailStep('We miss you, {{first_name}}', [
        'Hi {{first_name}},',
        'It has been a while since we have seen you open one of our updates, and we wanted to check in. No guilt; inboxes are a lot.',
        'If you would rather hear from us less often, just reply and say so. If you want to stay in the loop, you do not need to do anything at all.',
      ]),
      waitStep(5),
      emailStep(
        'Here is what you have missed',
        [
          'Hi {{first_name}},',
          'A quick catch-up on what has been happening: new volunteers, new wins, and a few things we could use your help with.',
          'If any of it speaks to you, reply and tell us. We would love to have you back in the mix.',
        ],
        'previous_not_opened',
      ),
      {
        kind: 'notify_team',
        config: { notify_message: 'A lapsed supporter finished the re-engagement sequence. Worth a personal touch?' },
        delay_days: 0,
        delay_unit: 'days',
        subject: null,
        preview_text: null,
        html_content: null,
        plain_text_content: null,
      },
    ],
  },
] as const;
