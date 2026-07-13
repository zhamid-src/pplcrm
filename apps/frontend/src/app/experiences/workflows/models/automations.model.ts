import type { PcIconNameType } from '@icons/icons.index';
import type { WorkflowStepKind, WorkflowTriggerType } from '@common';
import type { QueryBuilderGroupNode, QueryBuilderRuleNode } from '@common';

// Spec §16 — the twelve trigger cards of the picker, in the spec's order. Copy (title +
// description) is lifted to match the spec; the three shown verbatim in the mockup are marked.
export interface TriggerCardMeta {
  type: WorkflowTriggerType;
  icon: PcIconNameType;
  title: string;
  description: string;
}

export const TRIGGER_CARDS: readonly TriggerCardMeta[] = [
  {
    type: 'manual',
    icon: 'user-plus',
    title: 'Manual enrollment',
    // Verbatim (mockup).
    description: 'Runs only when you enroll someone yourself (from the grid, a person page or another automation).',
  },
  {
    type: 'web_form_submitted',
    icon: 'add-form',
    title: 'Form submitted',
    // Verbatim (mockup).
    description: 'Runs when a public form comes in: signups, petitions, requests.',
  },
  {
    type: 'contact_created',
    icon: 'add-users',
    title: 'Person created',
    // Verbatim (mockup).
    description: 'A welcome series for every new contact, however they arrive: form, import or manual add.',
  },
  {
    type: 'tag_added',
    icon: 'add-label',
    title: 'Tag added',
    description: 'Runs the moment a specific tag lands on a contact.',
  },
  {
    type: 'list_joined',
    icon: 'add-list',
    title: 'List joined',
    description: 'Runs when a contact is added to a static list.',
  },
  {
    type: 'donation_recorded',
    icon: 'add-fundraising',
    title: 'Donation recorded',
    description: 'Runs when a gift is recorded (one-time or the first of a recurring plan).',
  },
  {
    type: 'payment_event',
    icon: 'credit-card',
    title: 'Billing / payment event',
    description: 'Runs on a Stripe webhook: a payment, a failure, a subscription change.',
  },
  {
    type: 'volunteer_shift_status',
    icon: 'add-volunteer',
    title: 'Volunteer shift status',
    description: 'Runs when a volunteer shift changes: signed up, attended or no-show.',
  },
  {
    type: 'task_sla_breach',
    icon: 'exclamation-triangle',
    title: 'Task breaches SLA',
    description: 'Runs when a task passes its response deadline without being handled.',
  },
  {
    type: 'new_subscriber',
    icon: 'add-newsletter',
    title: 'New subscriber',
    description: 'Runs when someone opts in to your newsletter.',
  },
  {
    type: 'new_unsubscriber',
    icon: 'x-circle',
    title: 'New unsubscriber',
    description: 'Runs when someone opts out (a win-back or a quiet goodbye).',
  },
  {
    type: 'date_arrives',
    icon: 'file-calendar',
    title: 'Date arrives',
    description: 'Runs when a date on the contact comes around: a renewal, a birthday, an anniversary.',
  },
] as const;

// Spec §16 sequence editor — the five options of the ADD A STEP menu, each with a hint line.
export interface StepKindMeta {
  kind: WorkflowStepKind;
  icon: PcIconNameType;
  label: string;
  hint: string;
}

export const STEP_KINDS: readonly StepKindMeta[] = [
  { kind: 'wait', icon: 'arrow-path', label: 'Wait', hint: 'Pause the sequence for a set time.' },
  { kind: 'send_email', icon: 'paper-airplane', label: 'Send email', hint: 'Send a one-off email to the contact.' },
  { kind: 'add_tag', icon: 'add-label', label: 'Add tag', hint: 'Label the contact for segmenting.' },
  { kind: 'create_task', icon: 'add-task', label: 'Create task', hint: 'Give a teammate something to do.' },
  { kind: 'notify_team', icon: 'user-group', label: 'Notify team', hint: 'Alert a teammate in-app.' },
] as const;

const FALLBACK_STEP_KIND: StepKindMeta = {
  kind: 'wait',
  icon: 'arrow-path',
  label: 'Wait',
  hint: 'Pause the sequence for a set time.',
};

