import { z } from 'zod';

/**
 * Interaction types a user can log by hand from a record page ("Log an
 * interaction"). These are stored in `user_activity.activity` alongside the
 * auto-generated audit types (create/update/…); they are the human-authored
 * subset. Keep in sync with the `UserActivityType` union in
 * `apps/backend/src/app/lib/user-activity.repo.ts`.
 */
export const INTERACTION_TYPES = ['call', 'door_knock', 'note', 'meeting'] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  call: 'Call',
  door_knock: 'Door knock',
  note: 'Email / note',
  meeting: 'Meeting',
};

export const interactionTypeSchema = z.enum(INTERACTION_TYPES);

/** Longest note we accept for a logged interaction. */
export const INTERACTION_NOTE_MAX = 2000;

/**
 * Payload for the `activity.logInteraction` mutation. `entity` is the DB table
 * name the record lives in (`persons` / `households` / `companies`), `entityId`
 * the record id. `note` is optional free text; `occurredAt` lets the user
 * back-date the interaction (defaults to now server-side).
 */
export const LogInteractionObj = z.object({
  entity: z.string().min(1),
  entityId: z.string().min(1),
  type: interactionTypeSchema,
  note: z.string().trim().max(INTERACTION_NOTE_MAX).optional(),
  occurredAt: z.coerce.date().optional(),
});

export type LogInteractionType = z.infer<typeof LogInteractionObj>;
