import { z } from 'zod';

import { idSchema, nameSchema, notesSchema } from './core.schema';

/**
 * Canvassing §13 schemas. The turf/knock status vocabularies are `as const` so
 * they drive both Zod validation and exhaustive discriminated-union switches on
 * the frontend and in the controller.
 */

/** Stored turf lifecycle. Display state ("In field now") is derived from knocks. */
export const TURF_STATUSES = ['draft', 'active', 'retired'] as const;
export type TurfStatus = (typeof TURF_STATUSES)[number];

/** What happened at the door. "attempted" = any knock; "conversation" = a talk. */
export const KNOCK_OUTCOMES = ['conversation', 'no_answer', 'not_home', 'refused', 'inaccessible'] as const;
export type KnockOutcome = (typeof KNOCK_OUTCOMES)[number];

/** The voter's stance, when a conversation happened ("what voters said"). */
export const KNOCK_RESPONSES = ['strong_support', 'lean_support', 'undecided', 'opposed'] as const;
export type KnockResponse = (typeof KNOCK_RESPONSES)[number];

/** Doors-per-turf presets from the Cut-new-turfs dialog. */
export const DOORS_PER_TURF_PRESETS = [30, 40, 50, 60] as const;

export const turfStatusSchema = z.enum(TURF_STATUSES);
export const knockOutcomeSchema = z.enum(KNOCK_OUTCOMES);
export const knockResponseSchema = z.enum(KNOCK_RESPONSES);

export const AddTurfObj = z.object({
  /** Campaigns §15 — the context this turf is knocked for; backend defaults to the office. */
  campaign_id: idSchema.optional(),
  name: nameSchema('Name', 120),
  list_id: idSchema.nullable().optional(),
  notes: notesSchema,
});

export const UpdateTurfObj = z.object({
  name: nameSchema('Name', 120).optional(),
  status: turfStatusSchema.optional(),
  notes: notesSchema,
});

/** Preview and Cut share this input; preview never writes. */
export const CutTurfsObj = z.object({
  list_id: idSchema,
  doors_per_turf: z.number().int().min(5).max(500),
});

export const AssignTurfObj = z.object({
  turf_id: idSchema,
  team_id: idSchema.nullable().optional(),
});

export const FieldReportRangeObj = z.object({
  range: z.enum(['today', 'yesterday', 'week', 'month', 'campaign', 'custom']).default('week'),
  from: z.string().datetime().nullable().optional(),
  to: z.string().datetime().nullable().optional(),
});

/**
 * Companion knock payload. Arrives over the tokenised public route (no account),
 * so the token authorises the turf and `client_knock_id` de-dupes offline
 * re-sends. Parsed from `unknown` at the REST boundary.
 */
export const LogKnockObj = z.object({
  token: z.string().min(10).max(200),
  client_knock_id: z.string().min(1).max(200),
  household_id: idSchema,
  person_id: idSchema.nullable().optional(),
  outcome: knockOutcomeSchema,
  response: knockResponseSchema.nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  canvasser_name: z.string().trim().max(120).nullable().optional(),
  knocked_at: z.string().datetime().nullable().optional(),
});

export function isTurfStatus(v: unknown): v is TurfStatus {
  return typeof v === 'string' && (TURF_STATUSES as readonly string[]).includes(v);
}

export function isKnockOutcome(v: unknown): v is KnockOutcome {
  return typeof v === 'string' && (KNOCK_OUTCOMES as readonly string[]).includes(v);
}