export function stepKindMeta(kind: WorkflowStepKind): StepKindMeta {
  return STEP_KINDS.find((s) => s.kind === kind) ?? FALLBACK_STEP_KIND;
}

export function triggerCardMeta(type: WorkflowTriggerType | string): TriggerCardMeta | undefined {
  return TRIGGER_CARDS.find((t) => t.type === type);
}

// Per-kind value payload, mirroring the backend WorkflowStepConfigObj.
export interface StepConfig {
  tag_id?: string | null;
  tag_name?: string | null;
  task_title?: string | null;
  notify_user_id?: string | null;
  notify_user_name?: string | null;
  notify_message?: string | null;
}

// A step in the editor. `uid` is a client-only stable key for @for tracking (not persisted).
export interface SequenceStep {
  uid: string;
  kind: WorkflowStepKind;
  config: StepConfig;
  delay_days: number;
  delay_unit: 'days' | 'hours';
  subject: string | null;
  preview_text: string | null;
  html_content: string | null;
  plain_text_content: string | null;
}

// Wire shape sent to saveSteps (drops the client-only uid).
export interface SequenceStepPayload {
  kind: WorkflowStepKind;
  config: StepConfig | null;
  delay_days: number;
  delay_unit: 'days' | 'hours';
  subject: string | null;
  preview_text: string | null;
  html_content: string | null;
  plain_text_content: string | null;
}

let uidCounter = 0;
export function newUid(): string {
  uidCounter += 1;
  return `step-${uidCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

// A step as seen by the recipe builder — config arrives untyped (jsonb) from the list endpoint.
export interface RecipeStep {
  kind: WorkflowStepKind;
  config?: unknown;
  delay_days?: number;
  delay_unit?: string;
  subject?: string | null;
}

function readConfig(config: unknown): StepConfig {
  return config != null && typeof config === 'object' ? (config as StepConfig) : {};
}

// One-line human summary of a single step, used on step cards and in the recipe sentence.
export function stepSummary(step: RecipeStep): string {
  const config = readConfig(step.config);
  switch (step.kind) {
    case 'wait': {
      const n = step.delay_days ?? 0;
      const unit = step.delay_unit === 'hours' ? 'hour' : 'day';
      return `wait ${n} ${unit}${n === 1 ? '' : 's'}`;
    }
    case 'send_email':
      return step.subject ? `send email ${step.subject}` : 'send email';
    case 'add_tag':
      return config.tag_name ? `add tag ${config.tag_name}` : 'add tag';
    case 'create_task':
      return config.task_title ? `create task ${config.task_title}` : 'create task';
    case 'notify_team':
      return config.notify_user_name ? `notify ${config.notify_user_name}` : 'notify team';
    default: {
      const _exhaustive: never = step.kind;
      return String(_exhaustive);
    }
  }
}

// Spec §16 list — the one-line recipe sentence, e.g.
// "When form submitted · If form is volunteer signup → add tag volunteer · add to list Volunteers".
export function buildRecipeSentence(
  triggerType: WorkflowTriggerType | string,
  steps: readonly RecipeStep[],
  conditions?: QueryBuilderGroupNode | null,
): string {
  const trigger = triggerCardMeta(triggerType);
  const triggerLabel = trigger ? trigger.title.toLowerCase() : String(triggerType).replace(/_/g, ' ');
  const parts: string[] = [`When ${triggerLabel}`];

  const condText = summarizeConditions(conditions);
  if (condText) parts.push(condText);

  if (steps.length === 0) {
    return `${parts.join(' · ')} → no steps yet`;
  }
  const stepText = steps.map((s) => stepSummary(s)).join(' · ');
  return `${parts.join(' · ')} → ${stepText}`;
}

function summarizeConditions(conditions?: QueryBuilderGroupNode | null): string | null {
  if (!conditions || !Array.isArray(conditions.rules) || conditions.rules.length === 0) return null;
  const rules = conditions.rules
    .filter((r): r is QueryBuilderRuleNode => r.kind === 'rule')
    .map((r) => `${r.field.replace(/_/g, ' ')} ${r.op.replace(/_/g, ' ')} ${r.value ?? ''}`.trim());
  if (rules.length === 0) return null;
  const joiner = conditions.conjunction === 'OR' ? ' or ' : ' and ';
  return `If ${rules.join(joiner)}`;
}
