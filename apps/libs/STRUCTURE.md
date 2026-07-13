This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.

# File Summary

## Purpose

This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format

The content is organized as follows:

1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
   a. A header with the file path (## File: path/to/file)
   b. The full contents of the file in a code block

## Usage Guidelines

- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes

- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: libs/**/\*, apps/**/_, scriptis/\*\*/_, libs/common/src/**/\*, libs/uxcommon/src/**/\*
- Files matching these patterns are excluded: **/\*.test.ts, **/_.spec.ts, **/dist/**, **/build/**, **/node_modules/**, **/.git/**, **/package-lock.json, **/yarn.lock, \*\*/_.picture, **/\*.png, **/_.jpg, \*\*/_.jpeg, **/\*.svg, **/_.ico, apps/**, **/STRUCTURE.md, \*\*/_.spec.ts
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure

```
libs/
  common/
    src/
      lib/
        schemas/
          activity.schema.ts
          auth.schema.ts
          campaigns.schema.ts
          canvassing.schema.ts
          companies.schema.ts
          companion-access.schema.ts
          connections.schema.ts
          core.schema.ts
          deliveries.schema.ts
          donations.schema.ts
          emails.schema.ts
          events.schema.ts
          lists.schema.ts
          marketing.schema.ts
          persons.schema.ts
          settings.schema.ts
          tags.schema.ts
          tasks.schema.ts
          teams.schema.ts
          volunteer.schema.ts
          web-forms.schema.ts
          workflows.schema.ts
        auth.ts
        emails.ts
        jsend.ts
        kysely.models.ts
        models.ts
        public-id.ts
        schema.ts
        sla.ts
        utils.ts
      index.ts
    eslint.config.cjs
    project.json
    tsconfig.json
    tsconfig.lib.json
    vite.config.ts
  uxcommon/
    src/
      components/
        address-autocomplete/
          address-autocomplete.ts
          googlePlacesAddressMapper.ts
        address-form-group/
          address-form-group.ts
        alerts/
          alert-service.ts
          alerts.html
          alerts.ts
        autocomplete/
          autocomplete.ts
        breadcrumbs/
          breadcrumbs.service.ts
          breadcrumbs.ts
        card/
          card.ts
        csv-import/
          csv.worker.ts
          persons-field-mapping.ts
        detail-header/
          detail-header.ts
        detail-item/
          detail-item.ts
        detail-layout/
          detail-layout.ts
        detail-row/
          detail-row.ts
        empty-state/
          empty-state.ts
        entity-overview/
          entity-overview.ts
        fields-selector/
          fields-selector.html
          fields-selector.ts
        form-actions/
          form-actions.html
          form-actions.ts
        geocode-chip/
          geocode-chip.ts
        grid-header/
          grid-header.ts
        icons/
          attachment-icon.ts
          icon.ts
          icons.index.ts
        input/
          input.ts
        map/
          map-types.ts
          map.ts
        modal-shell/
          modal-shell.ts
        not-found/
          not-found.ts
        profile-card/
          profile-card.ts
        public-link-panel/
          public-link-panel.html
          public-link-panel.ts
        select/
          select.ts
        side-drawer/
          side-drawer.ts
        stat-card/
          stat-card.ts
        status-badge/
          status-badge.ts
        swap/
          swap.ts
        system-metadata/
          system-metadata.ts
        table/
          table.ts
        tabs/
          tabs.ts
        tags/
          tagitem.css
          tagitem.ts
        textarea/
          textarea.ts
        toggle/
          toggle.ts
        user-avatar/
          user-avatar.ts
        confirm-dialog-host.html
        confirm-dialog-host.ts
        confirm-dialog.service.ts
      directives/
        animate-if.directive.ts
        spin-on-click.directive.ts
      mentions/
        mention-controller.ts
      pipes/
        file-icon.pipe.ts
        file-icon.util.ts
        filesize.pipe.ts
        mention.pipe.ts
        sanitize-html.pipe.ts
        svg-html-pipe.ts
        timeago.pipe.ts
      styles/
        themes.css
      index.ts
      loading-gate.ts
      request-guard.ts
      test-setup.ts
    eslint.config.cjs
    project.json
    README.md
    tsconfig.json
    tsconfig.lib.json
    tsconfig.spec.json
    vite.config.mts
```

# Files

## File: libs/common/src/lib/schemas/activity.schema.ts

```typescript
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
```

## File: libs/common/src/lib/schemas/auth.schema.ts

```typescript
import { z } from 'zod';
import { emailSchema, nameSchema } from './core.schema';

export const InviteAuthUserObj = z.object({
  email: emailSchema,
  first_name: nameSchema('First name'),
  last_name: nameSchema('Last name').nullable().optional(),
  role: z.string().max(100).nullable().optional(),
});

export const NotificationPreferencesObj = z.object({
  mention_in_comment: z.boolean().default(true),
  mention_in_comment_in_app: z.boolean().default(true),
  task_assigned: z.boolean().default(true),
  task_assigned_in_app: z.boolean().default(true),
  task_due: z.boolean().default(true),
  task_due_in_app: z.boolean().default(true),
  person_assigned: z.boolean().default(true),
  person_assigned_in_app: z.boolean().default(true),
  export_ready: z.boolean().default(true),
  export_ready_in_app: z.boolean().default(true),
  import_summary: z.boolean().default(true),
  import_summary_in_app: z.boolean().default(true),
});

/**
 * Shape of the profiles.preferences jsonb column (formerly the untyped
 * profiles.json grab-bag). Only `notifications` is written today; unknown
 * keys from older rows are preserved rather than rejected.
 */
export const ProfilePreferencesObj = z
  .object({
    notifications: NotificationPreferencesObj.partial().optional(),
    /** Campaigns §15 — the context (campaign id) this user is working in; per-user, cross-device. */
    active_campaign_id: z.string().optional(),
  })
  .catchall(z.unknown());

export const UpdateAuthUserObj = z.object({
  email: emailSchema.optional(),
  first_name: nameSchema('First name').optional(),
  last_name: nameSchema('Last name').nullable().optional(),
  role: z.string().max(100).nullable().optional(),
  verified: z.boolean().optional(),
  two_factor_enabled: z.boolean().optional(),
  notification_preferences: NotificationPreferencesObj.optional(),
});

export const Verify2FAObj = z.object({
  email: emailSchema,
  code: z.string().length(6),
  rememberMe: z.boolean().optional(),
});
```

## File: libs/common/src/lib/schemas/campaigns.schema.ts

```typescript
import { z } from 'zod';
import { descriptionSchema, idSchema, nameSchema, notesSchema } from './core.schema';

/**
 * Campaigns §15 — a campaign is a *context*: the permanent constituency office
 * ('office') or a time-bounded election run ('election'). Several can be active at
 * once; users pick the one they're working in via the header switcher. Archived
 * campaigns are read-only history.
 */
export const CAMPAIGN_KINDS = ['office', 'election'] as const;
export type CampaignKind = (typeof CAMPAIGN_KINDS)[number];

export const CAMPAIGN_STATUSES = ['active', 'archived'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** Plain calendar date (campaigns.startdate/enddate are Postgres `date` columns). */
const campaignDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .nullable()
  .optional();

export const AddCampaignObj = z.object({
  name: nameSchema('Name', 100),
  description: descriptionSchema(1000),
  notes: notesSchema,
  kind: z.enum(CAMPAIGN_KINDS).default('election'),
  startdate: campaignDateSchema,
  enddate: campaignDateSchema,
});

export const UpdateCampaignObj = z.object({
  name: nameSchema('Name', 100).optional(),
  description: descriptionSchema(1000),
  notes: notesSchema,
  startdate: campaignDateSchema,
  enddate: campaignDateSchema,
});

/**
 * Campaign-scoped person facts (Campaigns §15) — structured concepts, not tags.
 * One row per (campaign, person); a missing row / NULL field is "Unknown".
 * UI copy: Neutral = engaged but indifferent; Undecided = engaged, hasn't
 * decided; Unknown = never asked.
 */
export const SUPPORT_LEVELS = ['strong', 'leaning', 'neutral', 'leaning_against', 'against', 'undecided'] as const;
export type SupportLevel = (typeof SUPPORT_LEVELS)[number];

export const SUPPORT_LEVEL_LABELS: Record<SupportLevel, string> = {
  strong: 'Strong',
  leaning: 'Leaning',
  neutral: 'Neutral',
  leaning_against: 'Leaning against',
  against: 'Against',
  undecided: 'Undecided',
};

/** GOTV voting status. Advance voters are struck from later call/knock lists. */
export const VOTING_STATUSES = ['will_vote', 'voted_advance', 'voted_eday', 'not_voting', 'ineligible'] as const;
export type VotingStatus = (typeof VOTING_STATUSES)[number];

export const VOTING_STATUS_LABELS: Record<VotingStatus, string> = {
  will_vote: 'Will vote',
  voted_advance: 'Voted — advance',
  voted_eday: 'Voted — election day',
  not_voting: 'Not voting',
  ineligible: 'Ineligible',
};

export const FACT_SOURCES = ['manual', 'canvass', 'form', 'import', 'carryover'] as const;
export type FactSource = (typeof FACT_SOURCES)[number];

/** Upsert one person's facts in one campaign. Omitted field = leave unchanged; explicit null = back to Unknown. */
export const UpsertCampaignPersonFactObj = z.object({
  campaign_id: idSchema,
  person_id: idSchema,
  support_level: z.enum(SUPPORT_LEVELS).nullable().optional(),
  voting_status: z.enum(VOTING_STATUSES).nullable().optional(),
});

/**
 * Per-campaign email consent (§15, layer 1 of 3). 'pending' is double opt-in
 * awaiting confirmation. Layers 2 & 3 (address suppressions, person DNC) are
 * global and live elsewhere; sendable = subscribed ∧ not suppressed ∧ not DNC.
 */
export const SUBSCRIPTION_STATUSES = ['subscribed', 'pending', 'unsubscribed'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const CONSENT_SOURCES = ['form', 'import', 'manual', 'copied'] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

/** Staff-set subscription change; 'pending' is machine-only (double opt-in flow). */
export const SetCampaignSubscriptionObj = z.object({
  campaign_id: idSchema,
  person_id: idSchema,
  status: z.enum(['subscribed', 'unsubscribed']),
});

/**
 * Carry-over (§15): seed a campaign from a prior one. Support levels copy as a
 * starting assumption (source='carryover'); voting status NEVER copies (it is
 * election-specific by definition); subscriptions copy only when the caller has
 * explicitly confirmed the compliance warning (consent_source='copied',
 * original consent_at preserved).
 */
export const CarryOverCampaignObj = z.object({
  source_campaign_id: idSchema,
  target_campaign_id: idSchema,
  copy_support: z.boolean().default(true),
  copy_subscriptions: z.boolean().default(false),
});
```

## File: libs/common/src/lib/schemas/companies.schema.ts

```typescript
import { z } from 'zod';

/**
 * Shape of the companies.enrichment jsonb column (formerly the untyped
 * companies.json grab-bag) — the Google Places enrichment payload.
 * `place_details` is the raw Places API result and deliberately unmodeled.
 */
export const CompanyEnrichmentObj = z
  .object({
    google_enriched: z.boolean().optional(),
    place_details: z.unknown().optional(),
  })
  .catchall(z.unknown());

export const CompanyInputObj = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().trim().max(1000).optional().nullable(),
  website: z.string().trim().max(255).optional().nullable().or(z.literal('')),
  email: z.string().trim().max(255).optional().nullable().or(z.literal('')),
  phone: z.string().trim().max(50).optional().nullable(),
  industry: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(10000).optional().nullable(),
});
```

## File: libs/common/src/lib/schemas/connections.schema.ts

```typescript
import { z } from 'zod';
import { idSchema, notesSchema } from './core.schema';

export const RELATION_TYPES = [
  'referred_by',
  'referred_to',
  'close_friend',
  'family_member',
  'spouse',
  'colleague',
  'org_affiliation',
  'introduced_by',
  'introduced_to',
  'custom',
] as const;

export const RELATION_TYPE_LABELS: Record<(typeof RELATION_TYPES)[number], string> = {
  referred_by: 'Referred By',
  referred_to: 'Referred To',
  close_friend: 'Close Friend',
  family_member: 'Family Member',
  spouse: 'Spouse / Partner',
  colleague: 'Colleague',
  org_affiliation: 'Org. Affiliation',
  introduced_by: 'Introduced By',
  introduced_to: 'Introduced To',
  custom: 'Custom',
};

export const relationTypeSchema = z.enum(RELATION_TYPES);
export type RelationTypeSchema = z.infer<typeof relationTypeSchema>;

export const AddConnectionObj = z.object({
  to_person_id: idSchema,
  relation_type: relationTypeSchema,
  custom_label: z.string().trim().min(1).max(100).nullable().optional(),
  is_mutual: z.boolean().default(false).optional(),
  notes: notesSchema,
});

export type AddConnectionType = z.infer<typeof AddConnectionObj>;
```

## File: libs/common/src/lib/schemas/core.schema.ts

```typescript
import { z } from 'zod';

export const sortModelItem = z.object({
  colId: z.string(),
  sort: z.enum(['asc', 'desc']),
});

export interface QueryBuilderRuleNode {
  kind: 'rule';
  id: string;
  field: string;
  op: string;
  value?: any;
}

export interface QueryBuilderGroupNode {
  kind: 'group';
  id: string;
  conjunction: 'AND' | 'OR';
  rules: QueryBuilderNode[];
}

export type QueryBuilderNode = QueryBuilderRuleNode | QueryBuilderGroupNode;

export function cloneQueryBuilderNode(node: QueryBuilderNode): QueryBuilderNode {
  if (node.kind === 'rule') {
    return { ...node };
  } else {
    return {
      ...node,
      rules: node.rules.map(cloneQueryBuilderNode),
    };
  }
}

export const queryBuilderNodeSchema: z.ZodType<QueryBuilderNode> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('rule'),
      id: z.string(),
      field: z.string(),
      op: z.string(),
      value: z.unknown().optional(),
    }),
    z.object({
      kind: z.literal('group'),
      id: z.string(),
      conjunction: z.enum(['AND', 'OR']),
      rules: z.array(queryBuilderNodeSchema),
    }),
  ]),
);

export const oldAdvancedFilterModelSchema = z.object({
  conjunction: z.enum(['AND', 'OR']),
  rules: z.array(
    z.object({
      field: z.string(),
      op: z.string(),
      value: z.unknown(),
    }),
  ),
});

export const getAllOptions = z
  .object({
    searchStr: z.string().optional(),
    startRow: z.number().optional(),
    endRow: z.number().optional(),
    sortModel: z.array(sortModelItem).optional(),
    filterModel: z.record(z.string(), z.unknown()).optional(),
    includeArchived: z.boolean().optional(),
    columns: z.array(z.string()).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
    orderBy: z.array(z.string()).optional(),
    groupBy: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    issues: z.array(z.string()).optional(),
    type: z.enum(['tag', 'issue']).optional(),
    userId: z.string().optional(),
    entity: z.string().optional(),
    activity: z.string().optional(),
    advancedFilterModel: queryBuilderNodeSchema.or(oldAdvancedFilterModelSchema).optional(),
    listId: z.string().optional(),
    /** Campaigns §15 — the active context; scopes campaign-specific columns/rows (e.g. support level). */
    campaignId: z.string().optional(),
  })
  .optional();

export const exportCsvInput = z
  .object({
    options: getAllOptions,
    columns: z.array(z.string()).optional(),
    fileName: z.string().optional(),
  })
  .optional();

export const exportCsvResponse = z.union([
  z.object({
    status: z.literal('processing'),
  }),
  z.object({
    csv: z.string(),
    fileName: z.string(),
    columns: z.array(z.string()),
    rowCount: z.number(),
    status: z.literal('completed').optional(),
  }),
]);

export const exportEntitySchema = z.enum([
  'persons',
  'households',
  'companies',
  'tags',
  'issues',
  'tasks',
  'lists',
  'newsletters',
  'teams',
  'users',
  'volunteer',
  'forms',
  'workflows',
]);

export const queueExportInput = z.object({
  entity: exportEntitySchema,
  options: getAllOptions,
  columns: z.array(z.string()).optional(),
  fileName: z.string().optional(),
});

/** Logs an export that already downloaded straight to the browser (small/displayed-rows path)
 * so it still shows up in the Exports history — see pplcrm-datagrid. No file is stored server-side,
 * so the resulting record is not re-downloadable. */
export const logInstantExportInput = z.object({
  entity: exportEntitySchema,
  fileName: z.string(),
  rowCount: z.number().int().nonnegative(),
});

export const dataExportRecord = z.object({
  id: z.string(),
  entity: z.string(),
  file_name: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  row_count: z.number().nullable(),
  error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  downloadable: z.boolean(),
  createdBy: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
    })
    .nullable()
    .optional(),
});

export const dbIdSchema = z.string().regex(/^\d+$/, 'Invalid ID format');
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const idSchema = dbIdSchema;

export const addressSchema = z.object({
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  formatted_address: z.string().trim().max(500, 'Address is too long').nullable().optional(),
  type: z.string().trim().max(50, 'Type is too long').nullable().optional(),
  apt: z.string().trim().max(30, 'Apt is too long').nullable().optional(),
  street_num: z.string().trim().max(30, 'Street number is too long').nullable().optional(),
  street1: z.string().trim().max(150, 'Street 1 is too long').nullable().optional(),
  street2: z.string().trim().max(150, 'Street 2 is too long').nullable().optional(),
  city: z.string().trim().max(100, 'City is too long').nullable().optional(),
  state: z.string().trim().max(100, 'State is too long').nullable().optional(),
  zip: z.string().trim().max(20, 'Zip is too long').nullable().optional(),
  country: z.string().trim().max(100, 'Country is too long').nullable().optional(),
});

export const nameSchema = (fieldName: string, maxLen = 100) =>
  z.string().trim().min(1, `${fieldName} is required`).max(maxLen, `${fieldName} is too long`);

export const descriptionSchema = (maxLen = 1000) =>
  z.string().trim().max(maxLen, 'Description is too long').nullable().optional();

export const emailSchema = z.string().trim().max(320, 'Email is too long').email('Invalid email address');

export const nullableEmailSchema = emailSchema.or(z.literal('')).nullable().optional();
export const phoneSchema = (fieldName: string) =>
  z.string().trim().max(30, `${fieldName} is too long`).nullable().optional();

export const notesSchema = z.string().trim().max(10000, 'Notes are too long').nullable().optional();
```

## File: libs/common/src/lib/schemas/deliveries.schema.ts

```typescript
import { z } from 'zod';

import { idSchema, notesSchema } from './core.schema';

// Deliveries (spec §14). Enums mirror the binding spec (docs/spec/Deliveries Spec.dc.html §2) —
// the spec's strings win, including the American spelling "canceled" for route status.
export const DELIVERY_REQUEST_STATUSES = ['new', 'approved', 'declined', 'delivered'] as const;
export const DELIVERY_ROUTE_STATUSES = ['draft', 'assigned', 'in_progress', 'completed', 'canceled'] as const;
export const DELIVERY_STOP_STATUSES = ['pending', 'delivered', 'skipped'] as const;
export const DELIVERY_SOURCES = ['web_form', 'manual'] as const;

// The four failure reasons a volunteer can pick (spec §4.4). "Skip for now" (defer) is NOT a
// reason — it keeps the stop pending and moves it to the end of the route.
export const DELIVERY_SKIP_REASONS = ['No safe spot', 'Wrong address', 'Resident declined', 'Other'] as const;

export type DeliveryRequestStatus = (typeof DELIVERY_REQUEST_STATUSES)[number];

/** Display labels for a request's standing on person/household pages ('new' reads as "Requested"). */
export const DELIVERY_REQUEST_STATUS_LABELS: Record<DeliveryRequestStatus, string> = {
  new: 'Requested',
  approved: 'Approved',
  declined: 'Declined',
  delivered: 'Delivered',
};
export type DeliveryRouteStatus = (typeof DELIVERY_ROUTE_STATUSES)[number];
export type DeliveryStopStatus = (typeof DELIVERY_STOP_STATUSES)[number];
export type DeliverySource = (typeof DELIVERY_SOURCES)[number];
export type DeliverySkipReason = (typeof DELIVERY_SKIP_REASONS)[number];

// ---- Requests --------------------------------------------------------------
export const AddDeliveryRequestObj = z.object({
  /** Campaigns §15 — the context this yard-sign request belongs to; backend defaults to the office. */
  campaign_id: idSchema.optional(),
  household_id: idSchema,
  person_id: idSchema.or(z.literal('')).nullable().optional(),
  notes: notesSchema,
});

export const UpdateDeliveryRequestObj = z.object({
  notes: notesSchema,
});

// Bulk approve/decline from the selection bar (spec §4.1), plus the manual standing flips from the
// household/person "Yard sign" control — 'delivered' covers signs installed without the app.
export const SetDeliveryRequestStatusObj = z.object({
  ids: z.array(idSchema).min(1, 'Select at least one request'),
  status: z.enum(DELIVERY_REQUEST_STATUSES),
});

// The yard-sign standing lookup for one household in one campaign context.
export const GetSignStatusObj = z.object({
  household_id: idSchema,
  campaign_id: idSchema,
});

// ---- Planning --------------------------------------------------------------
// Advanced params default to the spec's inline summary (60 min/driver · 5 min/stop · 30 km/h · no
// return trip). Preview is pure — it writes nothing.
export const PlanDeliveriesObj = z.object({
  start_address: z.string().trim().min(1, 'Start address is required').max(500, 'Address is too long'),
  drivers: z.number().int().min(1).max(50).nullable().optional(),
  service_minutes: z.number().min(0).max(60).nullable().optional(),
  avg_speed_kmh: z.number().min(1).max(120).nullable().optional(),
  include_return_leg: z.boolean().nullable().optional(),
});

export const CommitDeliveriesObj = PlanDeliveriesObj.extend({
  routes: z
    .array(
      z.object({
        request_ids: z.array(idSchema).min(1, 'A route needs at least one stop'),
      }),
    )
    .min(1, 'Nothing to commit'),
});

// ---- Routes ----------------------------------------------------------------
export const UpdateDeliveryRouteObj = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150, 'Name is too long').optional(),
  scheduled_for: z.string().datetime().nullable().optional(),
});

export const AssignVolunteerObj = z.object({
  route_id: idSchema,
  person_id: idSchema.nullable(),
});

export const SetDeliveryRouteStatusObj = z.object({
  route_id: idSchema,
  status: z.enum(['in_progress', 'completed', 'canceled']),
});

export const ReorderStopObj = z.object({
  route_id: idSchema,
  stop_id: idSchema,
  direction: z.enum(['up', 'down']),
});

// Staff act on a stop from the route detail page. Same transitions as the public path.
export const StopActionObj = z.object({
  route_id: idSchema,
  stop_id: idSchema,
  action: z.enum(['deliver', 'skip', 'remove']),
  reason: z.enum(DELIVERY_SKIP_REASONS).nullable().optional(),
});

export const RouteIdObj = z.object({ route_id: idSchema });

export const MintShareLinkObj = z.object({
  route_id: idSchema,
  regenerate: z.boolean().optional(),
});

// ---- Public volunteer path (token is the only credential) ------------------
// defer = "Skip for now": moves the stop to the end and renumbers (stays pending, not a failure).
export const PublicStopActionObj = z.object({
  action: z.enum(['deliver', 'skip', 'defer', 'undo']),
  reason: z.enum(DELIVERY_SKIP_REASONS).nullable().optional(),
});

export type AddDeliveryRequestType = z.infer<typeof AddDeliveryRequestObj>;
export type UpdateDeliveryRequestType = z.infer<typeof UpdateDeliveryRequestObj>;
export type SetDeliveryRequestStatusType = z.infer<typeof SetDeliveryRequestStatusObj>;
export type GetSignStatusType = z.infer<typeof GetSignStatusObj>;
export type PlanDeliveriesType = z.infer<typeof PlanDeliveriesObj>;
export type CommitDeliveriesType = z.infer<typeof CommitDeliveriesObj>;
export type UpdateDeliveryRouteType = z.infer<typeof UpdateDeliveryRouteObj>;
export type AssignVolunteerType = z.infer<typeof AssignVolunteerObj>;
export type SetDeliveryRouteStatusType = z.infer<typeof SetDeliveryRouteStatusObj>;
export type ReorderStopType = z.infer<typeof ReorderStopObj>;
export type StopActionType = z.infer<typeof StopActionObj>;
export type MintShareLinkType = z.infer<typeof MintShareLinkObj>;
export type PublicStopActionType = z.infer<typeof PublicStopActionObj>;
```

## File: libs/common/src/lib/schemas/donations.schema.ts

```typescript
import { z } from 'zod';
import { idSchema } from './core.schema';

/**
 * Offline gift entry (spec §12, Fig. 15 "Record donation" dialog). Distinct from the Stripe
 * checkout path (`createCheckout`/`confirmDonation`) — this is for gifts collected outside the
 * public donation form (cash at a fundraiser, a mailed check, a bank transfer).
 */
export const DONATION_METHODS = ['card', 'check', 'cash', 'bank_transfer'] as const;
export const DONATION_METHOD_LABELS: Record<(typeof DONATION_METHODS)[number], string> = {
  card: 'Card',
  check: 'Check',
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
};

export const donationMethodSchema = z.enum(DONATION_METHODS);
export type DonationMethod = z.infer<typeof donationMethodSchema>;

export const RecordDonationObj = z.object({
  personId: idSchema,
  amountCents: z.number().int().positive('Enter an amount above zero, like 50'),
  method: donationMethodSchema,
  /** Campaigns §15 — which fund this gift belongs to; backend defaults to the office. */
  campaign_id: idSchema.optional(),
});
export type RecordDonationType = z.infer<typeof RecordDonationObj>;
```

## File: libs/common/src/lib/schemas/emails.schema.ts

```typescript
import { z } from 'zod';
import { isRegularFolderId, isSpecialFolderId } from '../emails';

/**
 * The six storable folder ids (Sent/Spam/Trash/Drafts/Outbox/Inbox). The only
 * valid write targets for emails.folder_id — enforced here at the tRPC
 * boundary and by the chk_emails_folder_id CHECK constraint in the DB (there
 * is no email_folders table; folders are code-defined in EMAIL_FOLDERS).
 */
export const regularFolderIdSchema = z.string().refine(isRegularFolderId, 'Unknown folder');

/** Any folder id, including the virtual query-filter folders — valid for reads. */
export const folderIdSchema = z.string().refine((v) => isRegularFolderId(v) || isSpecialFolderId(v), 'Unknown folder');

export const EmailCommentObj = z.object({
  id: z.string(),
  email_id: z.string(),
  author_id: z.string(),
  comment: z.string(),
  created_at: z.date(),
});

export const EmailDraftObj = z.object({
  id: z.string(),
  to_list: z.array(z.string()),
  cc_list: z.array(z.string()),
  bcc_list: z.array(z.string()),
  subject: z.string().optional(),
  body_html: z.string().optional(),
  body_delta: z.unknown().optional(),
  updated_at: z.date(),
});

export const EmailFolderObj = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  sort_order: z.number(),
  is_default: z.boolean(),
  is_virtual: z.boolean(),
});

export const EmailObj = z.object({
  id: z.string(),
  folder_id: z.string(),
  from_email: z.string().optional(),
  from_name: z.string().optional(),
  to_email: z.string().optional(),
  subject: z.string().optional(),
  preview: z.string().optional(),
  assigned_to: z.string().optional(),
  updated_at: z.date(),
  date_sent: z.date().nullable().optional(),
  is_favourite: z.boolean(),
  attachment_count: z.number(),
  has_attachment: z.boolean(),
  status: z.enum(['open', 'closed']).nullable().default('open'),
  is_read: z.boolean().optional(),
  sender_first_name: z.string().nullish(),
  sender_last_name: z.string().nullish(),
});
```

## File: libs/common/src/lib/schemas/events.schema.ts

```typescript
import { z } from 'zod';
import { nameSchema, idSchema, descriptionSchema, notesSchema } from './core.schema';

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(
    /^(?=.*[a-z])[a-z0-9-]+$/,
    'Slug must contain at least one letter and can only contain lowercase letters, numbers, and hyphens',
  );

export const AddEventObj = z.object({
  /** Campaigns §15 — the context this event belongs to; backend defaults to the office. */
  campaign_id: idSchema.optional(),
  name: nameSchema('Event name', 200),
  description: descriptionSchema(2000),
  location_address: z.string().trim().max(500, 'Location address is too long').nullable().optional(),
  start_time: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.date({ error: 'Start date & time is required' }),
  ),
  end_time: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.date({ error: 'End date & time is required' }),
  ),
  capacity: z.number().int().positive().nullable().optional().or(z.literal('')),
  contact_email: z.string().trim().max(255).nullable().optional(),
  contact_phone: z.string().trim().max(50).nullable().optional(),
  slug: slugSchema,
  is_published: z.boolean().default(false).optional(),
  send_reminder: z.boolean().default(true).optional(),
  send_registration_confirmation: z.boolean().default(true).optional(),
  fields: z.array(z.string()).optional(),
});

export const EventObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  location_address: z.string().nullable().optional(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  capacity: z.number().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  slug: z.string(),
  is_published: z.boolean(),
  send_reminder: z.boolean(),
  send_registration_confirmation: z.boolean(),
});

export const UpdateEventObj = z.object({
  name: nameSchema('Event name', 200).optional(),
  description: descriptionSchema(2000),
  location_address: z.string().trim().max(500, 'Location address is too long').nullable().optional(),
  start_time: z
    .preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.date({ error: 'Start date & time is required' }),
    )
    .optional(),
  end_time: z
    .preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.date({ error: 'End date & time is required' }),
    )
    .optional(),
  capacity: z.number().int().positive().nullable().optional().or(z.literal('')),
  contact_email: z.string().trim().max(255).nullable().optional(),
  contact_phone: z.string().trim().max(50).nullable().optional(),
  slug: slugSchema.optional(),
  is_published: z.boolean().optional(),
  send_reminder: z.boolean().optional(),
  send_registration_confirmation: z.boolean().optional(),
  fields: z.array(z.string()).optional(),
});

export const AddTicketTypeObj = z.object({
  event_id: idSchema,
  name: nameSchema('Ticket type name', 100),
  description: descriptionSchema(500),
  price_cents: z.number().int().min(0, 'Price cannot be negative').default(0),
  capacity: z.number().int().positive().nullable().optional(),
  sort_order: z.number().int().min(0).default(0).optional(),
});

export const TicketTypeObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  event_id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  price_cents: z.number(),
  capacity: z.number().nullable().optional(),
  sort_order: z.number(),
});

export const UpdateTicketTypeObj = z.object({
  name: nameSchema('Ticket type name', 100).optional(),
  description: descriptionSchema(500),
  price_cents: z.number().int().min(0, 'Price cannot be negative').optional(),
  capacity: z.number().int().positive().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

const registrationStatusEnum = z.enum(['registered', 'attended', 'no_show', 'cancelled']);

export const AddRegistrationObj = z.object({
  event_id: idSchema,
  person_id: idSchema,
  ticket_type_id: idSchema.nullable().optional(),
  status: registrationStatusEnum.default('registered').optional(),
  notes: notesSchema,
});

export const RegistrationObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  event_id: z.string(),
  person_id: z.string(),
  ticket_type_id: z.string().nullable().optional(),
  status: registrationStatusEnum,
  checked_in_at: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const UpdateRegistrationObj = z.object({
  ticket_type_id: idSchema.nullable().optional(),
  status: registrationStatusEnum.optional(),
  checked_in_at: z.coerce.date().nullable().optional(),
  notes: notesSchema,
});
```

## File: libs/common/src/lib/schemas/lists.schema.ts

```typescript
import { z } from 'zod';
import { getAllOptions, nameSchema, descriptionSchema, idSchema } from './core.schema';

export const AddListObj = z.object({
  /** Campaigns §15 — the context this segment belongs to; backend defaults to the office. */
  campaign_id: idSchema.optional(),
  name: nameSchema('List name', 100),
  description: descriptionSchema(1000),
  object: z.enum(['people', 'households']),
  is_dynamic: z.boolean().optional(),
  definition: z
    .lazy(() => getAllOptions)
    .nullable()
    .optional(),
  member_ids: z.array(idSchema).optional(),
});

export const ListsObj = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  object: z.enum(['people', 'households']),
  is_dynamic: z.boolean().optional(),
  definition: z
    .lazy(() => getAllOptions)
    .nullable()
    .optional(),
  last_refreshed_at: z.coerce.date().nullable().optional(),
  status: z.enum(['idle', 'refreshing', 'failed']).optional(),
});

export const UpdateListObj = z.object({
  name: nameSchema('List name', 100).optional(),
  description: descriptionSchema(1000).optional(),
  object: z.enum(['people', 'households']).optional(),
  is_dynamic: z.boolean().optional(),
  definition: z
    .lazy(() => getAllOptions)
    .nullable()
    .optional(),
  last_refreshed_at: z.coerce.date().nullable().optional(),
  status: z.enum(['idle', 'refreshing', 'failed']).optional(),
});

export const ImportListItemObj = z.object({
  id: idSchema,
  fileName: z.string(),
  source: z.string(),
  tagName: z.string().nullable(),
  tagMissing: z.boolean(),
  createdAt: z.coerce.date(),
  processedAt: z.coerce.date(),
  createdBy: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
    })
    .nullable(),
  insertedCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  mergedCount: z.number().int().nonnegative(),
  tagsApplied: z.array(z.string()),
  rowCount: z.number().int().nonnegative(),
  householdsCreated: z.number().int().nonnegative(),
  contactCount: z.number().int().nonnegative(),
  householdCount: z.number().int().nonnegative(),
  companyCount: z.number().int().nonnegative(),
  taskCount: z.number().int().nonnegative(),
  status: z.string(),
  errorMessage: z.string().nullable().optional(),
  canDeleteContacts: z.boolean(),
  /** File size in bytes, when the original upload is still retained (90 days, spec §17). */
  sourceFileSize: z.number().int().nonnegative().nullable(),
  canDownloadSource: z.boolean(),
  canDownloadSkipped: z.boolean(),
});
```

## File: libs/common/src/lib/schemas/persons.schema.ts

```typescript
import { z } from 'zod';
import { phoneSchema, notesSchema, idSchema, nullableEmailSchema, addressSchema } from './core.schema';

/**
 * Do-not-contact channels (Campaigns §15). The flag lives on the person — it is a
 * global compliance override, never a per-campaign preference. A null/absent
 * channel list means "no contact on any channel".
 */
export const DNC_CHANNELS = ['email', 'phone', 'door'] as const;
export type DncChannel = (typeof DNC_CHANNELS)[number];

export const PersonsObj = z.object({
  id: z.string(),
  household_id: z.string(),
  email: z.string(),
  email2: z.string(),
  first_name: z.string(),
  middle_names: z.string(),
  last_name: z.string(),
  home_phone: z.string(),
  mobile: z.string(),
  notes: z.string(),
  linkedin: z.string().nullable().optional(),
  twitter: z.string().nullable().optional(),
  facebook: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  assigned_to: z.string().nullable().optional(),
  preferred_contact: z.string().nullable().optional(),
});

export const UpdateHouseholdsObj = addressSchema.extend({
  home_phone: phoneSchema('Home phone'),
  notes: notesSchema,
});

export const UpdatePersonsObj = z.object({
  campaign_id: idSchema.optional(),
  household_id: idSchema.optional(),
  company_id: idSchema.or(z.literal('')).nullable().optional(),
  email: nullableEmailSchema,
  email2: nullableEmailSchema,
  first_name: z.string().trim().max(100, 'First name is too long').nullable().optional(),
  middle_names: z.string().trim().max(100, 'Middle names are too long').nullable().optional(),
  last_name: z.string().trim().max(100, 'Last name is too long').nullable().optional(),
  home_phone: phoneSchema('Home phone'),
  mobile: phoneSchema('Mobile phone'),
  notes: notesSchema,
  linkedin: z.string().trim().max(255, 'LinkedIn URL is too long').nullable().optional(),
  twitter: z.string().trim().max(255, 'Twitter URL is too long').nullable().optional(),
  facebook: z.string().trim().max(255, 'Facebook URL is too long').nullable().optional(),
  instagram: z.string().trim().max(255, 'Instagram URL is too long').nullable().optional(),
  assigned_to: idSchema.or(z.literal('')).nullable().optional(),
  preferred_contact: z.string().trim().max(20, 'Preferred contact is too long').nullable().optional(),
  do_not_contact: z.boolean().optional(),
  do_not_contact_channels: z.array(z.enum(DNC_CHANNELS)).nullable().optional(),
});
```

## File: libs/common/src/lib/schemas/settings.schema.ts

```typescript
import { z } from 'zod';

export const SettingsObj = z.object({
  id: z.string().optional(),
  tenant_id: z.string().optional(),
  campaign_id: z.string().optional(),
  createdby_id: z.string().optional(),
  updatedby_id: z.string().optional(),
  key: z.string().optional(),
  value: z.unknown().optional(),
});

export const SettingsEntryObj = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export const UpsertSettingsInputObj = z.object({
  entries: z.array(SettingsEntryObj).min(1),
});
```

## File: libs/common/src/lib/schemas/tags.schema.ts

```typescript
import { z } from 'zod';
import { nameSchema, descriptionSchema } from './core.schema';

export const AddTagObj = z.object({
  name: nameSchema('Tag name', 50),
  description: descriptionSchema(500),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, 'Colour must be a hex value like #ff0000')
    .nullable()
    .optional(),
  type: z.enum(['tag', 'issue']).default('tag').optional(),
});

export const UpdateTagObj = z.object({
  name: nameSchema('Tag name', 50).optional(),
  description: descriptionSchema(500).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, 'Colour must be a hex value like #ff0000')
    .nullable()
    .optional(),
  type: z.enum(['tag', 'issue']).optional(),
});
```

## File: libs/common/src/lib/schemas/tasks.schema.ts

```typescript
import { z } from 'zod';
import { nameSchema, notesSchema, idSchema } from './core.schema';

/**
 * Canonical task status vocabulary (spec §4). This is the single source of truth —
 * every layer (DB check constraint, Zod schemas, backend queries, frontend board/list)
 * derives from this list. Do not hand-roll a parallel status array anywhere.
 *
 * `waiting` replaces the old `blocked` name (board column is "Waiting", with an
 * optional waiting-reason line on the card/row). `archived` absorbs the old `canceled`
 * state — a canceled task is, in practice, a task nobody is coming back to, which is
 * exactly what "archived" already means in this app (hidden from the active views,
 * reachable via the grid's Archived toggle). See the 2026-07-07 migration that
 * normalizes existing rows to this vocabulary.
 */
export const TASK_STATUSES = ['todo', 'in_progress', 'waiting', 'done', 'archived'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** The four board columns (spec §4) — `archived` sits outside the active workflow. */
export const TASK_BOARD_STATUSES = ['todo', 'in_progress', 'waiting', 'done'] as const;
export type TaskBoardStatus = (typeof TASK_BOARD_STATUSES)[number];

/** Statuses that count as "open" for SLA-breach and count-sentence purposes. */
export const TASK_OPEN_STATUSES = ['todo', 'in_progress', 'waiting'] as const;

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  waiting: 'Waiting',
  done: 'Done',
  archived: 'Archived',
};

/** Type guard — narrows an unknown/loosely-typed status string to the canonical vocabulary. */
export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value);
}

/** Type guard for the four board columns specifically (excludes `archived`). */
export function isTaskBoardStatus(value: unknown): value is TaskBoardStatus {
  return typeof value === 'string' && (TASK_BOARD_STATUSES as readonly string[]).includes(value);
}

const taskStatusEnum = z.enum(TASK_STATUSES);
const taskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);

export const AddTaskObj = z.object({
  name: nameSchema('Task name', 200),
  details: z.string().trim().max(10000, 'Details too long').optional(),
  due_at: z.preprocess((val) => (val === '' || val === null ? undefined : val), z.coerce.date().optional()),
  status: taskStatusEnum.default('todo').optional(),
  priority: taskPriorityEnum.optional(),
  completed_at: z.preprocess((val) => (val === '' || val === null ? undefined : val), z.coerce.date().optional()),
  position: z.number().int().optional(),
  assigned_to: idSchema.or(z.literal('')).nullable().optional(),
  team_id: idSchema.or(z.literal('')).nullable().optional(),
});

export const TasksObj = z.object({
  id: z.string(),
  name: z.string(),
  details: z.string().optional(),
  due_at: z.coerce.date().optional(),
  status: taskStatusEnum.nullable().optional(),
  priority: taskPriorityEnum.nullable().optional(),
  completed_at: z.coerce.date().optional(),
  position: z.number().int().optional(),
  assigned_to: z.string().nullable().optional(),
  team_id: z.string().nullable().optional(),
});

export const UpdateTaskObj = z.object({
  name: nameSchema('Task name', 200).optional(),
  details: notesSchema,
  due_at: z.preprocess((val) => (val === '' || val === null ? undefined : val), z.coerce.date().optional()),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  completed_at: z.preprocess((val) => (val === '' || val === null ? undefined : val), z.coerce.date().optional()),
  position: z.number().int().optional(),
  assigned_to: idSchema.or(z.literal('')).nullable().optional(),
  team_id: idSchema.or(z.literal('')).nullable().optional(),
});
```

## File: libs/common/src/lib/schemas/teams.schema.ts

```typescript
import { z } from 'zod';
import { nameSchema, descriptionSchema, idSchema } from './core.schema';

export const AddTeamObj = z.object({
  name: nameSchema('Name', 100),
  description: descriptionSchema(1000),
  team_captain_id: idSchema.or(z.literal('')).nullable().optional(),
  team_lead_user_id: idSchema.or(z.literal('')).nullable().optional(),
  volunteer_ids: z.array(idSchema).optional(),
  list_ids: z.array(idSchema).optional(),
});

export const UpdateTeamObj = z.object({
  name: nameSchema('Name', 100).nullable(),
  description: descriptionSchema(1000),
  team_captain_id: idSchema.or(z.literal('')).nullable().optional(),
  team_lead_user_id: idSchema.or(z.literal('')).nullable().optional(),
  volunteer_ids: z.array(idSchema).optional(),
  list_ids: z.array(idSchema).optional(),
});
```

## File: libs/common/src/lib/schemas/volunteer.schema.ts

```typescript
import { z } from 'zod';
import { nameSchema, idSchema, descriptionSchema, notesSchema } from './core.schema';

export const AddVolunteerEventObj = z.object({
  name: nameSchema('Event name', 200),
  description: descriptionSchema(2000),
  location_address: z.string().trim().max(500, 'Location address is too long').nullable().optional(),
  start_time: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.date({ error: 'Start date & time is required' }),
  ),
  end_time: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.date({ error: 'End date & time is required' }),
  ),
  capacity: z.number().int().positive().nullable().optional().or(z.literal('')),
  contact_email: z.string().trim().max(255).nullable().optional(),
  contact_phone: z.string().trim().max(50).nullable().optional(),
  is_private: z.boolean().default(false).optional(),
  send_reminder: z.boolean().default(true).optional(),
  send_signup_confirmation: z.boolean().default(true).optional(),
  send_volunteer_alert: z.boolean().default(true).optional(),
  fields: z.array(z.string()).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(
      /^(?=.*[a-z])[a-z0-9-]+$/,
      'Slug must contain at least one letter and can only contain lowercase letters, numbers, and hyphens',
    ),
});

export const VolunteerEventsObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  location_address: z.string().nullable().optional(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  capacity: z.number().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  is_private: z.boolean(),
  send_reminder: z.boolean(),
  send_signup_confirmation: z.boolean().default(true),
  send_volunteer_alert: z.boolean().default(true),
  slug: z.string(),
});

export const UpdateVolunteerEventObj = z.object({
  name: nameSchema('Event name', 200).optional(),
  description: descriptionSchema(2000),
  location_address: z.string().trim().max(500, 'Location address is too long').nullable().optional(),
  start_time: z
    .preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.date({ error: 'Start date & time is required' }),
    )
    .optional(),
  end_time: z
    .preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.coerce.date({ error: 'End date & time is required' }),
    )
    .optional(),
  capacity: z.number().int().positive().nullable().optional().or(z.literal('')),
  contact_email: z.string().trim().max(255).nullable().optional(),
  contact_phone: z.string().trim().max(50).nullable().optional(),
  is_private: z.boolean().optional(),
  send_reminder: z.boolean().optional(),
  send_signup_confirmation: z.boolean().optional(),
  send_volunteer_alert: z.boolean().optional(),
  fields: z.array(z.string()).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(
      /^(?=.*[a-z])[a-z0-9-]+$/,
      'Slug must contain at least one letter and can only contain lowercase letters, numbers, and hyphens',
    )
    .optional(),
});

export const AddVolunteerShiftObj = z.object({
  event_id: idSchema,
  person_id: idSchema,
  status: z.enum(['signed_up', 'attended', 'no_show', 'cancelled']).default('signed_up').optional(),
  hours_worked: z.number().min(0).max(24).nullable().optional(),
  notes: notesSchema,
});

export const VolunteerShiftsObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  event_id: z.string(),
  person_id: z.string(),
  status: z.enum(['signed_up', 'attended', 'no_show', 'cancelled']),
  hours_worked: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const UpdateVolunteerShiftObj = z.object({
  status: z.enum(['signed_up', 'attended', 'no_show', 'cancelled']).optional(),
  hours_worked: z.number().min(0).max(24).nullable().optional(),
  notes: notesSchema,
});
```

## File: libs/common/src/lib/schemas/web-forms.schema.ts

```typescript
import { z } from 'zod';
import { idSchema, nameSchema, descriptionSchema } from './core.schema';

export const AddWebFormObj = z.object({
  name: nameSchema('Web Form name', 100),
  description: descriptionSchema(500),
  redirect_url: z.string().trim().url('Redirect URL must be a valid URL').or(z.literal('')).nullable().optional(),
  target_tags: z.array(z.string()).nullable().optional(),
  target_lists: z.array(z.string()).nullable().optional(),
  fields: z.array(z.string()).nullable().optional(),
  // Legacy donation/standard add path. 'active' is accepted for back-compat and mapped to
  // 'published' by the controller; the lifecycle statuses pass through unchanged.
  status: z.enum(['active', 'draft', 'published', 'archived']).default('active').optional(),
  send_confirmation: z.boolean().default(true).optional(),
  send_alert: z.boolean().default(true).optional(),
  form_type: z.enum(['standard', 'donation', 'recurring_donation']).default('standard').optional(),
});

export const UpdateWebFormObj = z.object({
  name: nameSchema('Web Form name', 100).optional(),
  description: descriptionSchema(500).optional(),
  redirect_url: z.string().trim().url('Redirect URL must be a valid URL').or(z.literal('')).nullable().optional(),
  target_tags: z.array(z.string()).nullable().optional(),
  target_lists: z.array(z.string()).nullable().optional(),
  fields: z.array(z.string()).nullable().optional(),
  status: z.enum(['active', 'draft', 'published', 'archived']).optional(),
  send_confirmation: z.boolean().optional(),
  send_alert: z.boolean().optional(),
});

export const WebFormsObj = z.object({
  id: z.string().uuid(),
  tenant_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  redirect_url: z.string().nullable(),
  target_tags: z.array(z.string()).nullable(),
  target_lists: z.array(z.string()).nullable(),
  fields: z.array(z.string()).nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  send_confirmation: z.boolean().default(true),
  send_alert: z.boolean().default(true),
  form_type: z.string(),
  createdby_id: z.string(),
  updatedby_id: z.string(),
  created_at: z.union([z.date(), z.string()]),
  updated_at: z.union([z.date(), z.string()]),
});

// ---------------------------------------------------------------------------
// North Star "living funnel" lifecycle (new Forms experience).
//
// The five template types are creation presets + a display chip. Donation forms
// (form_type IN donation/recurring_donation) keep the legacy string[] `fields`
// shape and the old add/update path — they are NOT part of this model.
// ---------------------------------------------------------------------------

export const FORM_TYPES = ['signup', 'pledge', 'rsvp', 'request', 'survey'] as const;
export type FormType = (typeof FORM_TYPES)[number];
export const FormTypeEnum = z.enum(FORM_TYPES);

export const FORM_STATUSES = ['draft', 'published', 'archived'] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

/** A single configurable field on a form. Stored as JSON in `web_forms.fields`. */
export const FormFieldObj = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'area', 'select', 'checks']),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  help: z.string().optional(),
  on: z.boolean(),
  required: z.boolean(),
});
export type FormField = z.infer<typeof FormFieldObj>;

/** Email is the identity key: always present, always on, always required, never editable. */
export const FORM_EMAIL_FIELD: FormField = {
  key: 'email',
  label: 'Email',
  type: 'text',
  placeholder: 'you@example.org',
  on: true,
  required: true,
};

const NAME_FIELD: FormField = {
  key: 'full_name',
  label: 'Full name',
  type: 'text',
  placeholder: 'Jordan Blake',
  on: true,
  required: true,
};

/**
 * Standard optional fields every form can turn on without schema work. `normForm` appends any of
 * these that a form's own field list doesn't already define, all `on: false`.
 */
export const FORM_STANDARD_CATALOG: FormField[] = [
  { key: 'mobile', label: 'Mobile phone', type: 'text', placeholder: '(555) 000-0000', on: false, required: false },
  { key: 'street1', label: 'Street address', type: 'text', on: false, required: false },
  { key: 'city', label: 'City', type: 'text', on: false, required: false },
  { key: 'zip', label: 'ZIP code', type: 'text', on: false, required: false },
];

/** Creation templates — all start from name + email, then add type-specific fields. */
export const FORM_TEMPLATES: Record<FormType, { submitLabel: string; description: string; fields: FormField[] }> = {
  signup: {
    submitLabel: 'Sign me up',
    description: 'Join the team — tell us how you can help and we’ll be in touch.',
    fields: [
      NAME_FIELD,
      FORM_EMAIL_FIELD,
      {
        key: 'mobile',
        label: 'Mobile phone',
        type: 'text',
        placeholder: '(555) 000-0000',
        help: 'Only used for shift reminders',
        on: true,
        required: false,
      },
      {
        key: 'availability',
        label: 'When can you help?',
        type: 'checks',
        options: ['Weekday evenings', 'Weekend canvasses', 'Phone banking', 'Event day'],
        on: true,
        required: false,
      },
      {
        key: 'notes',
        label: 'Anything we should know?',
        type: 'area',
        placeholder: 'Languages, accessibility, interests…',
        on: true,
        required: false,
      },
    ],
  },
  pledge: {
    submitLabel: 'Make my pledge',
    description: 'Pledge your support — every contribution helps.',
    fields: [
      NAME_FIELD,
      FORM_EMAIL_FIELD,
      { key: 'amount', label: 'Pledge amount', type: 'text', placeholder: 'E.g. 50', on: true, required: true },
    ],
  },
  rsvp: {
    submitLabel: 'Reserve my spot',
    description: 'Let us know you’re coming.',
    fields: [
      NAME_FIELD,
      FORM_EMAIL_FIELD,
      { key: 'seats', label: 'How many seats?', type: 'text', placeholder: 'E.g. 2', on: true, required: true },
    ],
  },
  request: {
    submitLabel: 'Send request',
    description: 'Tell us what you need and where.',
    fields: [
      NAME_FIELD,
      FORM_EMAIL_FIELD,
      { key: 'street1', label: 'Street address', type: 'text', on: true, required: true },
      { key: 'city', label: 'City', type: 'text', on: true, required: false },
      { key: 'zip', label: 'ZIP code', type: 'text', on: true, required: false },
      { key: 'notes', label: 'Notes', type: 'area', placeholder: 'How can we help?', on: true, required: false },
    ],
  },
  survey: {
    submitLabel: 'Submit',
    description: 'Your answers help shape our priorities.',
    fields: [
      NAME_FIELD,
      FORM_EMAIL_FIELD,
      {
        key: 'issues',
        label: 'Which issues matter most?',
        type: 'checks',
        options: ['Housing', 'Transit', 'Safety', 'Parks', 'Schools'],
        on: true,
        required: false,
      },
      {
        key: 'open',
        label: 'Anything else?',
        type: 'area',
        placeholder: 'Share your thoughts…',
        on: true,
        required: false,
      },
    ],
  },
};

/**
 * Coerces a form's stored `fields` JSON into a well-formed FormField[]: keeps only object-shaped
 * fields (silently drops legacy string[] entries from donation forms), guarantees the name + email
 * identity fields exist, enforces the email invariant (always on + required), and appends any
 * standard-catalog fields the form hasn't defined. This is the single source of truth both the API
 * and the editor use so the preview always matches what will be saved.
 */
export function normForm(rawFields: unknown): FormField[] {
  const source = Array.isArray(rawFields) ? rawFields : [];
  const fields: FormField[] = [];
  for (const raw of source) {
    const parsed = FormFieldObj.safeParse(raw);
    if (parsed.success) fields.push(parsed.data);
  }

  if (!fields.some((f) => f.key === NAME_FIELD.key)) {
    fields.unshift({ ...NAME_FIELD });
  }

  const emailIndex = fields.findIndex((f) => f.key === FORM_EMAIL_FIELD.key);
  if (emailIndex === -1) {
    // Slot email right after the name field.
    fields.splice(1, 0, { ...FORM_EMAIL_FIELD });
  } else {
    const current = fields[emailIndex];
    if (current) {
      fields[emailIndex] = { ...current, on: true, required: true };
    }
  }

  for (const catalog of FORM_STANDARD_CATALOG) {
    if (!fields.some((f) => f.key === catalog.key)) {
      fields.push({ ...catalog });
    }
  }

  return fields;
}

/** Build the initial field list for a newly created form of the given template type. */
export function fieldsForTemplate(type: FormType): FormField[] {
  return normForm(FORM_TEMPLATES[type].fields.map((f) => ({ ...f })));
}

export const CreateFormObj = z.object({
  name: nameSchema('Form name', 100),
  type: FormTypeEnum,
  /** Campaigns §15 — the context this form collects consent for; backend defaults to the office. */
  campaign_id: idSchema.optional(),
});

/** Live-edit patch for the new Forms editor. Every field is optional (debounced partial saves). */
export const UpdateFormObj = z.object({
  name: nameSchema('Form name', 100).optional(),
  description: descriptionSchema(2000).optional(),
  redirect_url: z.string().trim().url('Redirect URL must be a valid URL').or(z.literal('')).nullable().optional(),
  submit_label: z.string().trim().max(60).optional(),
  thanks_title: z.string().trim().max(120).optional(),
  thanks_body: z.string().trim().max(2000).optional(),
  confirm_email_on: z.boolean().optional(),
  confirm_subject: z.string().trim().max(200).optional(),
  confirm_body: z.string().trim().max(5000).optional(),
  notify_team_on: z.boolean().optional(),
  fields: z.array(FormFieldObj).optional(),
  target_tags: z.array(z.string()).optional(),
  target_lists: z.array(z.string()).optional(),
});

/** One row in the Responses tab. */
export const FormSubmissionObj = z.object({
  id: z.string(),
  person_id: z.string(),
  person_name: z.string().nullable(),
  answers: z.record(z.string(), z.unknown()),
  created_at: z.union([z.date(), z.string()]),
});
```

## File: libs/common/src/lib/schemas/workflows.schema.ts

```typescript
import { z } from 'zod';
import { queryBuilderNodeSchema } from './core.schema';

// Spec §16 Automations — the trigger picker's 12 cards. `volunteer_signup` is kept for
// backward compatibility with the pre-rebuild volunteer onboarding trigger (fired from the
// volunteer-events controller) but is not offered as a card.
export const WORKFLOW_TRIGGER_TYPES = [
  'manual',
  'web_form_submitted',
  'contact_created',
  'tag_added',
  'list_joined',
  'donation_recorded',
  'payment_event',
  'volunteer_shift_status',
  'task_sla_breach',
  'new_subscriber',
  'new_unsubscriber',
  'date_arrives',
  'volunteer_signup',
] as const;

export type WorkflowTriggerType = (typeof WORKFLOW_TRIGGER_TYPES)[number];

const triggerTypeSchema = z.enum(WORKFLOW_TRIGGER_TYPES);

// Spec §16 sequence editor — the five step kinds offered by the ADD A STEP menu.
export const WORKFLOW_STEP_KINDS = ['wait', 'send_email', 'add_tag', 'create_task', 'notify_team'] as const;

export type WorkflowStepKind = (typeof WORKFLOW_STEP_KINDS)[number];

const stepKindSchema = z.enum(WORKFLOW_STEP_KINDS);

// Per-kind config payload (persisted to workflow_steps.config as jsonb). Every field is optional
// at the schema boundary; the controller maps each kind's meaningful fields when executing.
export const WorkflowStepConfigObj = z
  .object({
    // add_tag
    tag_id: z.string().nullable().optional(),
    tag_name: z.string().nullable().optional(),
    // create_task
    task_title: z.string().nullable().optional(),
    // notify_team
    notify_user_id: z.string().nullable().optional(),
    notify_user_name: z.string().nullable().optional(),
    notify_message: z.string().nullable().optional(),
  })
  .strict();

export type WorkflowStepConfigType = z.infer<typeof WorkflowStepConfigObj>;

export const WorkflowObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  trigger_type: triggerTypeSchema.default('manual'),
  trigger_event_id: z.string().nullable().optional(),
  status: z.enum(['draft', 'active', 'paused']).default('draft'),
  conditions: queryBuilderNodeSchema.nullable().optional(),
  createdby_id: z.string(),
  updatedby_id: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const AddWorkflowObj = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().nullable().optional(),
  trigger_type: triggerTypeSchema.default('manual'),
  trigger_event_id: z.string().nullable().optional(),
  status: z.enum(['draft', 'active', 'paused']).default('draft').optional(),
  conditions: queryBuilderNodeSchema.nullable().optional(),
});

export const UpdateWorkflowObj = AddWorkflowObj.partial();

export type AddWorkflowType = z.infer<typeof AddWorkflowObj>;
export type UpdateWorkflowType = z.infer<typeof UpdateWorkflowObj>;

export const WorkflowStepObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  workflow_id: z.string(),
  step_number: z.number().int().positive(),
  kind: stepKindSchema,
  config: WorkflowStepConfigObj.nullable().optional(),
  delay_days: z.number().int().nonnegative(),
  delay_unit: z.enum(['days', 'hours']).default('days'),
  subject: z.string().nullable().optional(),
  preview_text: z.string().nullable().optional(),
  html_content: z.string().nullable().optional(),
  plain_text_content: z.string().nullable().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

// Input shape for saveSteps — order is implied by array position, so no step_number here.
export const AddWorkflowStepObj = z.object({
  kind: stepKindSchema,
  config: WorkflowStepConfigObj.nullable().optional(),
  delay_days: z.number().int().nonnegative().default(0),
  delay_unit: z.enum(['days', 'hours']).default('days'),
  subject: z.string().nullable().optional(),
  preview_text: z.string().nullable().optional(),
  html_content: z.string().nullable().optional(),
  plain_text_content: z.string().nullable().optional(),
});

export const UpdateWorkflowStepObj = AddWorkflowStepObj.partial();

export type AddWorkflowStepType = z.infer<typeof AddWorkflowStepObj>;
export type UpdateWorkflowStepType = z.infer<typeof UpdateWorkflowStepObj>;

export const WorkflowEnrollmentObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  workflow_id: z.string(),
  person_id: z.string(),
  status: z.enum(['active', 'completed', 'cancelled']).default('active'),
  current_step_number: z.number().int().nonnegative(),
  next_run_at: z.coerce.date().nullable().optional(),
  enrolled_at: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const WorkflowRunObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  workflow_id: z.string(),
  enrollment_id: z.string().nullable().optional(),
  person_id: z.string().nullable().optional(),
  step_number: z.number().int().nullable().optional(),
  step_kind: z.string().nullable().optional(),
  status: z.enum(['success', 'failed']),
  error: z.string().nullable().optional(),
  created_at: z.coerce.date(),
});

export type WorkflowRunType = z.infer<typeof WorkflowRunObj>;
```

## File: libs/common/src/lib/jsend.ts

```typescript
export interface JSendErrorInterface {
  code?: string | number;
  message: string;
  status: 'error';
}

export interface JSendFailInterface<E extends object = Record<string, unknown>> {
  data: E;
  status: 'fail';
}

export interface JSendSuccessInterface<T> {
  data: T;
  status: 'success';
}

export class JSendError extends Error {
  public override name = 'JSendServerError';

  constructor(
    public readonly messageText: string,
    public readonly code?: string | number,
    public readonly statusCode: number = 500,
  ) {
    super(messageText || 'Server error');
  }
}

export class JSendFail<E extends object = Record<string, unknown>> extends Error {
  public override name = 'JSendFailError';

  constructor(
    public readonly data: E,
    public readonly statusCode: number = 400,
  ) {
    super('Request failed');
  }
}

export type JSend<T = unknown, E extends object = Record<string, unknown>> =
  | JSendSuccessInterface<T>
  | JSendFailInterface<E>
  | JSendErrorInterface;

export type JSendStatus = 'success' | 'fail' | 'error';

// Helpful status mapping (useful in backend)
export function httpStatusForJSend(obj: JSend): number {
  if (jsend.isSuccess(obj)) return 200;
  if (jsend.isFail(obj)) return 400; // choose per-case if needed
  return 500;
}

export const jsend = {
  success<T>(data: T): JSendSuccessInterface<T> {
    return { status: 'success', data };
  },
  fail<E extends object = Record<string, unknown>>(data: E): JSendFailInterface<E> {
    return { status: 'fail', data };
  },
  error(message: string, code?: string | number): JSendErrorInterface {
    return {
      status: 'error',
      message,
      ...(code !== undefined ? { code } : {}),
    };
  },

  isSuccess<T = unknown>(x: unknown): x is JSendSuccessInterface<T> {
    return (
      typeof x === 'object' &&
      x !== null &&
      'status' in x &&
      (x as Record<string, unknown>)['status'] === 'success' &&
      'data' in x
    );
  },
  isFail<E extends object = Record<string, unknown>>(x: unknown): x is JSendFailInterface<E> {
    return (
      typeof x === 'object' &&
      x !== null &&
      'status' in x &&
      (x as Record<string, unknown>)['status'] === 'fail' &&
      'data' in x
    );
  },
  isError(x: unknown): x is JSendErrorInterface {
    return (
      typeof x === 'object' &&
      x !== null &&
      'status' in x &&
      (x as Record<string, unknown>)['status'] === 'error' &&
      'message' in x
    );
  },

  unwrap<T>(res: JSend<T>): T {
    if (res.status === 'success') return res.data;
    if (res.status === 'fail') throw new JSendFail(res.data, 400);
    if (res.status === 'error') throw new JSendError(res.message, res.code, 500);
    throw new Error('Unknown JSend shape');
  },
};
```

## File: libs/common/src/lib/public-id.ts

```typescript
import { slugifyRecordName } from './utils';

/**
 * Opaque public identifiers for person records (spec §1 security surface).
 *
 * Unlike households/companies, persons do NOT use a name slug: at 100k+ people
 * name slugs collide (`amira-hassan-4787`), leak counts, and put real names in
 * URLs and logs — bad for a political CRM. Instead each person carries an
 * opaque `public_id`: 8 Crockford Base32 characters encoding 40 bits from a
 * CSPRNG (`crypto.randomBytes(5)` on the backend), stored uppercase-canonical
 * (e.g. `4T9K2XPM`).
 *
 * The URL display form (what the browser shows) is `{name}-{XXXX}-{XXXX}`, e.g.
 * `/people/joseph-4t9k-2xpm`: a decorative slugified first/last name followed by
 * the public_id split 4-4. The name is cosmetic — resolution strips it and looks
 * up by public_id only, so a stale name in an old URL still resolves.
 *
 * These helpers are shared by the frontend resolver and the backend so decode
 * and slug-building stay identical on both sides. Generation (randomBytes +
 * retry-on-collision) is backend-only — see
 * `apps/backend/src/app/lib/person-public-id.ts`.
 */

/** Crockford Base32 alphabet — excludes I, L, O, U to avoid visual/spoken ambiguity. */
export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Canonical public_id length in characters (40 bits / 5 bits-per-char = 8). */
export const PUBLIC_ID_LENGTH = 8;

const CROCKFORD_SET = new Set(CROCKFORD_ALPHABET);

/**
 * Encode raw bytes to Crockford Base32 (big-endian, no padding). 5 bytes
 * (40 bits) produce exactly 8 characters. Bit accumulation is masked to stay
 * within JS's 32-bit bitwise range, so this is correct for any byte length.
 */
export function encodeCrockford(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += CROCKFORD_ALPHABET[(value >>> bits) & 31];
    }
    // Keep only the bits not yet emitted so `value` never exceeds ~12 bits.
    value &= (1 << bits) - 1;
  }
  if (bits > 0) {
    output += CROCKFORD_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Normalize a Crockford string to canonical form: uppercase, map the
 * confusable letters back to digits (I/L → 1, O → 0), and drop any character
 * outside the alphabet (hyphens, spaces, etc.). The result contains only
 * canonical alphabet characters.
 */
export function normalizeCrockford(input: string): string {
  let output = '';
  for (const raw of input.toUpperCase()) {
    let ch = raw;
    if (ch === 'O') ch = '0';
    else if (ch === 'I' || ch === 'L') ch = '1';
    if (CROCKFORD_SET.has(ch)) output += ch;
  }
  return output;
}

/**
 * Decode a URL segment to a canonical person public_id, or `null` when it does
 * not contain one. Strips all hyphens, takes the last {@link PUBLIC_ID_LENGTH}
 * characters (the public_id is always appended last), then Crockford-normalizes.
 * Robust to a decorative name that itself contains hyphens (`mary-jane-4t9k-2xpm`
 * → `4T9K2XPM`), a bare id (`4t9k2xpm`), and a hyphenated bare id (`4T9K-2XPM`).
 */
export function extractPublicIdFromSlug(segment: string): string | null {
  const stripped = segment.replace(/-/g, '');
  const tail = stripped.slice(-PUBLIC_ID_LENGTH);
  const normalized = normalizeCrockford(tail);
  return normalized.length === PUBLIC_ID_LENGTH ? normalized : null;
}

/**
 * Build the person URL display slug `{name}-{xxxx}-{xxxx}` from a canonical
 * public_id. The decorative name is the slugified first name, else last name,
 * else the literal `person`. The id is lowercased and split 4-4 for readability
 * (e.g. `joseph-4t9k-2xpm`). Resolution ignores the name entirely.
 */
export function buildPersonSlug(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  publicId: string,
): string {
  const source = (firstName ?? '').trim() || (lastName ?? '').trim();
  const name = slugifyRecordName(source, 'person');
  const id = publicId.toLowerCase();
  return `${name}-${id.slice(0, 4)}-${id.slice(4, PUBLIC_ID_LENGTH)}`;
}
```

## File: libs/common/src/lib/sla.ts

```typescript
export function calculateWorkingTimeMs(
  startDate: Date,
  endDate: Date,
  workingDays: number[],
  workingHoursStart: string,
  workingHoursEnd: string,
): number {
  if (startDate.getTime() >= endDate.getTime()) {
    return 0;
  }

  // Parse start hour/minute
  const [startHour = NaN, startMin = NaN] = workingHoursStart.split(':').map(Number);
  // Parse end hour/minute
  const [endHour = NaN, endMin = NaN] = workingHoursEnd.split(':').map(Number);

  if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin) || workingDays.length === 0) {
    // Return standard elapsed time as fallback if settings are malformed
    return endDate.getTime() - startDate.getTime();
  }

  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const endLimit = new Date(endDate);
  endLimit.setHours(23, 59, 59, 999);

  let totalMs = 0;

  while (current.getTime() <= endLimit.getTime()) {
    const dayOfWeek = current.getDay();

    if (workingDays.includes(dayOfWeek)) {
      const workStart = new Date(current);
      workStart.setHours(startHour, startMin, 0, 0);

      const workEnd = new Date(current);
      workEnd.setHours(endHour, endMin, 0, 0);

      const actualStart = Math.max(startDate.getTime(), workStart.getTime());
      const actualEnd = Math.min(endDate.getTime(), workEnd.getTime());

      const overlap = actualEnd - actualStart;
      if (overlap > 0) {
        totalMs += overlap;
      }
    }

    // Step to the next day
    current.setDate(current.getDate() + 1);
  }

  return totalMs;
}
```

## File: libs/common/src/lib/utils.ts

```typescript
export function debounce<F extends (...args: any[]) => void>(fn: F, delay = 300) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Subdomain labels that must never be assigned to a tenant — they collide with app/infra hosts.
 * A tenant's slug becomes `<slug>.<baseDomain>`, so the public form page can resolve the tenant
 * from the Host header; these labels are reserved so a tenant can't shadow `app`, `api`, etc.
 */
export const RESERVED_SUBDOMAINS = new Set<string>([
  'app',
  'www',
  'api',
  'admin',
  'mail',
  'email',
  'ftp',
  'smtp',
  'imap',
  'pop',
  'ns',
  'ns1',
  'ns2',
  'dns',
  'mx',
  'static',
  'assets',
  'cdn',
  'media',
  'files',
  'download',
  'downloads',
  'status',
  'help',
  'support',
  'docs',
  'blog',
  'dev',
  'staging',
  'stage',
  'test',
  'demo',
  'sandbox',
  'portal',
  'dashboard',
  'account',
  'accounts',
  'billing',
  'pay',
  'payments',
  'auth',
  'login',
  'logout',
  'signup',
  'signin',
  'register',
  'public',
  'forms',
  'f',
  'localhost',
  'root',
  'system',
]);

/**
 * Turn a name into a DNS-safe subdomain label: lowercase, ASCII alphanumerics + single hyphens,
 * no leading/trailing hyphen, capped at 40 chars. Returns '' when nothing usable remains — callers
 * must fall back (e.g. `t-<id>`) and check {@link RESERVED_SUBDOMAINS}.
 */
export function slugifyHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

/**
 * Slugify a record's display name for slug-based record routing
 * (`/people/amira-hassan` \u2014 spec \u00a71: URLs carry slugs, never internal IDs).
 * Lowercase, accent-stripped, non-alphanumerics collapsed to single hyphens,
 * capped at 80 chars. Falls back to `fallback` (e.g. "person") when nothing
 * usable remains, and prefixes the fallback when the result is all digits so a
 * slug can never be mistaken for a numeric record-ID URL. Per-tenant
 * uniqueness is the caller's job \u2014 see `apps/backend/src/app/lib/slug.ts`.
 */
export function slugifyRecordName(value: string, fallback: string): string {
  const base = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  if (!base) return fallback;
  if (/^\d+$/.test(base)) return `${fallback}-${base}`;
  return base;
}

/**
 * Escape a string for safe interpolation into HTML markup (element text or
 * double/single-quoted attribute values).
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

## File: libs/common/eslint.config.cjs

```javascript
/* ---------------------------------------------------------------
 *  libs/common/eslint.config.cjs
 *  Universal shared library rules (used by frontend + backend)
 * -------------------------------------------------------------- */

const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  /* Compose the root config so `nx lint common` enforces the same
   * workspace-wide rules (no-floating-promises, no-misused-promises, etc.)
   * as the pre-commit `eslint` invocation. Confirmed zero new violations. */
  ...require('../../eslint.config.cjs'),

  /* JavaScript/TypeScript base rules */
  ...compat
    .config({
      extends: [
        'plugin:@nx/javascript',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/stylistic',
      ],
      parserOptions: {
        project: [
          require('path').resolve(__dirname, 'tsconfig.lib.json'),
          require('path').resolve(__dirname, '../../tsconfig.base.json'),
        ],
        sourceType: 'module',
      },
    })
    .map((cfg) => ({
      ...cfg,
      files: ['**/*.{ts,tsx,js,jsx}'],
      rules: {
        /* Shared TypeScript rules */
        '@typescript-eslint/consistent-type-imports': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        '@typescript-eslint/no-inferrable-types': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',

        /* General JS/TS best practices */
        'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
        'prefer-const': 'error',
        'no-var': 'error',
        'no-empty': ['warn', { allowEmptyCatch: true }],
      },
    })),
];
```

## File: libs/common/project.json

```json
{
  "name": "common",
  "$schema": "../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/common/src",
  "projectType": "library",
  "targets": {
    "lint": {
      "executor": "@nx/eslint:lint",
      "outputs": ["{options.outputFile}"],
      "options": {
        "lintFilePatterns": ["libs/common/**/*.ts"]
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "cache": true,
      "outputs": ["{workspaceRoot}/coverage/libs/common"],
      "options": {
        "cwd": "libs/common",
        "command": "vitest run"
      }
    }
  },
  "tags": []
}
```

## File: libs/common/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "es2022",
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "files": [],
  "include": [],
  "references": [
    {
      "path": "./tsconfig.lib.json"
    }
  ]
}
```

## File: libs/common/tsconfig.lib.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../dist/out-tsc",
    "declaration": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["jest.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts"]
}
```

## File: libs/common/vite.config.ts

```typescript
/// <reference types='vitest' />
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/common',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [],
  test: {
    name: 'common',
    watch: false,
    globals: true,
    passWithNoTests: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/common',
      provider: 'v8' as const,
      // Coverage ratchet: measured baseline 2026-07-04 was 100% stmts /
      // 94% branch on this small lib; held slightly below so one new helper
      // file doesn't instantly break the build, but keep raising it as the
      // lib grows. Never lower these — add tests instead.
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
}));
```

## File: libs/uxcommon/src/components/address-autocomplete/googlePlacesAddressMapper.ts

```typescript
import type { AddressType } from '../../../../common/src/lib/kysely.models';

type AddressTypeMapInterface = {
  [key in keyof AddressType]: string[];
};

export function parseAddress(place: google.maps.places.PlaceResult): AddressType {
  const address: AddressType = {};

  if (!place.address_components || place.address_components.length === 0) {
    return address;
  }

  const address_components: google.maps.GeocoderAddressComponent[] = place.address_components;

  address_components.forEach((component) => {
    for (const mapKey in googleAddressToAddressTypeMap) {
      const key = mapKey as keyof typeof googleAddressToAddressTypeMap;
      if (googleAddressToAddressTypeMap[key]?.indexOf(component.types[0]!) !== -1) {
        (address[key] as string) = key === 'country' ? component.short_name : component.long_name;
      }
    }
  });

  address.formatted_address = place.formatted_address;
  address.lat = place.geometry?.location?.lat();
  address.lng = place.geometry?.location?.lng();
  address.type = place.types && place.types[0];

  return address;
}

export function parsePlace(place: google.maps.places.Place): AddressType {
  const address: AddressType = {};

  const addressComponents = place.addressComponents;
  if (!addressComponents || addressComponents.length === 0) {
    return address;
  }

  addressComponents.forEach((component: any) => {
    for (const mapKey in googleAddressToAddressTypeMap) {
      const key = mapKey as keyof typeof googleAddressToAddressTypeMap;
      if (component.types && googleAddressToAddressTypeMap[key]?.indexOf(component.types[0]) !== -1) {
        (address[key] as string) = key === 'country' ? component.shortText : component.longText;
      }
    }
  });

  address.formatted_address = place.formattedAddress ?? undefined;
  address.lat = place.location?.lat() ?? undefined;
  address.lng = place.location?.lng() ?? undefined;
  address.type = (place.types && place.types[0]) ?? undefined;

  return address;
}

const googleAddressToAddressTypeMap: Partial<AddressTypeMapInterface> = {
  apt: ['subpremise'],
  street_num: ['street_number'],
  zip: ['postal_code'],
  street1: ['street_address', 'route'],
  city: [
    'locality',
    'sublocality',
    'sublocality_level_1',
    'sublocality_level_2',
    'sublocality_level_3',
    'sublocality_level_4',
  ],
  state: [
    'administrative_area_level_1',
    'administrative_area_level_2',
    'administrative_area_level_3',
    'administrative_area_level_4',
    'administrative_area_level_5',
  ],
  country: ['country'],
};
```

## File: libs/uxcommon/src/components/address-form-group/address-form-group.ts

```typescript
import { Component, input } from '@angular/core';
import { Input as PcInput } from '../input/input';

@Component({
  selector: 'pc-address-form-group',
  imports: [PcInput],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex flex-col md:flex-row gap-3">
        <pc-input class="flex-1" placeholder="Unit / Apt" [formField]="form().apt"></pc-input>
        <pc-input class="flex-1" placeholder="Street Number" [formField]="form().street_num"></pc-input>
        <pc-input class="flex-2" placeholder="Street Name" [formField]="form().street1"></pc-input>
      </div>
      <div class="flex flex-col md:flex-row gap-3">
        <pc-input class="flex-1" placeholder="City" [formField]="form().city"></pc-input>
        <pc-input class="flex-1" placeholder="State / Province" [formField]="form().state"></pc-input>
        <pc-input class="flex-1" placeholder="Country" [formField]="form().country"></pc-input>
      </div>
      <div class="flex flex-col md:flex-row gap-3">
        <pc-input class="flex-1" placeholder="Zip / Postal Code" [formField]="form().zip"></pc-input>
        <pc-input class="flex-1" type="tel" placeholder="Home Phone" [formField]="form().home_phone"></pc-input>
        <div class="flex-1"></div>
      </div>
    </div>
  `,
})
export class AddressFormGroup {
  public form = input.required<any>();
}
```

## File: libs/uxcommon/src/components/autocomplete/autocomplete.ts

```typescript
import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { debounce } from '../../../../common/src';

@Component({
  selector: 'pc-autocomplete',
  template: ` <div
      class="input w-full flex h-auto min-h-10 flex-wrap items-center gap-1.5 py-1.5 cursor-text"
      (click)="focusInput()"
    >
      <ng-content></ng-content>
      <input
        #inputEl
        type="text"
        class="grow basis-0 min-w-0 border-none bg-transparent p-0 focus:outline-none"
        [placeholder]="placeholder()"
        (keyup)="onKey($event)"
        (keydown)="onKeyDown($event)"
        (input)="onInput($event)"
        (focus)="showAutoCompleteList()"
        (blur)="hideAutoCompleteList()"
      />
    </div>
    @if (matches().length && !hideAutoComplete()) {
      <ul class="w-full rounded-none bordered card shadow-lg text-gray-500 font-light">
        @for (match of matches(); track match) {
          <li class="tet-xs cursor-pointer hover:bg-gray-200 pl-4" (click)="reset(match)">
            {{ match.charAt(0).toUpperCase() + match.slice(1) }}
          </li>
        }
      </ul>
    }`,
})
export class AutoComplete {
  protected readonly matches = signal<string[]>([]);

  protected hideAutoComplete = signal(true);

  public readonly valueChange = output<string>();

  /** Emitted when Backspace is pressed while the text field is empty — lets the host pop the last chip. */
  public readonly backspaceEmpty = output<void>();

  public filterSvc = input<TFILTER | null>(null);
  public readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('inputEl');

  public placeholder = input('');

  private readonly debouncedFilter = debounce(async (key: string) => {
    const filterSvc = this.filterSvc();
    if (!filterSvc || !key?.length) {
      this.matches.set([]);
      return;
    }
    const matches = await filterSvc.filter(key);
    this.matches.set(matches);
  }, 250);

  protected onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.debouncedFilter(target.value || '');
  }

  protected hideAutoCompleteList() {
    setTimeout(() => this.hideAutoComplete.set(true), 200);
  }

  protected onKey(event: KeyboardEvent) {
    const target = event.target as HTMLInputElement;
    if (event.key === 'Enter' || event.key === ',') {
      this.reset(target.value);
    }
  }

  protected onKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && target.value.length === 0) {
      this.backspaceEmpty.emit();
    }
  }

  protected focusInput() {
    this.inputRef()?.nativeElement.focus();
  }

  protected reset(key: string) {
    this.valueChange.emit(key);
    this.matches.set([]);
    if (this.inputRef()?.nativeElement) {
      this.inputRef().nativeElement.value = '';
    }
  }

  protected showAutoCompleteList() {
    this.hideAutoComplete.set(false);
  }
}

type TFILTER = {
  filter: (arg0: string) => Promise<string[]>;
};
```

## File: libs/uxcommon/src/components/card/card.ts

```typescript
import { Component, input } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

@Component({
  selector: 'pc-card',
  imports: [Icon],
  template: `
    <div class="card bg-base-100 border border-base-300 shadow-md overflow-hidden w-full">
      <div class="card-body p-6 space-y-4">
        @if (title() || icon() || subtitle()) {
          <div class="flex items-start justify-between gap-4 pb-2">
            <div class="flex items-start gap-2.5">
              @if (icon()) {
                <pc-icon [name]="icon()!" class="text-primary mt-0.5" [size]="5"></pc-icon>
              }
              <div>
                @if (title()) {
                  <h3 class="font-bold text-lg text-base-content leading-tight">{{ title() }}</h3>
                }
                @if (subtitle()) {
                  <p class="text-xs text-base-content/60 mt-0.5 leading-normal">{{ subtitle() }}</p>
                }
              </div>
            </div>
            <div class="flex items-center gap-2">
              <ng-content select="[pc-card-actions]"></ng-content>
            </div>
          </div>
          <div class="border-b border-base-200 -mt-2"></div>
        }

        <div class="space-y-4">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class Card {
  public title = input<string>();
  public subtitle = input<string>();
  public icon = input<PcIconNameType>();
}
```

## File: libs/uxcommon/src/components/csv-import/csv.worker.ts

```typescript
// CSV/TSV parsing web worker (shared)
// Receives: { type: 'parse', text: string }
// Posts: { type: 'result', headers: string[], rows: Array<Record<string,string>> } or { type: 'error', message }

function detectDelimiter(sample: string[]) {
  const candidates = [',', '\t', ';'];
  let best: { ch: string; score: number } = { ch: ',', score: -1 };
  for (const ch of candidates) {
    let score = 0;
    for (let i = 0; i < Math.min(sample.length, 5); i++) {
      const line = sample[i] ?? '';
      if (/^\s*Page\s+\d+\s+of\s+\d+\s*$/i.test(line)) continue;
      score += line.split(ch).length - 1 || 0;
    }
    if (score > best.score) best = { ch, score };
  }
  return best.ch;
}

function splitLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((s) => s.trim());
}

const ctx: any = self as unknown;

ctx.onmessage = (e: MessageEvent) => {
  try {
    const { type, text } = e.data || {};
    if (type !== 'parse' || typeof text !== 'string') return;

    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const delimiter = detectDelimiter(lines);
    const headerLine = lines.find((l) => !!l && !/^\s*Page\s+\d+\s+of\s+\d+\s*$/i.test(l)) || '';
    const headers = splitLine(headerLine, delimiter);
    const rows: Array<Record<string, string>> = [];

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      if (!rawLine) continue;
      if (rawLine === headerLine) continue;
      if (/^\s*Page\s+\d+\s+of\s+\d+\s*$/i.test(rawLine)) continue;
      const cols = splitLine(rawLine, delimiter);
      if (cols.every((c) => !c || c.trim().length === 0)) continue;
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => (row[h] = cols[idx] ?? ''));
      rows.push(row);
    }

    ctx.postMessage({ type: 'result', headers, rows });
  } catch (err) {
    ctx.postMessage({ type: 'error', message: err instanceof Error && err.message ? err.message : 'Parse failed' });
  }
};
```

## File: libs/uxcommon/src/components/detail-row/detail-row.ts

```typescript
import { Component, input, output } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

@Component({
  selector: 'pc-detail-row',
  imports: [Icon],
  template: `
    <div
      class="flex items-center justify-between p-2 rounded-lg bg-base-200/50 hover:bg-base-200 transition-colors text-sm w-full min-w-0 gap-3"
    >
      <div class="flex items-center gap-2 overflow-hidden min-w-0">
        @if (icon()) {
          <pc-icon [name]="icon()!" [size]="4" [class]="iconClass() + ' flex-shrink-0'"></pc-icon>
        }
        <div class="truncate text-base-content min-w-0">
          <ng-content></ng-content>
        </div>
      </div>

      @if (actionIcon()) {
        <button
          class="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-primary tooltip flex-shrink-0"
          [attr.data-tip]="actionTip()"
          (click)="onActionClick($event)"
        >
          <pc-icon [name]="actionIcon()!" [size]="4"></pc-icon>
        </button>
      } @else {
        <ng-content select="[pc-row-action]"></ng-content>
      }
    </div>
  `,
})
export class DetailRow {
  public icon = input<PcIconNameType | null | undefined>();
  public iconClass = input<string | null | undefined>('');
  public actionIcon = input<PcIconNameType | null | undefined>();
  public actionTip = input<string | null | undefined>('');

  public actionClick = output<MouseEvent>();

  protected onActionClick(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.actionClick.emit(event);
  }
}
```

## File: libs/uxcommon/src/components/entity-overview/entity-overview.ts

```typescript
import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'pc-entity-overview',
  imports: [DatePipe],
  template: `
    <div class="card bg-base-200/50 border border-base-300 shadow-md">
      <div class="card-body p-5 space-y-3">
        <h4 class="font-bold text-sm text-base-content uppercase tracking-wider">{{ title() }}</h4>
        <div class="text-xs text-base-content/75 space-y-2">
          <ng-content select="[pc-overview-prefix]"></ng-content>

          @if (createdAt()) {
            <div class="flex justify-between">
              <span>Created:</span>
              <span class="font-semibold">{{ createdAt() | date: 'medium' }}</span>
            </div>
          }
          @if (updatedAt()) {
            <div class="flex justify-between">
              <span>Last Updated:</span>
              <span class="font-semibold">{{ updatedAt() | date: 'medium' }}</span>
            </div>
          }
          @if (createdBy()) {
            <div class="flex justify-between">
              <span>Created By:</span>
              <span class="font-semibold">{{ createdBy() }}</span>
            </div>
          }

          <ng-content select="[pc-overview-suffix]"></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class EntityOverview {
  public title = input<string>('Overview');
  public createdAt = input<any>();
  public updatedAt = input<any>();
  public createdBy = input<string | null | undefined>();
}
```

## File: libs/uxcommon/src/components/fields-selector/fields-selector.ts

```typescript
import { Component, input, output } from '@angular/core';

const ALL_FIELDS: { key: string; label: string }[] = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'mobile', label: 'Mobile / Phone' },
  { key: 'notes', label: 'Notes' },
  { key: 'street1', label: 'Street Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State / Province' },
  { key: 'zip', label: 'Zip / Postal Code' },
  { key: 'country', label: 'Country' },
];

@Component({
  selector: 'pc-fields-selector',
  templateUrl: './fields-selector.html',
})
export class FieldsSelector {
  readonly selectedFields = input.required<string[]>();
  readonly fieldsChange = output<string[]>();

  protected readonly allFields = ALL_FIELDS;

  protected isEnabled(field: string): boolean {
    const list = this.selectedFields();
    return list.includes(field) || list.includes(`${field}:required`);
  }

  protected isRequired(field: string): boolean {
    return this.selectedFields().includes(`${field}:required`);
  }

  protected toggleField(field: string): void {
    const current = this.selectedFields();
    const enabled = current.includes(field) || current.includes(`${field}:required`);
    if (enabled) {
      this.fieldsChange.emit(current.filter((f) => f !== field && f !== `${field}:required`));
    } else {
      this.fieldsChange.emit([...current, field]);
    }
  }

  protected toggleRequired(field: string): void {
    const current = this.selectedFields();
    if (current.includes(field)) {
      this.fieldsChange.emit([...current.filter((f) => f !== field), `${field}:required`]);
    } else if (current.includes(`${field}:required`)) {
      this.fieldsChange.emit([...current.filter((f) => f !== `${field}:required`), field]);
    }
  }
}
```

## File: libs/uxcommon/src/components/geocode-chip/geocode-chip.ts

```typescript
import { Component, computed, input } from '@angular/core';
import { StatusBadge } from '../status-badge/status-badge';
import type { PcStatusType } from '../status-badge/status-badge';

/** The household geocoding lifecycle as stored in `households.geocoding_status`. */
export type PcGeocodeStatus = 'success' | 'pending' | 'failed' | null | undefined;

interface GeocodeChipSpec {
  label: string;
  type: PcStatusType;
}

/**
 * The single, binding surface for a household's geocode state (§6 consumers):
 * "Located / Locating… / Address problem" — never a hidden row. Wave 2
 * (canvassing readiness, delivery coverage) reads the same three states.
 *
 * DB status → chip:
 *  - `success`            → **Located** (success — done)
 *  - `pending` / `null`   → **Locating…** (info — in progress)
 *  - `failed`             → **Address problem** (warning — needs attention)
 */
export function geocodeChipSpec(status: PcGeocodeStatus | string): GeocodeChipSpec {
  switch (status) {
    case 'success':
      return { label: 'Located', type: 'success' };
    case 'failed':
      return { label: 'Address problem', type: 'warning' };
    default:
      return { label: 'Locating…', type: 'info' };
  }
}

@Component({
  selector: 'pc-geocode-chip',
  imports: [StatusBadge],
  template: ` <pc-status-badge [type]="spec().type" [size]="size()">{{ spec().label }}</pc-status-badge> `,
})
export class GeocodeChip {
  public readonly status = input<PcGeocodeStatus | string>(null);
  public readonly size = input<'sm' | 'md' | 'lg'>('sm');

  protected readonly spec = computed(() => geocodeChipSpec(this.status()));
}
```

## File: libs/uxcommon/src/components/icons/attachment-icon.ts

```typescript
// attachment-icon.component.ts
import { Component, computed, input } from '@angular/core';
import { ICON_FOR_KEY, iconKeyForFilename } from '@uxcommon/pipes/file-icon.util';

import { Icon } from './icon';

@Component({
  selector: 'pc-attachment-icon',
  imports: [Icon],
  template: ` <pc-icon [name]="icon()" [size]="size()" [class]="className()" [attr.title]="title()"></pc-icon> `,
})
export class AttachmentIconComponent {
  public className = input<string>('');

  // Inputs (signals API)
  public filename = input.required<string>();
  public icon = computed(() => {
    const key = iconKeyForFilename(this.filename());
    return ICON_FOR_KEY[key] ?? ICON_FOR_KEY.unknown;
  });
  public size = input<number>(6);
  public title = input<string | undefined>(undefined);
}
```

## File: libs/uxcommon/src/components/icons/icon.ts

```typescript
import { Component, WritableSignal, effect, input, signal } from '@angular/core';
import { BypassHtmlSanitizerPipe } from '@uxcommon/pipes/svg-html-pipe';

import { PcIconNameType, loadIconSvg } from './icons.index';

@Component({
  selector: 'pc-icon',
  imports: [BypassHtmlSanitizerPipe],
  template: `
    <div [class]="class()" (mouseenter)="hovering.set(true)" (mouseleave)="hovering.set(false)">
      @if (!hover() || !hovering()) {
        <div [innerHTML]="svgHtml() | bypassHtmlSanitizer"></div>
      } @else {
        <div [innerHTML]="hoverSvgHtml() | bypassHtmlSanitizer"></div>
      }
    </div>
  `,
})
export class Icon {
  private _hoverSvgHtml = signal<string>('');

  private _svgHtml = signal<string>('');

  public class = input<string>('');
  public hover = input<PcIconNameType | null>();
  public hoverSvgHtml = this._hoverSvgHtml.asReadonly();
  public hovering = signal(false);

  public name = input.required<PcIconNameType>();

  public size = input<number>(6);
  public svgHtml = this._svgHtml.asReadonly();

  constructor() {
    // Re-load whenever name or size changes
    effect(() => {
      void this.loadSvg(this.name(), this.size(), this._svgHtml);
    });

    effect(() => {
      const hoverName = this.hover();
      const size = this.size();
      if (!hoverName) {
        this._hoverSvgHtml.set('');
        return;
      }
      void this.loadSvg(hoverName, size, this._hoverSvgHtml);
    });
  }

  private injectClassOnSvg(svg: string, cls: string): string {
    // Normalize whitespace on the opening tag
    const openTagMatch = svg.match(/<svg\b[^>]*>/i);
    if (!openTagMatch) return svg; // not an SVG? bail

    const openTag = openTagMatch[0];

    // If class already exists, merge; otherwise add new class attribute
    if (/\bclass=/.test(openTag)) {
      const merged = openTag.replace(/\bclass=(["'])(.*?)\1/i, (_m, q, existing) => {
        // Remove existing sizing classes to prevent override conflicts (e.g. w-6, h-6, size-6)
        const cleaned = existing
          .split(/\s+/)
          .filter((c: string) => !/^(w-\d+(\.\d+)?|h-\d+(\.\d+)?|size-\d+(\.\d+)?)$/.test(c))
          .join(' ');
        return `class=${q}${cleaned} ${cls}${q}`.trim();
      });
      return svg.replace(openTag, merged);
    } else {
      const augmented = openTag.replace(/^<svg\b/i, `<svg class="${cls}"`);
      return svg.replace(openTag, augmented);
    }
  }

  private async loadSvg(name: PcIconNameType, size: number, target: WritableSignal<string>) {
    if (name === 'none') {
      target.set('');
    } else {
      // Fetch raw SVG text from /assets
      const raw = await loadIconSvg(name);
      // Inject Tailwind classes into the <svg> element
      const withClass = this.injectClassOnSvg(raw, `w-${size} h-${size}`);
      target.set(withClass);
    }
  }
}
```

## File: libs/uxcommon/src/components/input/input.ts

```typescript
import { Component, input, output } from '@angular/core';
import { FormField } from '@angular/forms/signals';

@Component({
  selector: 'pc-input',
  imports: [FormField],
  template: `
    <div class="flex flex-col gap-1 w-full">
      @if (label()) {
        <label class="label py-0 pl-1">
          <span class="label-text text-xs font-semibold text-base-content/70">{{ label() }}</span>
        </label>
      }

      <label
        class="input w-full flex items-center gap-2"
        [class.input-error]="
          hasError() || (formField()().invalid() && (formField()().dirty() || formField()().touched()))
        "
      >
        <ng-content select="[pc-prefix]"></ng-content>
        <input
          [type]="type()"
          [placeholder]="placeholder()"
          [formField]="formField()"
          class="grow"
          (blur)="blurred.emit()"
        />
        <ng-content select="[pc-suffix]"></ng-content>
      </label>

      @if ((hasError() || formField()().invalid()) && (formField()().dirty() || formField()().touched())) {
        @for (err of formField()().errors(); track err) {
          <p class="text-[11px] text-error pl-1">{{ err.message }}</p>
        }
      }
    </div>
  `,
})
export class Input {
  public label = input<string>();
  public type = input<string>('text');
  public placeholder = input<string>('');
  public formField = input.required<any>();
  public hasError = input<boolean>(false);
  public blurred = output<void>();
}
```

## File: libs/uxcommon/src/components/map/map-types.ts

```typescript
/**
 * Shared value types for the single Google Maps primitive, `<pc-map>`.
 *
 * These are the binding contract consumed by §6 (household card), §13
 * (canvassing turf polygons) and §14 (delivery routes / per-door dots). Keep
 * them free of any Google Maps SDK types so consumers and unit tests can build
 * marker/polygon inputs without loading the SDK.
 */

/** A plain latitude/longitude pair (never a `google.maps.LatLng`). */
export interface PcLatLng {
  lat: number;
  lng: number;
}

/**
 * Semantic colour bucket. Maps 1:1 to a DaisyUI `--color-*` token, resolved at
 * runtime so overlays stay correct across a light/dark theme flip. `muted`
 * resolves to `base-content` at reduced opacity.
 */
export type PcMapVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'muted';

/** One point marker. `payload` is echoed back on `markerClicked`. */
export interface PcMapMarker<T = unknown> {
  position: PcLatLng;
  variant?: PcMapVariant;
  tooltip?: string;
  id?: string;
  payload?: T;
}

/** One filled polygon (a turf boundary). `payload` is echoed on `polygonClicked`. */
export interface PcMapPolygon<T = unknown> {
  path: PcLatLng[];
  variant?: PcMapVariant;
  label?: string;
  dashed?: boolean;
  id?: string;
  payload?: T;
}
```

## File: libs/uxcommon/src/components/map/map.ts

```typescript
import { Component, ElementRef, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { Loader } from '@googlemaps/js-api-loader';
import { Icon } from '../icons/icon';
import type { PcLatLng, PcMapMarker, PcMapPolygon, PcMapVariant } from './map-types';

const DEFAULT_ZOOM = 14;
const DEFAULT_MAP_ID = 'DEMO_MAP_ID';
const FILL_OPACITY = 0.18;
const MUTED_OPACITY = 0.55;

/**
 * `<pc-map>` — the single Google Maps primitive for the whole app (§13 maps
 * ruling: Google Maps Platform only, no mixed providers).
 *
 * - **Real browser + a provided `Loader`** → lazy-loads the `maps` + `marker`
 *   libraries and draws markers/polygons tinted by DaisyUI semantic tokens.
 * - **No `Loader` (unit tests) / offline / a load failure** → renders a
 *   deterministic placeholder (a pin icon + label) and never touches the
 *   network. This mirrors the geocoding mock's degrade-don't-crash approach, so
 *   the app never crashes and never fakes a pin.
 *
 * See `docs/spec/pc-map-usage.md` for the three consumption patterns and the
 * binding input/output contract.
 */
@Component({
  selector: 'pc-map',
  imports: [Icon],
  template: `
    @if (ready()) {
      <div #mapHost class="h-full w-full min-h-40"></div>
    } @else {
      <div
        class="flex h-full w-full min-h-40 flex-col items-center justify-center gap-2 rounded-lg bg-base-200 text-base-content/40 select-none"
        role="img"
        [attr.aria-label]="ariaLabel()"
      >
        <pc-icon name="map-pin" [size]="8" class="text-base-content/25"></pc-icon>
        <span class="text-xs font-medium text-base-content/50">{{ placeholderLabel() }}</span>
      </div>
    }
  `,
})
export class PcMap {
  /** Optional so unit tests (and any host without the SDK key) fall back to the placeholder. */
  private readonly loader = inject(Loader, { optional: true });

  public readonly markers = input<PcMapMarker[]>([]);
  public readonly polygons = input<PcMapPolygon[]>([]);
  public readonly center = input<PcLatLng | null>(null);
  public readonly zoom = input<number>(DEFAULT_ZOOM);
  public readonly fitBounds = input<boolean>(true);
  public readonly interactive = input<boolean>(true);
  public readonly deepLink = input<boolean>(false);
  public readonly mapId = input<string>(DEFAULT_MAP_ID);
  public readonly ariaLabel = input<string>('Map');

  public readonly markerClicked = output<PcMapMarker>();
  public readonly polygonClicked = output<PcMapPolygon>();

  protected readonly ready = signal(false);

  private readonly mapHost = viewChild<ElementRef<HTMLElement>>('mapHost');

  private map: google.maps.Map | null = null;
  private drawnMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
  private drawnPolygons: google.maps.Polygon[] = [];
  private themeObserver: MutationObserver | null = null;

  protected readonly placeholderLabel = signal('Map unavailable');

  constructor() {
    // Kick off the SDK load once. If there is no Loader we stay a placeholder.
    void this.tryLoad();

    // Redraw whenever inputs change and the map is live.
    effect(() => {
      const markers = this.markers();
      const polygons = this.polygons();
      // Recompute the placeholder caption from current content.
      this.placeholderLabel.set(this.computePlaceholderLabel(markers, polygons));
      if (this.map) {
        this.redraw(markers, polygons);
      }
    });

    // Once the host element materialises (after `ready` flips), build the map.
    effect(() => {
      const host = this.mapHost();
      if (host && !this.map) {
        this.buildMap(host.nativeElement);
      }
    });
  }

  private async tryLoad(): Promise<void> {
    if (!this.loader) return;
    try {
      await this.loader.importLibrary('maps');
      await this.loader.importLibrary('marker');
      this.ready.set(true);
    } catch {
      // Bad key / offline / blocked — stay on the honest placeholder.
      this.ready.set(false);
    }
  }

  private buildMap(hostEl: HTMLElement): void {
    try {
      const explicitCenter = this.center();
      this.map = new google.maps.Map(hostEl, {
        center: explicitCenter ?? { lat: 0, lng: 0 },
        zoom: this.zoom(),
        mapId: this.mapId(),
        disableDefaultUI: !this.interactive(),
        gestureHandling: this.interactive() ? 'greedy' : 'none',
        scrollwheel: false, // §13.3 — keep the page scrolling
        streetViewControl: false,
        mapTypeControl: false,
        keyboardShortcuts: this.interactive(),
      });

      if (this.deepLink()) {
        this.map.addListener('click', () => this.openInMapsApp());
        hostEl.style.cursor = 'pointer';
      }

      this.observeTheme();
      this.redraw(this.markers(), this.polygons());
    } catch {
      // A partial/broken SDK (or an offline draw failure) degrades to the
      // honest placeholder rather than crashing the host page.
      this.map = null;
      this.ready.set(false);
    }
  }

  private redraw(markers: PcMapMarker[], polygons: PcMapPolygon[]): void {
    if (!this.map) return;
    this.clearOverlays();

    for (const poly of polygons) {
      this.drawPolygon(poly);
    }
    for (const marker of markers) {
      this.drawMarker(marker);
    }

    if (!this.center()) {
      this.fitToContent(markers, polygons);
    }
  }

  private drawMarker(marker: PcMapMarker): void {
    if (!this.map) return;
    const color = this.resolveColor(marker.variant ?? 'primary');
    const pin = document.createElement('div');
    pin.style.width = '14px';
    pin.style.height = '14px';
    pin.style.borderRadius = '9999px';
    pin.style.background = color;
    pin.style.border = '2px solid var(--color-base-100, #fff)';
    pin.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)';
    if (marker.tooltip) pin.title = marker.tooltip;

    const advanced = new google.maps.marker.AdvancedMarkerElement({
      map: this.map,
      position: marker.position,
      content: pin,
      title: marker.tooltip ?? '',
      gmpClickable: true,
    });
    advanced.addListener('gmp-click', () => {
      this.markerClicked.emit(marker);
      if (this.deepLink()) this.openInMapsApp(marker.position);
    });
    this.drawnMarkers.push(advanced);
  }

  private drawPolygon(poly: PcMapPolygon): void {
    if (!this.map) return;
    const color = this.resolveColor(poly.variant ?? 'neutral');
    const shape = new google.maps.Polygon({
      map: this.map,
      paths: poly.path,
      strokeColor: color,
      // Polygons can't render a dashed outline (that's a Polyline feature); a
      // dashed turf uses a thinner, lower-opacity solid stroke for now.
      // TODO(Wave 2F turf boundaries): overlay a dashed Polyline for `poly.dashed`.
      strokeWeight: poly.dashed ? 1.5 : 2,
      strokeOpacity: poly.dashed ? 0.6 : 0.9,
      fillColor: color,
      fillOpacity: FILL_OPACITY,
      clickable: true,
    });
    shape.addListener('click', () => this.polygonClicked.emit(poly));
    this.drawnPolygons.push(shape);
  }

  private fitToContent(markers: PcMapMarker[], polygons: PcMapPolygon[]): void {
    if (!this.map || !this.fitBounds()) return;
    const bounds = new google.maps.LatLngBounds();
    let has = false;
    for (const m of markers) {
      bounds.extend(m.position);
      has = true;
    }
    for (const p of polygons) {
      for (const pt of p.path) {
        bounds.extend(pt);
        has = true;
      }
    }
    if (!has) return;
    const soleMarker = markers.length === 1 && polygons.length === 0 ? markers[0] : undefined;
    if (soleMarker) {
      // A single door reads better centred at a street zoom than fit-to-point.
      this.map.setCenter(soleMarker.position);
      this.map.setZoom(this.zoom());
      return;
    }
    this.map.fitBounds(bounds);
  }

  private clearOverlays(): void {
    for (const m of this.drawnMarkers) m.map = null;
    for (const p of this.drawnPolygons) p.setMap(null);
    this.drawnMarkers = [];
    this.drawnPolygons = [];
  }

  private observeTheme(): void {
    if (this.themeObserver || typeof MutationObserver === 'undefined') return;
    this.themeObserver = new MutationObserver(() => this.redraw(this.markers(), this.polygons()));
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  private openInMapsApp(position?: PcLatLng): void {
    const target = position ?? this.center() ?? this.markers()[0]?.position;
    if (!target) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${target.lat},${target.lng}`;
    window.open(url, '_blank', 'noopener');
  }

  /**
   * Resolve a semantic variant to a concrete CSS colour string Google's canvas
   * renderer accepts. Reads the live DaisyUI `--color-*` token through a probe
   * element so the value survives a theme flip.
   */
  private resolveColor(variant: PcMapVariant): string {
    const token = variant === 'muted' ? 'base-content' : variant;
    const host = this.mapHost()?.nativeElement ?? document.body;
    const probe = document.createElement('span');
    probe.style.color = `var(--color-${token})`;
    probe.style.display = 'none';
    host.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    host.removeChild(probe);
    if (variant === 'muted' && resolved.startsWith('rgb')) {
      return resolved.replace('rgb(', 'rgba(').replace(')', `, ${MUTED_OPACITY})`);
    }
    return resolved || '#3b82f6';
  }

  private computePlaceholderLabel(markers: PcMapMarker[], polygons: PcMapPolygon[]): string {
    if (markers.length === 0 && polygons.length === 0) return this.ariaLabel();
    const parts: string[] = [];
    if (markers.length) parts.push(`${markers.length} ${markers.length === 1 ? 'location' : 'locations'}`);
    if (polygons.length) parts.push(`${polygons.length} ${polygons.length === 1 ? 'area' : 'areas'}`);
    return parts.join(' · ');
  }
}
```

## File: libs/uxcommon/src/components/not-found/not-found.ts

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'pc-not-found',
  imports: [],
  template: `<section class="min-h-full">
    <div class="md:px-12 lg:px-0">
      <div class="max-auto w-full justify-center text-center lg:p-10">
        <div class="mx-auto w-full justify-center">
          <p class="text-5xl tracking-tight lg:text-9xl">404</p>
          <p class="mx-auto mt-4 max-w-xl text-lg font-light">Please check the URL in the address bar and try again.</p>
        </div>
        <div class="mt-10 flex justify-center gap-3">
          <a href="/" class="link link-hover">Home&nbsp; → </a>
        </div>
      </div>
    </div>
  </section>`,
})
export class NotFound {}
```

## File: libs/uxcommon/src/components/profile-card/profile-card.ts

```typescript
import { Component, input } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

@Component({
  selector: 'pc-profile-card',
  imports: [Icon],
  template: `
    <div class="card bg-base-100 shadow-xl overflow-hidden border border-base-300 w-full">
      <!-- Decorative Card Header Gradient -->
      <div class="h-24 bg-gradient-to-r from-primary/20 via-primary/30 to-secondary/20"></div>

      <div class="px-6 pb-6 relative flex flex-col items-center">
        <!-- Avatar / Placeholder -->
        @if (avatarUrl() || avatarText() || iconName()) {
          <div class="avatar placeholder -mt-12 mb-3">
            <div
              class="bg-gradient-to-tr from-primary to-secondary text-primary-content rounded-full w-24 h-24 ring ring-base-100 ring-offset-4 text-3xl font-bold flex items-center justify-center shadow-lg overflow-hidden"
            >
              @if (avatarUrl()) {
                <img [src]="avatarUrl()!" alt="Avatar" class="w-full h-full object-cover" />
              } @else if (avatarText()) {
                {{ avatarText() }}
              } @else if (iconName()) {
                <pc-icon [name]="iconName()!" [size]="10"></pc-icon>
              }
            </div>
          </div>
        }

        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class ProfileCard {
  public avatarUrl = input<string | null | undefined>();
  public avatarText = input<string | null | undefined>();
  public iconName = input<PcIconNameType | null | undefined>();
}
```

## File: libs/uxcommon/src/components/public-link-panel/public-link-panel.ts

```typescript
import { Component, inject, input } from '@angular/core';
import { AlertService } from '../alerts/alert-service';
import { Card as PcCard } from '../card/card';
import { Icon } from '../icons/icon';

@Component({
  selector: 'pc-public-link-panel',
  imports: [Icon, PcCard],
  templateUrl: './public-link-panel.html',
})
export class PublicLinkPanel {
  readonly url = input.required<string>();
  readonly label = input<string>('Public Link');
  readonly subtitle = input<string>('Share this link so people can sign up.');

  private readonly alertSvc = inject(AlertService);

  protected copyUrl(): void {
    navigator.clipboard
      .writeText(this.url())
      .then(() => {
        this.alertSvc.showSuccess('Link copied to clipboard!');
      })
      .catch((_e) => this.alertSvc.showError('Could not copy link to clipboard'));
  }
}
```

## File: libs/uxcommon/src/components/select/select.ts

```typescript
import { Component, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';

@Component({
  selector: 'pc-select',
  imports: [FormField],
  template: `
    <div class="flex flex-col gap-1 w-full">
      @if (label()) {
        <label class="label py-0 pl-1">
          <span class="label-text text-xs font-semibold text-base-content/70">{{ label() }}</span>
        </label>
      }

      <select
        [formField]="formField()"
        class="select select-bordered w-full"
        [class.select-error]="formField()().invalid() && (formField()().dirty() || formField()().touched())"
      >
        @if (placeholder()) {
          <option value="">{{ placeholder() }}</option>
        }
        <ng-content></ng-content>
      </select>

      @if (formField()().invalid() && (formField()().dirty() || formField()().touched())) {
        @for (err of formField()().errors(); track err) {
          <p class="text-[11px] text-error pl-1">{{ err.message }}</p>
        }
      }
    </div>
  `,
})
export class Select {
  public label = input<string>();
  public placeholder = input<string>('');
  public formField = input.required<any>();
}
```

## File: libs/uxcommon/src/components/side-drawer/side-drawer.ts

```typescript
import { Component, input, output } from '@angular/core';
import { Icon } from '@icons/icon';

@Component({
  selector: 'pc-side-drawer',
  imports: [Icon],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-30 flex justify-end">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/30 transition-opacity duration-300" (click)="onClose()"></div>
        <!-- Panel -->
        <div
          class="relative h-full w-full max-w-[90vw] bg-base-100 shadow-xl border-l border-base-300 flex flex-col z-10 transition-transform duration-300"
          [class]="widthClass()"
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b border-base-300">
            <div class="font-semibold text-base-content text-lg">
              {{ title() }}
            </div>
            <button class="btn btn-ghost btn-sm btn-circle" (click)="onClose()" aria-label="Close drawer">
              <pc-icon name="x-mark" [size]="4"></pc-icon>
            </button>
          </div>
          <!-- Body -->
          <div class="p-4 flex flex-col gap-3 overflow-y-auto flex-grow">
            <ng-content></ng-content>
          </div>
          <!-- Footer -->
          <ng-content select="[pc-drawer-footer]"></ng-content>
        </div>
      </div>
    }
  `,
})
export class SideDrawer {
  public isOpen = input.required<boolean>();
  public title = input<string>('');
  public size = input<'sm' | 'md' | 'lg'>('sm');
  public close = output<void>();

  protected onClose() {
    this.close.emit();
  }

  protected widthClass() {
    const s = this.size();
    if (s === 'lg') return 'sm:w-[700px]';
    if (s === 'md') return 'sm:w-[540px]';
    return 'sm:w-[420px]';
  }
}
```

## File: libs/uxcommon/src/components/system-metadata/system-metadata.ts

```typescript
import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'pc-system-metadata',
  imports: [DatePipe],
  template: `
    <div
      class="w-full mt-6 pt-4 border-t border-base-200 text-[10px] text-base-content/40 flex gap-4 leading-normal"
      [class.justify-between]="layout() === 'row'"
      [class.flex-col]="layout() === 'col'"
      [class.gap-1]="layout() === 'col'"
    >
      @if (createdAt()) {
        <span
          >Created
          @if (createdBy() && createdBy() !== '?') {
            by {{ createdBy() }}
          }
          on {{ createdAt() | date: dateFormat() }}</span
        >
      }
      @if (updatedAt()) {
        <span
          >Updated {{ updatedAt() | date: dateFormat() }}
          @if (updatedBy() && updatedBy() !== '?') {
            by {{ updatedBy() }}
          }
        </span>
      }
    </div>
  `,
})
export class SystemMetadata {
  public createdAt = input<any>();
  public updatedAt = input<any>();
  public createdBy = input<string | null | undefined>();
  public updatedBy = input<string | null | undefined>();
  public layout = input<'row' | 'col'>('row');
  public dateFormat = input<string>('M/d/yyyy');
}
```

## File: libs/uxcommon/src/components/tags/tagitem.css

```css
:host {
  display: inline-block;
  max-width: 100%;
}

.badge {
  display: inline-flex;
  align-items: flex-start;
  gap: 0.25rem;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  min-height: 1.5rem;
  height: auto;
  line-height: 1.2;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.tag-label {
  flex: 1 1 auto;
  min-width: 0;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  line-height: 1.2;
}

.tag-remove {
  align-self: flex-start;
  margin-top: 0.125rem;
}

.badge-compact {
  font-size: 0.7rem !important;
  font-weight: 500 !important;
  min-height: 1.25rem !important;
  height: auto !important;
  align-items: center !important;
  padding-top: 0.125rem !important;
  padding-bottom: 0.125rem !important;
  padding-left: 0.375rem !important;
  padding-right: 0.375rem !important;
}

.badge-compact .tag-label {
  font-size: 0.7rem !important;
  line-height: 1.15 !important;
  padding-right: 0 !important;
}

.badge-compact .tag-remove {
  margin-top: 0 !important;
  align-self: center !important;
}
```

## File: libs/uxcommon/src/components/tags/tagitem.ts

```typescript
import { Component, Signal, computed, input, output, signal } from '@angular/core';
import { Icon } from '@icons/icon';

@Component({
  selector: 'pc-tagitem',
  imports: [Icon],
  styleUrl: './tagitem.css',
  template: `<div
    class="badge rounded-lg px-0 gap-1 pl-2 bordered"
    [class.badge-compact]="compact()"
    [style.background]="background() || null"
    [style.color]="textColor()"
    [style.borderColor]="borderColor()"
  >
    <span
      (click)="emitClick()"
      class="tag-label cursor-pointer font-light pr-1"
      [class.pr-2]="!canDelete()"
      [style.color]="textColor()"
    >
      {{ displayName() }}</span
    >
    <pc-icon
      name="x-mark"
      [size]="3"
      class="tag-remove hover:text-error cursor-pointer pr-1 mr-0"
      [style.color]="textColor()"
      [class.hidden]="!canDelete()"
      (click)="emitClose()"
    />
  </div> `,
})
export class TagItem {
  protected readonly background = computed(() => this.normalizeColor(this.color()));
  protected readonly borderColor = computed(() => this.background() ?? null);
  protected readonly displayName = computed(() => {
    const n = this.name();
    return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
  });
  protected readonly textColor = computed(() => this.computeTextColor(this.background()));

  public readonly click = output<string>();
  public readonly close = output<string>();

  public canDelete = input<boolean>(true);
  public color = input<string | null | undefined>(null);
  public compact = input<boolean>(false);
  public invisible = input<Signal<boolean>>(signal(false));
  public name = input.required<string>();

  public emitClick() {
    this.click.emit(this.name());
  }

  public emitClose() {
    this.close.emit(this.name());
  }

  private computeTextColor(hex: string | null): string | null {
    if (!hex) return null;
    const rgb = this.hexToRgb(hex);
    if (!rgb) return '#f9fafb';
    const [r = 0, g = 0, b = 0] = rgb.map((v) => v / 255);
    const [rLin = 0, gLin = 0, bLin = 0] = [r, g, b].map((v) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
    );
    const luminance = 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
    return luminance > 0.5 ? '#111827' : '#f9fafb';
  }

  private hexToRgb(hex: string): [number, number, number] | null {
    const normalized = hex.replace('#', '');
    const int = parseInt(normalized, 16);
    if (Number.isNaN(int)) return null;
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
  }

  private normalizeColor(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!/^#?[0-9a-fA-F]{6}$/.test(trimmed)) return null;
    return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  }
}
```

## File: libs/uxcommon/src/components/textarea/textarea.ts

```typescript
import { Component, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';

@Component({
  selector: 'pc-textarea',
  imports: [FormField],
  template: `
    <div class="flex flex-col gap-1 w-full">
      @if (label()) {
        <label class="label py-0 pl-1">
          <span class="label-text text-xs font-semibold text-base-content/70">{{ label() }}</span>
        </label>
      }

      <textarea
        [placeholder]="placeholder()"
        [formField]="formField()"
        [rows]="rows()"
        class="textarea textarea-bordered w-full"
        [class.textarea-error]="
          hasError() || (formField()().invalid() && (formField()().dirty() || formField()().touched()))
        "
      ></textarea>

      @if ((hasError() || formField()().invalid()) && (formField()().dirty() || formField()().touched())) {
        @for (err of formField()().errors(); track err) {
          <p class="text-[11px] text-error pl-1">{{ err.message }}</p>
        }
      }
    </div>
  `,
})
export class Textarea {
  public label = input<string>();
  public placeholder = input<string>('');
  public rows = input<number>(3);
  public formField = input.required<any>();
  public hasError = input<boolean>(false);
}
```

## File: libs/uxcommon/src/components/toggle/toggle.ts

```typescript
import { Component, input } from '@angular/core';
import { FormField } from '@angular/forms/signals';

@Component({
  selector: 'pc-toggle',
  imports: [FormField],
  template: `
    <div class="flex flex-col gap-1 w-full">
      <label class="label cursor-pointer justify-between gap-4 py-1">
        @if (label()) {
          <span class="label-text text-sm font-medium text-base-content">{{ label() }}</span>
        }
        <input
          type="checkbox"
          class="toggle toggle-primary shrink-0"
          [formField]="formField()"
          [class.toggle-error]="formField()().invalid() && (formField()().dirty() || formField()().touched())"
        />
      </label>

      @if (formField()().invalid() && (formField()().dirty() || formField()().touched())) {
        @for (err of formField()().errors(); track err) {
          <p class="text-[11px] text-error pl-1">{{ err.message }}</p>
        }
      }
    </div>
  `,
})
export class Toggle {
  public label = input<string>();
  public formField = input.required<any>();
}
```

## File: libs/uxcommon/src/components/confirm-dialog.service.ts

```typescript
import { signal, computed, Service } from '@angular/core';
import type { PcIconNameType } from '@icons/icons.index';

export interface DialogChoice<T = any> {
  label: string;
  value: T;
  variant?: DialogVariant;
}

export interface ChooseOptions<T = any> {
  allowBackdropClose?: boolean;
  cancelText?: string;
  choices: DialogChoice<T>[];
  icon?: PcIconNameType;
  message?: string;
  title: string;
  variant?: DialogVariant;
}

export interface BaseDialogOptions {
  allowBackdropClose?: boolean; // default true for alert/prompt, false for danger confirm
  cancelText?: string; // default per type
  confirmText?: string; // default per type
  /** Style cancel as the primary/safe-default button and confirm as a plain variant-colored one (e.g. "Keep editing" vs. "Discard changes"). */
  emphasizeCancel?: boolean;
  icon?: PcIconNameType; // optional icon name for <pc-icon>
  message?: string;
  title: string;
  variant?: DialogVariant;
}

export interface DialogState {
  allowBackdropClose: boolean;
  cancelText: string;
  confirmText: string;
  defaultValue?: string;
  emphasizeCancel?: boolean;
  icon?: PcIconNameType;

  // prompt
  inputPlaceholder?: string;
  message?: string;
  title: string;
  type: DialogType;
  variant: DialogVariant;

  // choose
  choices?: DialogChoice[];
}

export interface PromptOptions extends BaseDialogOptions {
  defaultValue?: string;
  inputPlaceholder?: string;
}

@Service()
export class ConfirmDialogService {
  private _resolve: ((value?: any) => void) | null = null;

  public readonly stateSignal = signal<DialogState | null>(null);

  public readonly isOpenSignal = computed(() => this.stateSignal() !== null);

  public alert(opts: BaseDialogOptions): Promise<void> {
    this.open({
      type: 'alert',
      title: opts.title,
      message: opts.message,
      variant: opts.variant ?? 'info',
      icon: opts.icon ?? this.defaultIconFor(opts.variant ?? 'info'),
      allowBackdropClose: opts.allowBackdropClose ?? true,
      confirmText: 'OK',
      cancelText: '',
    });
    return new Promise<void>((resolve) => (this._resolve = resolve));
  }

  public cancel(): void {
    // Normalize cancel values per dialog type
    const st = this.stateSignal();
    if (st?.type === 'confirm') this._resolve?.(false);
    else if (st?.type === 'alert') this._resolve?.();
    else if (st?.type === 'prompt') this._resolve?.(null);
    else if (st?.type === 'choose') this._resolve?.(null);
    this.close();
  }

  public confirm(opts: BaseDialogOptions): Promise<boolean> {
    const v = opts.variant ?? 'neutral';
    const allowBackdropClose = opts.allowBackdropClose ?? v !== 'danger';
    const confirmText = opts.confirmText ?? (v === 'danger' ? 'Delete' : 'OK');
    const cancelText = opts.cancelText ?? 'Cancel';

    this.open({
      type: 'confirm',
      title: opts.title,
      message: opts.message,
      variant: v,
      icon: opts.icon ?? this.defaultIconFor(v),
      allowBackdropClose,
      confirmText,
      cancelText,
      emphasizeCancel: opts.emphasizeCancel,
    });

    return new Promise<boolean>((resolve) => (this._resolve = resolve));
  }

  public choose<T>(opts: ChooseOptions<T>): Promise<T | null> {
    const v = opts.variant ?? 'neutral';
    this.open({
      type: 'choose',
      title: opts.title,
      message: opts.message,
      variant: v,
      icon: opts.icon ?? this.defaultIconFor(v),
      allowBackdropClose: opts.allowBackdropClose ?? true,
      confirmText: '',
      cancelText: opts.cancelText ?? 'Cancel',
      choices: opts.choices,
    });

    return new Promise<T | null>((resolve) => (this._resolve = resolve));
  }

  public defaultIconFor(variant: DialogVariant): PcIconNameType {
    switch (variant) {
      case 'danger':
        return 'exclamation-triangle';
      case 'warning':
        return 'exclamation-circle';
      case 'info':
        return 'information-circle';
      case 'success':
        return 'check-circle';
      default:
        return 'x-mark';
    }
  }

  public ok(payload?: unknown): void {
    this._resolve?.(payload ?? true);
    this.close();
  }

  public prompt(opts: PromptOptions): Promise<string | null> {
    this.open({
      type: 'prompt',
      title: opts.title,
      message: opts.message,
      variant: opts.variant ?? 'neutral',
      icon: opts.icon ?? ('pencil-square' as PcIconNameType),
      allowBackdropClose: opts.allowBackdropClose ?? true,
      confirmText: opts.confirmText ?? 'OK',
      cancelText: opts.cancelText ?? 'Cancel',
      inputPlaceholder: opts.inputPlaceholder,
      defaultValue: opts.defaultValue,
    });
    return new Promise<string | null>((resolve) => (this._resolve = resolve));
  }

  private close(): void {
    this.stateSignal.set(null);
    this._resolve = null;
  }

  private open(st: DialogState): void {
    this.stateSignal.set(st);
  }
}

export type DialogType = 'confirm' | 'alert' | 'prompt' | 'choose';

export type DialogVariant = 'danger' | 'warning' | 'info' | 'success' | 'neutral';
```

## File: libs/uxcommon/src/directives/animate-if.directive.ts

```typescript
import {
  Directive,
  DestroyRef,
  EmbeddedViewRef,
  Signal,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
} from '@angular/core';

@Directive({
  selector: '[pcAnimateIf]',
})
export class AnimateIfDirective {
  private readonly template = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);

  public readonly duration = input(300, { alias: 'pcAnimateIfDuration' });

  public readonly pcAnimateIfEnter = input('animate-left');

  public readonly pcAnimateIfExit = input('animate-exit-right');

  public readonly pcAnimateIf = input.required<Signal<boolean>>();

  private condition = false;
  private timeoutId: NodeJS.Timeout | undefined;
  private view: EmbeddedViewRef<unknown> | null = null;

  constructor() {
    effect(() => {
      const conditionSignal = this.pcAnimateIf();
      if (conditionSignal) {
        this.toggle(conditionSignal());
      }
    });

    this.destroyRef.onDestroy(() => {
      clearTimeout(this.timeoutId);

      if (this.view?.rootNodes[0]) {
        const el = this.view.rootNodes[0] as HTMLElement;
        el?.classList.remove(this.pcAnimateIfEnter(), this.pcAnimateIfExit());
      }
    });
  }

  private animatedEntry() {
    this.vcr.clear();
    this.view = this.vcr.createEmbeddedView(this.template);
    const enterClass = this.pcAnimateIfEnter();
    const el = this.view.rootNodes[0] as HTMLElement;
    requestAnimationFrame(() => el?.classList.add(enterClass));
  }

  private animatedExit() {
    if (!this.view?.rootNodes[0]) return;

    const el = this.view.rootNodes[0] as HTMLElement;
    const enterClass = this.pcAnimateIfEnter();
    const exitClass = this.pcAnimateIfExit();

    // Remove entry animation in case it's still applied
    el.classList.remove(enterClass);

    // If exit animation is 'animate-none', clear the view immediately without delay
    if (exitClass === 'animate-none') {
      this.vcr.clear();
      this.view = null;
      return;
    }

    // Add exit animation
    el.classList.add(exitClass);

    this.timeoutId = setTimeout(() => {
      // Cleanup all animation classes before removal
      el.classList.remove(enterClass, exitClass);
      this.vcr.clear();
      this.view = null;
    }, this.duration());
  }

  private toggle(condition: boolean) {
    if (condition === this.condition) return;

    this.condition = condition;

    if (condition) this.animatedEntry();
    else if (this.view) this.animatedExit();
  }
}
```

## File: libs/uxcommon/src/mentions/mention-controller.ts

```typescript
import { computed, signal } from '@angular/core';
import type { IAuthUser } from '../../../common/src/lib/auth';

export class MentionController {
  private getUsers: () => IAuthUser[];

  // reactive state
  public readonly open = signal(false);
  public readonly index = signal(0);
  public readonly query = signal('');

  // ephemeral caret/selection details
  private start = -1; // position of '@'
  private caretPos = 0;

  public readonly candidates = computed<IAuthUser[]>(() => {
    const q = this.query().toLowerCase();
    if (!this.open() || !q) return [];
    const users = this.getUsers() || [];
    const uniq = new Map<string, IAuthUser>();
    for (const u of users) {
      if (!u) continue;
      const name = (u.first_name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const local = email.split('@')[0] || '';
      if ((name && name.includes(q)) || (local && local.includes(q)) || (email && email.includes(q))) {
        if (!uniq.has(u.id)) uniq.set(u.id, u);
      }
    }
    return Array.from(uniq.values()).slice(0, 8);
  });

  constructor(getUsers: () => IAuthUser[]) {
    this.getUsers = getUsers;
  }

  public updateFromInput(text: string, caretPos: number): void {
    this.caretPos = caretPos;
    const res = this.findMentionAt(text, caretPos);
    if (!res) {
      this.open.set(false);
      this.query.set('');
      this.start = -1;
    } else {
      this.start = res.start;
      this.query.set(res.token);
      this.open.set(true);
      this.index.set(0);
    }
  }

  public handleKeydown(ev: KeyboardEvent, onSelect: (u: IAuthUser) => void): void {
    if (!this.open()) return;
    const list = this.candidates();
    if (!list.length) return;
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.index.set((this.index() + 1) % list.length);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.index.set((this.index() - 1 + list.length) % list.length);
    } else if (ev.key === 'Enter' || ev.key === 'Tab') {
      ev.preventDefault();
      onSelect(list[this.index()]!);
    } else if (ev.key === 'Escape') {
      this.open.set(false);
    }
  }

  public select(user: IAuthUser, text: string): { text: string; caret: number } {
    if (this.start < 0) return { text, caret: this.caretPos };
    const display = user.first_name || user.email.split('@')[0]!;
    let before = text.slice(0, this.start);
    // Collapse any trailing whitespace/newlines immediately before '@' into a single space to keep inline
    before = before.replace(/\s+$/g, ' ');
    const after = text.slice(this.caretPos);
    const inserted = `@${display} `;
    const newText = before + inserted + after;
    const newCaret = before.length + inserted.length;
    this.open.set(false);
    this.index.set(0);
    return { text: newText, caret: newCaret };
  }

  public getStartIndex(): number {
    return this.start;
  }

  public getCaretIndex(): number {
    return this.caretPos;
  }

  private findMentionAt(text: string, pos: number): { start: number; token: string } | null {
    let i = pos - 1;
    while (i >= 0) {
      const ch = text[i]!;
      if (ch === '@') break;
      if (!/[-A-Za-z0-9_.]/.test(ch)) return null; // hit a separator before '@'
      i--;
    }
    if (i < 0 || text[i]! !== '@') return null;
    const start = i;
    if (start > 0) {
      const prev = text[start - 1]!;
      if (/[@A-Za-z0-9_]/.test(prev)) return null;
    }
    const token = text.slice(start + 1, pos);
    if (!token) return null;
    return { start, token };
  }
}

export function userDisplay(u: IAuthUser): string {
  return u.first_name || u.email.split('@')[0]!;
}
```

## File: libs/uxcommon/src/pipes/file-icon.pipe.ts

```typescript
// file-icon.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

import { ICON_FOR_KEY, iconKeyForFilename } from './file-icon.util';

@Pipe({
  name: 'fileIcon',
})
export class FileIconPipe implements PipeTransform {
  public transform(filename: string | null | undefined): string {
    const key = iconKeyForFilename(filename ?? '');
    return ICON_FOR_KEY[key] ?? ICON_FOR_KEY.unknown;
  }
}
```

## File: libs/uxcommon/src/pipes/file-icon.util.ts

```typescript
import type { PcIconNameType } from '@icons/icons.index';

// file-icon.util.ts
export type FileIconKey =
  | 'pdf'
  | 'doc'
  | 'sheet'
  | 'slides'
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'archive'
  | 'code'
  | 'design'
  | 'font'
  | 'ebook'
  | 'email'
  | 'calendar'
  | 'contact'
  | 'db'
  | 'disk'
  | 'exe'
  | 'unknown';

function cleanName(name: string): string {
  // strip query/hash (e.g., foo.pdf?dl=1#x)
  return name.split('#')[0]!.split('?')[0]!.trim();
}

export function iconKeyForFilename(filename: string): FileIconKey {
  if (!filename) return 'unknown';
  const name = cleanName(filename.toLowerCase());

  // multi-part extensions first (e.g., .tar.gz)
  for (const mex of MULTI_EXT) {
    if (name.endsWith(`.${mex}`)) return 'archive';
  }

  // single extension
  const lastDot = name.lastIndexOf('.');
  if (lastDot === -1 || lastDot === name.length - 1) return 'unknown';
  const ext = name.slice(lastDot + 1);
  return EXT_TO_KEY[ext] ?? 'unknown';
}

const EXT_MAP: Record<FileIconKey, string[]> = {
  pdf: ['pdf'],
  doc: ['doc', 'docx', 'rtf', 'odt', 'pages'],
  sheet: ['xls', 'xlsx', 'csv', 'tsv', 'ods', 'numbers'],
  slides: ['ppt', 'pptx', 'key', 'odp'],
  text: ['txt', 'md', 'markdown', 'rst', 'log'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'tiff', 'tif', 'heic', 'heif'],
  audio: ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'oga'],
  video: ['mp4', 'm4v', 'mov', 'mkv', 'webm', 'avi', 'wmv'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz'],
  code: [
    'js',
    'ts',
    'jsx',
    'tsx',
    'json',
    'jsonl',
    'html',
    'css',
    'scss',
    'xml',
    'yml',
    'yaml',
    'sql',
    'py',
    'java',
    'c',
    'cpp',
    'h',
    'cs',
    'go',
    'rs',
    'php',
    'rb',
    'kt',
    'swift',
    'sh',
    'ps1',
  ],
  design: ['psd', 'ai', 'fig', 'xd', 'sketch'],
  font: ['ttf', 'otf', 'woff', 'woff2'],
  ebook: ['epub', 'mobi', 'azw', 'djvu'],
  email: ['eml', 'msg'],
  calendar: ['ics'],
  contact: ['vcf'],
  db: ['sqlite', 'sqlite3', 'db', 'mdb', 'accdb', 'parquet'],
  disk: ['iso', 'dmg', 'img'],
  exe: ['exe', 'msi', 'apk', 'pkg', 'appimage'],
  unknown: [],
};

// reverse lookup
const EXT_TO_KEY: Record<string, FileIconKey> = Object.entries(EXT_MAP).reduce(
  (acc, [key, exts]) => {
    for (const e of exts) acc[e] = key as FileIconKey;
    return acc;
  },
  {} as Record<string, FileIconKey>,
);
const MULTI_EXT = ['tar.gz', 'tar.bz2', 'tar.xz', 'tgz'] as const;

// Map to your <pc-icon> names (assume these exist in your icon set)
export const ICON_FOR_KEY: Record<FileIconKey, PcIconNameType> = {
  pdf: 'file-pdf',
  doc: 'file-doc',
  sheet: 'file-sheet',
  slides: 'file-slides',
  text: 'file-text',
  image: 'file-image',
  audio: 'file-audio',
  video: 'file-video',
  archive: 'file-archive',
  code: 'file-code',
  design: 'file-design',
  font: 'file-font',
  ebook: 'file-ebook',
  email: 'file-email',
  calendar: 'file-calendar',
  contact: 'file-contact',
  db: 'file-db',
  disk: 'file-disk',
  exe: 'file-exe',
  unknown: 'unknown',
};
```

## File: libs/uxcommon/src/pipes/filesize.pipe.ts

```typescript
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fileSize',
})
export class FileSizePipe implements PipeTransform {
  public transform(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
```

## File: libs/uxcommon/src/pipes/mention.pipe.ts

```typescript
import { Pipe, PipeTransform } from '@angular/core';

import type { IAuthUser } from '../../../common/src/lib/auth';

@Pipe({ name: 'mentionify', standalone: true })
export class MentionifyPipe implements PipeTransform {
  public transform(text: string | null | undefined, users: IAuthUser[] | null | undefined): string {
    if (!text) return '';
    const list = users ?? [];

    const byFirst = new Map<string, IAuthUser>();
    const byEmail = new Map<string, IAuthUser>();
    const byLocal = new Map<string, IAuthUser>();

    for (const u of list) {
      if (!u) continue;
      if (u.first_name) byFirst.set(u.first_name.toLowerCase(), u);
      if (u.email) {
        const em = u.email.toLowerCase();
        byEmail.set(em, u);
        const local = em.split('@')[0] ?? '';
        if (local) byLocal.set(local, u);
      }
    }

    // Normalize Windows newlines and collapse any whitespace/newlines immediately before a mention into a single space
    // This prevents mentions from starting on a new line when users select from autocomplete
    const normalized = text
      .replace(/\r\n?/g, '\n')
      // collapse runs like "  \n   @john" -> " @john"
      .replace(/[^\S\r\n]*\n+[^\S\r\n]*(?=@[A-Za-z0-9._-]+)/g, ' ')
      // also collapse leading newlines before a mention at the very start
      .replace(/^\s*\n+\s*(?=@[A-Za-z0-9._-]+)/, '');

    // Replace @mentions while preserving preceding character (so we don't match email domains)
    const replaced = normalized.replace(/(^|[^\w@])@([A-Za-z0-9._-]+)/g, (_m, pre: string, token: string) => {
      const key = token.toLowerCase();
      const u = byFirst.get(key) || byEmail.get(key) || byLocal.get(key);
      if (!u) return `${pre}@${token}`; // leave as-is if no match

      // Display prefers first_name; fallback to email local part
      const display = u.first_name || u.email.split('@')[0]!;
      // Use utility classes for styling; sanitized later by sanitizeHtml pipe
      // Mark with data-mention for CSS targeting to enforce inline layout
      return `${pre}<span data-mention="1" class="inline font-bold hover:cursor-pointer">@${this.escapeHtml(display)}</span>`;
    });

    // Convert newlines to <br>
    return replaced.replace(/\n/g, '<br>');
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
```

## File: libs/uxcommon/src/pipes/sanitize-html.pipe.ts

```typescript
// sanitize-html.pipe.ts
import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import DOMPurify from 'dompurify';

@Pipe({ name: 'sanitizeHtml' })
export class SanitizeHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  public transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';
    const clean = DOMPurify.sanitize(value, {
      ALLOWED_TAGS: [
        'a',
        'p',
        'br',
        'strong',
        'em',
        'ul',
        'ol',
        'li',
        'img',
        'table',
        'thead',
        'tbody',
        'tfoot',
        'tr',
        'td',
        'th',
        'colgroup',
        'col',
        'span',
        'div',
        'hr',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'blockquote',
        'pre',
        'code',
        'sub',
        'sup',
        'b',
        'i',
        'u',
      ],
      ALLOWED_ATTR: [
        'href',
        'target',
        'rel',
        'src',
        'alt',
        'title',
        'style',
        'class',
        'data-mention',
        'width',
        'height',
        'colspan',
        'rowspan',
        'align',
        'valign',
        'cellpadding',
        'cellspacing',
        'border',
      ],
      RETURN_TRUSTED_TYPE: false,
    });
    return this.sanitizer.bypassSecurityTrustHtml(clean);
  }
}
```

## File: libs/uxcommon/src/pipes/svg-html-pipe.ts

```typescript
import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ standalone: true, name: 'bypassHtmlSanitizer' })
export class BypassHtmlSanitizerPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  public transform(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
```

## File: libs/uxcommon/src/loading-gate.ts

```typescript
// _loading-gate.ts
import { type Signal, signal } from '@angular/core';

export type loadingGate = {
  /**
   * Spinner visibility — intentionally delayed by `delay` ms and held for
   * `minDuration` ms to suppress flicker. Bind this to spinners ONLY; it can stay
   * false for a whole sub-`delay` operation, so it is not a truthful "did work
   * happen" signal.
   */
  visible: ReturnType<typeof signal<boolean>>;

  /**
   * True once the first operation has COMPLETED — ungated, so it flips even for a
   * fast operation that never trips `visible`. Set when a load finishes (not when
   * it begins), so the data it produced is already in place. Use this for
   * "has loaded at least once" state (first-load gating, skeleton-vs-empty)
   * instead of watching `visible`.
   */
  loaded: Signal<boolean>;

  begin(): () => void;
};

export function createLoadingGate(options?: { delay?: number; minDuration?: number }): loadingGate {
  const delay = options?.delay ?? 300; // ms before showing
  const minDuration = options?.minDuration ?? 300; // ms the _loading stays once visible

  const visible = signal(false);
  const loaded = signal(false);
  let pendingCount = 0;
  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let shownAt = 0;

  const clearShowTimer = () => {
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
  };
  const clearHideTimer = () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  function scheduleShow() {
    clearShowTimer();
    showTimer = setTimeout(() => {
      showTimer = null;
      if (pendingCount > 0 && !visible()) {
        visible.set(true);
        shownAt = performance.now();
      }
    }, delay);
  }

  function scheduleHide() {
    clearHideTimer();
    if (!visible()) return; // never shown → nothing to hide

    const remaining = Math.max(0, minDuration - (performance.now() - shownAt));
    hideTimer = setTimeout(() => {
      if (pendingCount === 0) visible.set(false);
    }, remaining);
  }

  function begin() {
    pendingCount++;
    if (pendingCount === 1) {
      // First operation: start the delayed show
      scheduleShow();
    }
    // Return disposer
    let done = false;
    return () => {
      if (done) return;
      done = true;
      pendingCount--;
      loaded.set(true); // an operation has completed — its result is now in place
      if (pendingCount <= 0) {
        pendingCount = 0;
        // If we never showed, cancel the show timer so _loading never appears
        clearShowTimer();
        scheduleHide(); // hides now or after minDuration
      }
    };
  }

  return { begin, visible, loaded };
}
```

## File: libs/uxcommon/src/test-setup.ts

```typescript
import '@angular/compiler';
import '@analogjs/vitest-angular/setup-zone';

import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { getTestBed } from '@angular/core/testing';
import { vi } from 'vitest';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

(globalThis as any).jest = vi;
(globalThis as any).fetch = vi.fn().mockResolvedValue({
  ok: true,
  text: () => Promise.resolve('<svg></svg>'),
});
```

## File: libs/uxcommon/eslint.config.cjs

```javascript
const { FlatCompat } = require('@eslint/eslintrc');
const path = require('path');

const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
  ...compat
    .config({
      extends: ['plugin:@nx/angular', 'plugin:@angular-eslint/template/process-inline-templates'],
      parserOptions: {
        project: [
          path.resolve(__dirname, 'tsconfig.lib.json'),
          path.resolve(__dirname, 'tsconfig.spec.json'),
          path.resolve(__dirname, '../../tsconfig.base.json'),
        ],
        sourceType: 'module',
      },
    })
    .map((cfg) => ({
      ...cfg,
      files: ['**/*.ts'],
      rules: {
        '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'pc', style: 'camelCase' }],
        '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'pc', style: 'kebab-case' }],
      },
    })),

  ...compat
    .config({
      extends: ['plugin:@nx/angular-template', 'plugin:@angular-eslint/template/recommended'],
    })
    .map((cfg) => ({
      ...cfg,
      files: ['**/*.html'],
      rules: {},
    })),
];
```

## File: libs/uxcommon/project.json

```json
{
  "name": "uxcommon",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/uxcommon/src",
  "prefix": "lib",
  "projectType": "library",
  "tags": [],
  "targets": {
    "test": {
      "executor": "nx:run-commands",
      "cache": true,
      "outputs": ["{workspaceRoot}/coverage/libs/uxcommon"],
      "options": {
        "cwd": "libs/uxcommon",
        "command": "vitest run"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint"
    }
  }
}
```

## File: libs/uxcommon/README.md

```markdown
# uxcommon

This library was generated with [Nx](https://nx.dev).

## Running unit tests

Run `nx test uxcommon` to execute the unit tests.
```

## File: libs/uxcommon/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "module": "preserve"
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "typeCheckHostBindings": true,
    "strictTemplates": true
  },
  "files": [],
  "include": [],
  "references": [
    {
      "path": "./tsconfig.lib.json"
    },
    {
      "path": "./tsconfig.spec.json"
    }
  ]
}
```

## File: libs/uxcommon/tsconfig.lib.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc",
    "declaration": true,
    "declarationMap": true,
    "inlineSources": true,
    "types": []
  },
  "exclude": [
    "src/**/*.spec.ts",
    "src/test-setup.ts",
    "jest.config.ts",
    "src/**/*.test.ts",
    "vite.config.ts",
    "vite.config.mts",
    "vitest.config.ts",
    "vitest.config.mts",
    "src/**/*.test.tsx",
    "src/**/*.spec.tsx",
    "src/**/*.test.js",
    "src/**/*.spec.js",
    "src/**/*.test.jsx",
    "src/**/*.spec.jsx"
  ],
  "include": ["src/**/*.ts"]
}
```

## File: libs/uxcommon/tsconfig.spec.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc",
    "types": ["vitest/globals", "vitest/importMeta", "vite/client", "node", "vitest"]
  },
  "include": [
    "vite.config.ts",
    "vite.config.mts",
    "vitest.config.ts",
    "vitest.config.mts",
    "src/**/*.test.ts",
    "src/**/*.spec.ts",
    "src/**/*.test.tsx",
    "src/**/*.spec.tsx",
    "src/**/*.test.js",
    "src/**/*.spec.js",
    "src/**/*.test.jsx",
    "src/**/*.spec.jsx",
    "src/**/*.d.ts"
  ],
  "files": ["src/test-setup.ts"]
}
```

## File: libs/uxcommon/vite.config.mts

```typescript
/// <reference types='vitest' />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/uxcommon',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [angular()],
  test: {
    name: 'uxcommon',
    watch: false,
    globals: true,
    passWithNoTests: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/uxcommon',
      provider: 'v8' as const,
      // Coverage ratchet: set just under the measured baseline (2026-07-04:
      // 81.22% stmts / 63.21% branch / 67.05% funcs / 82.27% lines). These may
      // only ever be raised, never lowered — if your change drops coverage
      // below them, add tests rather than editing the thresholds.
      thresholds: {
        statements: 80,
        branches: 62,
        functions: 66,
        lines: 81,
      },
    },
  },
}));
```

## File: libs/common/src/lib/schemas/canvassing.schema.ts

```typescript
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

/**
 * What happened at the door. "attempted" = any knock except `cleared`;
 * "conversation" = a talk. `moved` is a person-level no-conversation code;
 * `cleared` is the append-only "door outcome toggled off" marker — the latest
 * outcome knock wins, and `cleared` means the door is back on the list.
 */
export const KNOCK_OUTCOMES = [
  'conversation',
  'no_answer',
  'not_home',
  'moved',
  'refused',
  'inaccessible',
  'cleared',
] as const;
export type KnockOutcome = (typeof KNOCK_OUTCOMES)[number];

/**
 * The voter's stance, when a conversation happened — the spec §3.5 five-option
 * support scale. `not_voting`/`already_voted` feed `voting_status` rather than
 * `support_level` on campaign_person_facts.
 */
export const KNOCK_RESPONSES = ['supporter', 'undecided', 'non_supporter', 'not_voting', 'already_voted'] as const;
export type KnockResponse = (typeof KNOCK_RESPONSES)[number];

/** Survey labels for the five support options (sentence case, spec §3.5). */
export const KNOCK_RESPONSE_LABELS: Record<KnockResponse, string> = {
  supporter: 'Supporter',
  undecided: 'Undecided',
  non_supporter: 'Non-supporter',
  not_voting: 'Not voting',
  already_voted: 'Already voted',
};

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
  /**
   * The person this Companion link belongs to. Required: the companion access
   * layer verifies the holder against this person's email/mobile on file, so
   * an assignment without a person produces a link nobody can open.
   */
  volunteer_person_id: idSchema,
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

// ---------------------------------------------------------------------------
// Companion batched results (spec §3.5/§5) — POST /api/canvass/t/:token/results
// ---------------------------------------------------------------------------

/**
 * A full survey (spec §3.5). `person_id` null = the anonymous household-level
 * survey. `support` is the one required field — EXCEPT that toggling
 * "Do not contact" alone is saveable, which the refine below encodes.
 */
export const CompanionSurveyObj = z
  .object({
    household_id: idSchema,
    person_id: idSchema.nullable().optional(),
    support: knockResponseSchema.nullable().optional(),
    issues: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    wants_volunteer: z.boolean().default(false),
    wants_yard_sign: z.boolean().default(false),
    set_dnc: z.boolean().default(false),
    contact_phone: z.string().trim().max(40).nullable().optional(),
    contact_email: z.string().trim().email().max(200).nullable().optional(),
    subscribe: z.boolean().default(false),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => v.support != null || v.set_dnc, { message: 'Pick a support level to save' });

/** One-tap no-conversation codes for a person (spec §3.5). */
export const CompanionPersonResultObj = z.object({
  household_id: idSchema,
  person_id: idSchema,
  result: z.enum(['not_home', 'moved', 'refused']),
});

/** Door-level outcome (spec §3.4 quick actions). */
export const CompanionDoorOutcomeObj = z.object({
  household_id: idSchema,
  outcome: z.enum(['no_answer', 'inaccessible', 'refused']),
});

export const CompanionClearOutcomeObj = z.object({
  household_id: idSchema,
});

/** "+ Add someone at this door" (spec §3.4). */
export const CompanionPersonCreateObj = z.object({
  household_id: idSchema,
  name: z.string().trim().min(1).max(120),
});

const companionOpBase = {
  /** Client-generated UUID — the idempotency key (companion_ops ledger). */
  op_id: z.string().min(8).max(100),
  /** On-device timestamp so offline results keep their true door time. */
  recorded_at: z.string().datetime().nullable().optional(),
};

export const CompanionOpObj = z.discriminatedUnion('type', [
  z.object({ ...companionOpBase, type: z.literal('survey'), payload: CompanionSurveyObj }),
  z.object({ ...companionOpBase, type: z.literal('person_result'), payload: CompanionPersonResultObj }),
  z.object({ ...companionOpBase, type: z.literal('door_outcome'), payload: CompanionDoorOutcomeObj }),
  z.object({ ...companionOpBase, type: z.literal('clear_outcome'), payload: CompanionClearOutcomeObj }),
  z.object({ ...companionOpBase, type: z.literal('person_create'), payload: CompanionPersonCreateObj }),
]);

export const CompanionResultsObj = z.object({
  ops: z.array(CompanionOpObj).min(1).max(200),
});

export type CompanionSurveyType = z.infer<typeof CompanionSurveyObj>;
export type CompanionOpType = z.infer<typeof CompanionOpObj>;
export type CompanionResultsType = z.infer<typeof CompanionResultsObj>;

/** Per-op server acknowledgement — `duplicate` means "already applied, treat as success". */
export interface CompanionOpAck {
  op_id: string;
  status: 'applied' | 'duplicate' | 'rejected';
  error?: string;
  /** For person_create: the real id to swap in for the client's temp person. */
  person_id?: string;
}

// ------------------------------------------------------------------------
// Companion GET payload (spec §3, §5) — shared by backend + apps/companion.
// Payload minimization is an acceptance criterion: names, walk data and prior
// door RESULTS only — never emails, phones, donation history, or notes.
// ------------------------------------------------------------------------

/** Pre-fill for re-editing a surveyed person/door. Deliberately excludes notes + contact info. */
export interface CompanionSurveyPrefill {
  support: KnockResponse | null;
  issues: string[];
  wants_volunteer: boolean;
  wants_yard_sign: boolean;
  set_dnc: boolean;
  subscribe: boolean;
}

export type CompanionPersonResult = 'canvassed' | 'not_home' | 'moved' | 'refused';

export interface CompanionPerson {
  id: string;
  name: string;
  /** Suppressed from all outreach — card renders dimmed and non-interactive. */
  dnc: boolean;
  result: CompanionPersonResult | null;
  survey: CompanionSurveyPrefill | null;
}

export type CompanionDoorOutcome = 'no_answer' | 'inaccessible' | 'refused';

export interface CompanionHousehold {
  id: string;
  walk_order: number;
  address: string;
  lat: number | null;
  lng: number | null;
  /** Whole-door do-not-contact (every resident is DNC) — skip, but it still counts. */
  dnc: boolean;
  door_outcome: CompanionDoorOutcome | null;
  /** The anonymous household-level survey, when one was recorded. */
  hh_survey: CompanionSurveyPrefill | null;
  people: CompanionPerson[];
}

export interface CompanionTurfPayload {
  campaign_name: string;
  turf_name: string;
  /** Whose name results save under — the assignment's volunteer. */
  canvasser_name: string;
  /** Collapsible door script (campaign-configured; empty string = none). */
  script: string;
  /** Issue-chip vocabulary (campaign-configured). */
  issues: string[];
  expires_at: string | null;
  households: CompanionHousehold[];
}

/** Staff-configured survey vocabulary (campaigns.canvass_issues/script). */
export const UpdateCompanionSettingsObj = z.object({
  campaign_id: idSchema.optional(),
  issues: z.array(z.string().trim().min(1).max(80)).max(30),
  script: z.string().trim().max(4000).nullable(),
});
export type UpdateCompanionSettingsType = z.infer<typeof UpdateCompanionSettingsObj>;
```

## File: libs/common/src/lib/schemas/companion-access.schema.ts

```typescript
import { z } from 'zod';

/**
 * Companion access layer (COMPANION-APPS-PLAN.md §2). A companion capability
 * link (/t/:token canvass turf, /r/:token delivery route) is not enough on its
 * own: the volunteer must verify a one-time code sent to their email/SMS on
 * file, be approved once by an admin, and then hold a device session that
 * accompanies every companion request.
 */

export const COMPANION_LINK_KINDS = ['turf', 'route'] as const;
export type CompanionLinkKind = (typeof COMPANION_LINK_KINDS)[number];

export const COMPANION_VERIFY_CHANNELS = ['email', 'sms'] as const;
export type CompanionVerifyChannel = (typeof COMPANION_VERIFY_CHANNELS)[number];

export const COMPANION_VOLUNTEER_STATUSES = ['invited', 'verified', 'approved', 'revoked'] as const;
export type CompanionVolunteerStatus = (typeof COMPANION_VOLUNTEER_STATUSES)[number];

/**
 * What the gate UI renders:
 * - dead: unknown/expired/revoked link — friendly dead-link page
 * - unassigned: link has no volunteer person attached — ask the organizer to re-send
 * - need_verification: pick a channel, get a code
 * - pending_approval: verified, waiting for an admin — the page polls
 * - ready: approved with a valid device session — load the app
 */
export const COMPANION_ACCESS_STATES = [
  'dead',
  'unassigned',
  'need_verification',
  'pending_approval',
  'ready',
] as const;
export type CompanionAccessState = (typeof COMPANION_ACCESS_STATES)[number];

export const CompanionAccessQueryObj = z.object({
  kind: z.enum(COMPANION_LINK_KINDS),
  token: z.string().min(8).max(200),
});

export const CompanionVerifyStartObj = CompanionAccessQueryObj.extend({
  channel: z.enum(COMPANION_VERIFY_CHANNELS),
});

export const CompanionVerifyConfirmObj = CompanionAccessQueryObj.extend({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export type CompanionAccessQueryType = z.infer<typeof CompanionAccessQueryObj>;
export type CompanionVerifyStartType = z.infer<typeof CompanionVerifyStartObj>;
export type CompanionVerifyConfirmType = z.infer<typeof CompanionVerifyConfirmObj>;

/** A verifiable contact on file, masked for display — never the raw value. */
export interface CompanionContact {
  channel: CompanionVerifyChannel;
  masked: string;
}

/** Response of GET /api/companion/access. */
export interface CompanionAccessPayload {
  state: CompanionAccessState;
  /** Volunteer first name — identity card ("Walking as Jordan"). */
  volunteerName?: string;
  /** Who to contact about a dead/unassigned link. */
  organizerName?: string;
  /** Organization name for the gate header. */
  organizationName?: string;
  contacts?: CompanionContact[];
}

/** Response of POST /api/companion/verify/confirm. */
export interface CompanionVerifyConfirmResult {
  status: 'ready' | 'pending_approval';
  sessionToken: string;
  expiresAt: string;
}

/** One row of the admin Volunteer access page. */
export interface CompanionVolunteerRow {
  id: string;
  person_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  mobile: string | null;
  status: CompanionVolunteerStatus;
  verify_channel: CompanionVerifyChannel | null;
  verified_at: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
  created_at: string;
}
```

## File: libs/common/src/lib/emails.ts

```typescript
// ---------- Public compatibility interface (loose) ----------
// ---------- Strict types for compile-time guarantees ----------
interface EmailFolderBase {
  icon: string;
  id: string;
  is_default: boolean;
  name: string;
  sort_order: number;
  is_hidden?: boolean;
}

export interface EmailFolderConfig {
  code?: string; // optional/loose for compatibility
  icon: string;
  id: string;
  is_default: boolean;
  is_virtual: boolean;
  name: string;
  sort_order: number;
  is_hidden?: boolean;
}

export interface RealEmailFolder extends EmailFolderBase {
  code?: never; // forbidden on real folders
  is_virtual: false;
}

export interface VirtualEmailFolder extends EmailFolderBase {
  code: string; // required when virtual
  is_virtual: true;
}

// ---------- Derived types ----------
type Folder = (typeof EMAIL_FOLDERS)[number];

type OnlyReal = Extract<Folder, { is_virtual: false }>;

type OnlyVirtual = Extract<Folder, { is_virtual: true }>;

// All folders (merged, exact keys/ids)
export type AllFolderKey = keyof typeof SPECIAL_FOLDERS | keyof typeof REGULAR_FOLDERS;

export type AllFoldersMap = typeof SPECIAL_FOLDERS & typeof REGULAR_FOLDERS;

export type EmailStatus = 'open' | 'closed';

export type HasRow = {
  email_id: string;
  has: boolean;
};

export type RegularFolderId = OnlyReal['id']; // '7' | '3' | '4' | '5'

export type RegularFolderKey = Uppercase<RegularFolderName>; // 'DRAFTS' | 'SENT' | 'SPAM' | 'TRASH'

export type RegularFolderName = OnlyReal['name']; // 'Drafts' | 'Sent' | 'Spam' | 'Trash'

export type ServerEmail = {
  assigned_to?: string | null;
  attachment_count?: number | string | bigint | null;
  folder_id: string | number;
  from_email?: string | null;
  is_read?: boolean;

  // any of these might be present depending on endpoint:
  has_attachment?: boolean | null;
  id: string | number;
  is_favourite: boolean;
  preview?: string | null;
  status?: string;
  subject?: string | null;
  to_email?: string | null;
  updated_at: string | Date;
  date_sent?: string | Date | null;
  sender_first_name?: string | null;
  sender_last_name?: string | null;
};

export type SpecialFolderId = OnlyVirtual['id'];

export type SpecialFolderKey = OnlyVirtual['code'];

export type StrictEmailFolderConfig = VirtualEmailFolder | RealEmailFolder;

function createRegularFolders<const F extends readonly StrictEmailFolderConfig[]>(folders: F) {
  type RegularFolder = Extract<F[number], { is_virtual: false }>;
  type FolderKey = Uppercase<RegularFolder['name'] & string>;
  type FolderId<K extends FolderKey> = Extract<RegularFolder, { name: Capitalize<Lowercase<K>> }>['id'];

  const entries = folders
    .filter((f): f is RegularFolder => !f.is_virtual)
    .map((f) => [f.name.toUpperCase() as FolderKey, f.id] as const);

  return Object.freeze(Object.fromEntries(entries)) as { readonly [K in FolderKey]: FolderId<K> };
}

function createSpecialFolders<const F extends readonly StrictEmailFolderConfig[]>(folders: F) {
  type VirtualFolder = Extract<F[number], { is_virtual: true }>;
  type FolderCode = VirtualFolder extends { code: infer C extends string } ? C : never;
  type FolderId<Code extends string> = Extract<VirtualFolder, { code: Code }>['id'];

  const entries = folders.filter((f): f is VirtualFolder => f.is_virtual).map((f) => [f.code, f.id] as const);

  return Object.freeze(Object.fromEntries(entries)) as { readonly [P in FolderCode]: FolderId<P> };
}

export const isRegularFolderId = (id: string): id is RegularFolderId =>
  Object.values(REGULAR_FOLDERS).includes(id as RegularFolderId);

// Optional runtime type guards
export const isSpecialFolderId = (id: string): id is SpecialFolderId =>
  Object.values(SPECIAL_FOLDERS).includes(id as SpecialFolderId);

// ---------- Configuration (validated against STRICT type) ----------
export const EMAIL_FOLDERS = [
  // Virtual
  { id: '9', name: 'Starred', icon: 'star', sort_order: 1, is_default: false, is_virtual: true, code: 'FAVOURITES' },
  {
    id: '8',
    name: 'Unassigned',
    icon: 'inbox',
    sort_order: 2,
    is_default: false,
    is_virtual: true,
    code: 'UNASSIGNED',
  },
  {
    id: '6',
    name: 'Mine',
    icon: 'user-circle',
    sort_order: 3,
    is_default: true,
    is_virtual: true,
    code: 'ASSIGNED_TO_ME',
  },
  {
    id: '1',
    name: 'Open',
    icon: 'document-duplicate',
    sort_order: 4,
    is_default: false,
    is_virtual: true,
    code: 'ALL_OPEN',
  },
  {
    id: '2',
    name: 'Closed',
    icon: 'document-check',
    sort_order: 5,
    is_default: false,
    is_virtual: true,
    code: 'CLOSED',
  },

  // Real
  { id: '11', name: 'Inbox', icon: 'inbox', sort_order: 6, is_default: false, is_virtual: false },
  { id: '7', name: 'Drafts', icon: 'document', sort_order: 7, is_default: false, is_virtual: false },
  { id: '10', name: 'Outbox', icon: 'clock', sort_order: 8, is_default: false, is_virtual: false },
  { id: '3', name: 'Sent', icon: 'paper-airplane', sort_order: 9, is_default: false, is_virtual: false },
  { id: '5', name: 'Trash', icon: 'trash', sort_order: 10, is_default: false, is_virtual: false },
  { id: '4', name: 'Spam', icon: 'exclamation-triangle', sort_order: 11, is_default: false, is_virtual: false },
] as const satisfies StrictEmailFolderConfig[];

// Real-only (exact keys/ids)
export const REGULAR_FOLDERS = createRegularFolders(EMAIL_FOLDERS);

// ---------- Exposed constants ----------

// Virtual-only (exact keys/ids)
export const SPECIAL_FOLDERS = createSpecialFolders(EMAIL_FOLDERS);
export const ALL_FOLDERS: AllFoldersMap = { ...SPECIAL_FOLDERS, ...REGULAR_FOLDERS } as const;

// Useful helpers
export const ALL_FOLDER_IDS = EMAIL_FOLDERS.map((f) => f.id) as ReadonlyArray<Folder['id']>;
export const FOLDER_BY_ID = Object.freeze(Object.fromEntries(EMAIL_FOLDERS.map((f) => [f.id, f]))) as Readonly<
  Record<Folder['id'], Folder>
>;
```

## File: libs/common/src/lib/models.ts

```typescript
import type { z } from 'zod';

import type {
  AddCampaignObj,
  UpdateCampaignObj,
  UpsertCampaignPersonFactObj,
  SetCampaignSubscriptionObj,
  CarryOverCampaignObj,
  AddTagObj,
  AddListObj,
  AddMarketingEmailObj,
  AddTaskObj,
  AddTeamObj,
  AddTurfObj,
  UpdateTurfObj,
  CutTurfsObj,
  AssignTurfObj,
  FieldReportRangeObj,
  LogKnockObj,
  EmailCommentObj,
  EmailFolderObj,
  EmailObj,
  MarketingEmailObj,
  marketingEmailTopLinkObj,
  NewsletterReportObj,
  NewsletterReportBounceObj,
  NewsletterReportEngagedObj,
  NewsletterReportLinkObj,
  NewsletterReportPreviousSendObj,
  CreateClickersListResultObj,
  EmailDraftObj,
  PersonsObj,
  SettingsEntryObj,
  SettingsObj,
  UpsertSettingsInputObj,
  UpdateHouseholdsObj,
  UpdatePersonsObj,
  UpdateTagObj,
  ListsObj,
  UpdateMarketingEmailObj,
  UpdateListObj,
  UpdateTaskObj,
  UpdateTeamObj,
  TasksObj,
  getAllOptions,
  exportCsvInput,
  exportCsvResponse,
  queueExportInput,
  logInstantExportInput,
  dataExportRecord,
  sortModelItem,
  InviteAuthUserObj,
  ProfilePreferencesObj,
  UpdateAuthUserObj,
  Verify2FAObj,
  ImportListItemObj,
  AddVolunteerEventObj,
  VolunteerEventsObj,
  UpdateVolunteerEventObj,
  AddVolunteerShiftObj,
  VolunteerShiftsObj,
  UpdateVolunteerShiftObj,
  AddWebFormObj,
  UpdateWebFormObj,
  WebFormsObj,
  CreateFormObj,
  UpdateFormObj,
  FormSubmissionObj,
  QueryBuilderRuleNode,
  QueryBuilderGroupNode,
  QueryBuilderNode,
  WorkflowObj,
  AddWorkflowObj,
  UpdateWorkflowObj,
  WorkflowStepObj,
  AddWorkflowStepObj,
  UpdateWorkflowStepObj,
  WorkflowEnrollmentObj,
  AddEventObj,
  EventObj,
  UpdateEventObj,
  AddTicketTypeObj,
  TicketTypeObj,
  UpdateTicketTypeObj,
  AddRegistrationObj,
  RegistrationObj,
  UpdateRegistrationObj,
  AddConnectionObj,
} from './schema';

export interface INow {
  now: string;
}

export type AddTagType = z.infer<typeof AddTagObj>;

export type EmailCommentType = z.infer<typeof EmailCommentObj>;

export type EmailFolderType = z.infer<typeof EmailFolderObj>;

export type EmailType = z.infer<typeof EmailObj>;

export type MarketingEmailType = z.infer<typeof MarketingEmailObj>;

export type AddMarketingEmailType = z.infer<typeof AddMarketingEmailObj>;

export type UpdateMarketingEmailType = z.infer<typeof UpdateMarketingEmailObj>;

export type MarketingEmailTopLinkType = z.infer<typeof marketingEmailTopLinkObj>;

export type NewsletterReportType = z.infer<typeof NewsletterReportObj>;

export type NewsletterReportBounceType = z.infer<typeof NewsletterReportBounceObj>;

export type NewsletterReportEngagedType = z.infer<typeof NewsletterReportEngagedObj>;

export type NewsletterReportLinkType = z.infer<typeof NewsletterReportLinkObj>;

export type NewsletterReportPreviousSendType = z.infer<typeof NewsletterReportPreviousSendObj>;

export type CreateClickersListResultType = z.infer<typeof CreateClickersListResultObj>;

export type EmailDraftType = z.infer<typeof EmailDraftObj>;

export type ImportListItem = z.infer<typeof ImportListItemObj>;

export type PERSONINHOUSEHOLDTYPE = {
  first_name: string;
  full_name: string;
  id: string;
  last_name: string;
  middle_names: string;
};

export type PersonsType = z.infer<typeof PersonsObj>;

export type SettingsType = z.infer<typeof SettingsObj>;

export type SettingsEntryType = z.infer<typeof SettingsEntryObj>;

export type UpsertSettingsInputType = z.infer<typeof UpsertSettingsInputObj>;

export type SortModelType = z.infer<typeof sortModelItem>;

export type UpdateHouseholdsType = z.infer<typeof UpdateHouseholdsObj>;

export type UpdatePersonsType = z.infer<typeof UpdatePersonsObj>;

export type UpdateTagType = z.infer<typeof UpdateTagObj>;

export type getAllOptionsType = z.infer<typeof getAllOptions>;

export type AddListType = z.infer<typeof AddListObj>;

export type AddCampaignType = z.infer<typeof AddCampaignObj>;

export type UpdateCampaignType = z.infer<typeof UpdateCampaignObj>;

export type UpsertCampaignPersonFactType = z.infer<typeof UpsertCampaignPersonFactObj>;

export type SetCampaignSubscriptionType = z.infer<typeof SetCampaignSubscriptionObj>;

export type CarryOverCampaignType = z.infer<typeof CarryOverCampaignObj>;

export type AddTeamType = z.infer<typeof AddTeamObj>;

export type InviteAuthUserType = z.infer<typeof InviteAuthUserObj>;

export type Verify2FAType = z.infer<typeof Verify2FAObj>;

export type ListsType = z.infer<typeof ListsObj>;

export type UpdateListType = z.infer<typeof UpdateListObj>;

export type UpdateTeamType = z.infer<typeof UpdateTeamObj>;

export type AddTurfType = z.infer<typeof AddTurfObj>;

export type UpdateTurfType = z.infer<typeof UpdateTurfObj>;

export type CutTurfsType = z.infer<typeof CutTurfsObj>;

export type AssignTurfType = z.infer<typeof AssignTurfObj>;

export type FieldReportRangeType = z.infer<typeof FieldReportRangeObj>;

export type LogKnockType = z.infer<typeof LogKnockObj>;

export type UpdateAuthUserType = z.infer<typeof UpdateAuthUserObj>;

export type ProfilePreferencesType = z.infer<typeof ProfilePreferencesObj>;

export type AddTaskType = z.infer<typeof AddTaskObj>;
export type TasksType = z.infer<typeof TasksObj>;
export type UpdateTaskType = z.infer<typeof UpdateTaskObj>;
export type ExportCsvInputType = z.infer<typeof exportCsvInput>;
export type ExportCsvResponseType = z.infer<typeof exportCsvResponse>;
export type QueueExportInputType = z.infer<typeof queueExportInput>;
export type LogInstantExportInputType = z.infer<typeof logInstantExportInput>;
export type DataExportRecordType = z.infer<typeof dataExportRecord>;

export type AddVolunteerEventType = z.infer<typeof AddVolunteerEventObj>;
export type VolunteerEventsType = z.infer<typeof VolunteerEventsObj>;
export type UpdateVolunteerEventType = z.infer<typeof UpdateVolunteerEventObj>;

export type AddVolunteerShiftType = z.infer<typeof AddVolunteerShiftObj>;
export type VolunteerShiftsType = z.infer<typeof VolunteerShiftsObj>;
export type UpdateVolunteerShiftType = z.infer<typeof UpdateVolunteerShiftObj>;

export type AddWebFormType = z.infer<typeof AddWebFormObj>;
export type UpdateWebFormType = z.infer<typeof UpdateWebFormObj>;
export type WebFormsType = z.infer<typeof WebFormsObj>;
export type CreateFormType = z.infer<typeof CreateFormObj>;
export type UpdateFormType = z.infer<typeof UpdateFormObj>;
export type FormSubmissionType = z.infer<typeof FormSubmissionObj>;

export type WorkflowsType = z.infer<typeof WorkflowObj>;
export type AddWorkflowType = z.infer<typeof AddWorkflowObj>;
export type UpdateWorkflowType = z.infer<typeof UpdateWorkflowObj>;
export type WorkflowStepsType = z.infer<typeof WorkflowStepObj>;
export type AddWorkflowStepType = z.infer<typeof AddWorkflowStepObj>;
export type UpdateWorkflowStepType = z.infer<typeof UpdateWorkflowStepObj>;
export type WorkflowEnrollmentsType = z.infer<typeof WorkflowEnrollmentObj>;

export type AddEventType = z.infer<typeof AddEventObj>;
export type EventType = z.infer<typeof EventObj>;
export type UpdateEventType = z.infer<typeof UpdateEventObj>;

export type AddTicketTypeType = z.infer<typeof AddTicketTypeObj>;
export type TicketTypeType = z.infer<typeof TicketTypeObj>;
export type UpdateTicketTypeType = z.infer<typeof UpdateTicketTypeObj>;

export type AddRegistrationType = z.infer<typeof AddRegistrationObj>;
export type RegistrationType = z.infer<typeof RegistrationObj>;
export type UpdateRegistrationType = z.infer<typeof UpdateRegistrationObj>;

export type AddConnectionType = z.infer<typeof AddConnectionObj>;

export type { QueryBuilderRuleNode, QueryBuilderGroupNode, QueryBuilderNode };
```

## File: libs/common/src/lib/schema.ts

```typescript
export * from './schemas/core.schema';
export * from './schemas/activity.schema';
export * from './schemas/auth.schema';
export * from './schemas/tags.schema';
export * from './schemas/lists.schema';
export * from './schemas/teams.schema';
export * from './schemas/emails.schema';
export * from './schemas/marketing.schema';
export * from './schemas/persons.schema';
export * from './schemas/settings.schema';
export * from './schemas/tasks.schema';
export * from './schemas/volunteer.schema';
export * from './schemas/web-forms.schema';
export * from './schemas/workflows.schema';
export * from './schemas/companies.schema';
export * from './schemas/events.schema';
export * from './schemas/connections.schema';
export * from './schemas/campaigns.schema';
export * from './schemas/canvassing.schema';
export * from './schemas/deliveries.schema';
export * from './schemas/donations.schema';
export * from './schemas/companion-access.schema';
```

## File: libs/uxcommon/src/components/address-autocomplete/address-autocomplete.ts

```typescript
import { Component, ElementRef, OnInit, effect, inject, input, output, viewChild } from '@angular/core';
import { Loader } from '@googlemaps/js-api-loader';
import { AddressType } from '../../../../common/src/lib/kysely.models';
import { parseAddress } from './googlePlacesAddressMapper';

/**
 * `<pc-address-autocomplete>` — a text input that upgrades into a Google Places
 * Autocomplete field (§6 / §13 / §14 maps ruling: Google Maps Platform only).
 *
 * Two shapes of consumer:
 * - **Search box** (household form): ignore `value`/`textChange`, listen to
 *   `addressSelected` to fan a structured `AddressType` into other fields.
 * - **Field of record** (plan-routes start address): seed with `value`, keep a
 *   signal in sync via `textChange` (freeform typing) *and* `addressSelected`
 *   (picking a suggestion).
 *
 * The `Loader` is injected **optionally** — mirroring `<pc-map>` — so unit tests
 * and any host without an API key keep a plain, fully-functional text input and
 * never touch the network.
 */
@Component({
  selector: 'pc-address-autocomplete',
  standalone: true,
  template: `
    <div class="relative w-full">
      <input
        #inputEl
        type="text"
        class="input w-full"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [value]="value()"
        (input)="onInput($event)"
        autocomplete="one-time-code"
      />
    </div>
  `,
})
export class AddressAutocomplete implements OnInit {
  /** Optional so unit tests (and any host without the SDK key) keep a plain text input. */
  private readonly loader = inject(Loader, { optional: true });

  public readonly disabled = input<boolean>(false);
  public readonly placeholder = input<string>('Start typing an address…');
  public readonly regionCodes = input<string[]>(['ca']);
  /** Seeds the field and reflects programmatic changes (for field-of-record use). */
  public readonly value = input<string>('');

  public readonly addressSelected = output<AddressType>();
  /** Raw text on every keystroke — for consumers that treat this as the field of record. */
  public readonly textChange = output<string>();

  private inputElement: HTMLInputElement | null = null;
  private isLibraryLoaded = false;
  private isAutocompleteInitialized = false;

  private readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');

  constructor() {
    effect(() => {
      const elRef = this.inputEl();
      if (elRef) {
        this.inputElement = elRef.nativeElement;
        this.tryInitAutocomplete();
      }
    });
  }

  public ngOnInit() {
    void this.initialize();
  }

  protected onInput(event: Event): void {
    this.textChange.emit((event.target as HTMLInputElement).value);
  }

  private async initialize() {
    if (!this.loader) return;
    try {
      await this.loader.importLibrary('places');
      this.isLibraryLoaded = true;
      this.tryInitAutocomplete();
    } catch (err) {
      // Bad key / offline / blocked — stay on the honest plain input.
      console.error('Failed to load Google Maps Places library', err);
    }
  }

  private tryInitAutocomplete() {
    if (
      this.isAutocompleteInitialized ||
      !this.inputElement ||
      !this.isLibraryLoaded ||
      typeof google === 'undefined' ||
      !google.maps ||
      !google.maps.places
    ) {
      return;
    }

    const options: google.maps.places.AutocompleteOptions = {
      componentRestrictions: { country: this.regionCodes() },
      types: ['geocode'],
    };

    const autocomplete = new google.maps.places.Autocomplete(this.inputElement, options);
    this.isAutocompleteInitialized = true;

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place) {
        const address = parseAddress(place);
        // Keep field-of-record consumers in sync with the picked formatted address.
        if (place.formatted_address) this.textChange.emit(place.formatted_address);
        this.addressSelected.emit(address);
      }
    });
  }
}
```

## File: libs/uxcommon/src/components/alerts/alert-service.ts

```typescript
import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

export class AlertMessage {
  public readonly visible = signal(true);
  /** How many identical (same text+type) toasts have coalesced into this one (§2). */
  public readonly count = signal(1);

  public duration = 3000;
  public id: string;
  public text: string;
  public timeoutId: NodeJS.Timeout | undefined;
  public type?: ALERTTYPE;

  constructor(init?: Partial<AlertMessage>) {
    Object.assign(this, init);
    this.id = init?.id ?? crypto.randomUUID();
    this.duration = init?.duration || 3000;
    this.text = init?.text ?? 'Alert';
  }
}

/** Max simultaneous toasts; oldest drops when a new one arrives (§2). */
const MAX_TOAST_STACK = 3;

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  private readonly alertsSignal = signal<AlertMessage[]>([]);

  public readonly alertList = this.alertsSignal.asReadonly();
  public readonly alerts$ = toObservable(this.alertsSignal);

  public dismiss(id: string): void {
    const alert = this.findById(id);

    if (!alert) return;

    // Clear any pending removal timeout
    clearTimeout(alert.timeoutId);
    alert.timeoutId = undefined;

    alert.visible.set(false);

    // Have to let the animation do its thing first
    setTimeout(() => {
      const next = this.alertsSignal().filter((msg) => msg.id !== id);
      this.alertsSignal.set(next);
    }, 300);
  }

  public getAlerts(): AlertMessage[] {
    return this.alertsSignal();
  }

  public show(alert: Partial<AlertMessage>): void {
    // Coalesce an identical (same text + type) toast into a ×N count with a
    // refreshed timer instead of stacking duplicates (§2).
    const existing = this.alertsSignal().find((m) => m.text === alert.text && m.type === alert.type);

    if (existing) {
      existing.count.update((c) => c + 1);
      clearTimeout(existing.timeoutId);
      existing.timeoutId = setTimeout(() => this.dismiss(existing.id), existing.duration || 3000);
      return;
    }

    const messageWithMeta: AlertMessage = new AlertMessage({ ...alert });
    // Cap the stack at MAX_TOAST_STACK, dropping the oldest (list is newest-first).
    this.alertsSignal.update((list) => {
      const next = [messageWithMeta, ...list];
      const dropped = next.slice(MAX_TOAST_STACK);
      dropped.forEach((m) => clearTimeout(m.timeoutId));
      return next.slice(0, MAX_TOAST_STACK);
    });

    const duration = messageWithMeta.duration || 3000;
    messageWithMeta.timeoutId = setTimeout(() => this.dismiss(messageWithMeta.id), duration);
  }

  public showError(text: string): void {
    this.show(new AlertMessage({ text, type: 'error' }));
  }

  public showInfo(text: string): void {
    this.show(new AlertMessage({ text, type: 'info' }));
  }

  public showSuccess(text: string): void {
    this.show(new AlertMessage({ text, type: 'success' }));
  }

  public showWarn(text: string): void {
    this.show(new AlertMessage({ text, type: 'warning' }));
  }

  private findById(id: string) {
    return this.alertsSignal().find((m) => m.id === id);
  }
}

export type ALERTTYPE = 'info' | 'error' | 'warning' | 'success';
```

## File: libs/uxcommon/src/components/breadcrumbs/breadcrumbs.service.ts

```typescript
import { Injectable, signal } from '@angular/core';

import { PcBreadcrumb } from './breadcrumbs';

/**
 * The full breadcrumb strip published by the current page: the crumb trail plus
 * the optional "N of M filtered" record pager. Pages set this; the navbar renders it.
 * The pager's prev/next are callbacks (not outputs) so they can route back to the
 * page that owns the record-navigation handle from wherever the strip is rendered.
 */
export interface BreadcrumbTrail {
  crumbs: PcBreadcrumb[];
  positionLabel: string | null;
  hasPrev: boolean;
  hasNext: boolean;
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Hoists the breadcrumb trail out of the page body and into the navbar.
 *
 * Every navigation gets a route-driven default trail (built from `data.breadcrumb`
 * by the frontend's BreadcrumbDefaultsService on NavigationEnd), so the strip is
 * never empty or stale. Pages that own a richer trail (detail views via
 * `pc-detail-header`, tabbed pages) `set()` theirs afterwards — their effects flush
 * after NavigationEnd, so the page's trail wins. No page needs to clear on destroy
 * anymore; the next navigation's default replaces whatever was published.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbsService {
  private readonly _trail = signal<BreadcrumbTrail | null>(null);
  public readonly trail = this._trail.asReadonly();

  public set(trail: BreadcrumbTrail): void {
    this._trail.set(trail);
  }

  /** Publish a plain crumb trail with no record pager — the common case. */
  public setCrumbs(crumbs: PcBreadcrumb[]): void {
    this._trail.set({
      crumbs,
      positionLabel: null,
      hasPrev: false,
      hasNext: false,
      prevLabel: 'Previous record',
      nextLabel: 'Next record',
      onPrev: () => undefined,
      onNext: () => undefined,
    });
  }

  public clear(): void {
    this._trail.set(null);
  }
}
```

## File: libs/uxcommon/src/components/breadcrumbs/breadcrumbs.ts

```typescript
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@icons/icon';

/**
 * A single breadcrumb entry. Crumbs with a `route` render as links;
 * the last crumb (the current page) renders as plain text.
 */
export interface PcBreadcrumb {
  label: string;
  route?: string | readonly unknown[];
}

@Component({
  selector: 'pc-breadcrumbs',
  imports: [RouterLink, Icon],
  template: `
    <div class="flex min-w-0 items-center justify-between gap-3">
      <nav aria-label="Breadcrumb" class="min-w-0 text-xs text-base-content/50">
        <ol class="flex flex-wrap items-center gap-1.5">
          @for (crumb of crumbs(); track $index; let last = $last; let first = $first) {
            <li class="flex min-w-0 items-center gap-1.5">
              <!-- The first crumb doubles as the page title (pages no longer repeat it
                   in-body), so it renders larger and in full-contrast ink. -->
              @if (!last && crumb.route) {
                <a
                  [routerLink]="crumb.route"
                  class="max-w-48 truncate font-medium hover:underline"
                  [class]="first ? 'text-sm font-semibold text-base-content' : 'text-primary'"
                >
                  {{ crumb.label }}
                </a>
              } @else {
                <span
                  class="max-w-48 truncate font-medium"
                  [class]="first ? 'text-sm font-semibold text-base-content' : 'text-base-content/60'"
                  [attr.aria-current]="last ? 'page' : null"
                >
                  {{ crumb.label }}
                </span>
              }
              @if (!last) {
                <span class="select-none opacity-60" aria-hidden="true">/</span>
              }
            </li>
          }
        </ol>
      </nav>
      @if (positionLabel()) {
        <div class="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            class="btn btn-circle btn-ghost btn-xs"
            [attr.aria-label]="prevLabel()"
            [disabled]="!hasPrev()"
            (click)="prev.emit()"
          >
            <pc-icon name="chevron-left" [size]="4"></pc-icon>
          </button>
          <span class="whitespace-nowrap px-1 text-xs tabular-nums text-base-content/50">{{ positionLabel() }}</span>
          <button
            type="button"
            class="btn btn-circle btn-ghost btn-xs"
            [attr.aria-label]="nextLabel()"
            [disabled]="!hasNext()"
            (click)="next.emit()"
          >
            <pc-icon name="chevron-right" [size]="4"></pc-icon>
          </button>
        </div>
      }
    </div>
  `,
})
export class Breadcrumbs {
  public readonly crumbs = input.required<PcBreadcrumb[]>();

  /** Optional "N of M filtered" walk-the-list pager, rendered inline with the crumb trail. */
  public readonly positionLabel = input<string | null>(null);
  public readonly hasPrev = input<boolean>(false);
  public readonly hasNext = input<boolean>(false);
  public readonly prevLabel = input<string>('Previous record');
  public readonly nextLabel = input<string>('Next record');

  public readonly prev = output<void>();
  public readonly next = output<void>();
}
```

## File: libs/uxcommon/src/components/csv-import/persons-field-mapping.ts

```typescript
/**
 * Shared header-to-field auto-mapping heuristic for importing people from a
 * CSV/TSV file. Originally lived inline in `persons-grid.ts` (the legacy
 * modal importer); the CSV import wizard (spec §17, `/imports/new`) reuses it
 * verbatim rather than re-deriving a second mapping table.
 */
export const PERSONS_MAPPABLE_FIELDS: string[] = [
  'first_name',
  'middle_names',
  'last_name',
  'email',
  'email2',
  'mobile',
  'home_phone',
  'street_num',
  'street1',
  'street2',
  'apt',
  'city',
  'state',
  'zip',
  'country',
  'company',
  'tags',
  'notes',
];

const HEADER_TO_FIELD: Record<string, string> = {
  firstname: 'first_name',
  fname: 'first_name',
  givenname: 'first_name',
  middlename: 'middle_names',
  middlenames: 'middle_names',
  middleinitial: 'middle_names',
  lastname: 'last_name',
  lname: 'last_name',
  surname: 'last_name',
  familyname: 'last_name',
  name: 'first_name',
  email: 'email',
  emailaddress: 'email',
  email1: 'email',
  email1address: 'email',
  primaryemail: 'email',
  email2: 'email2',
  email2address: 'email2',
  secondaryemail: 'email2',
  mobile: 'mobile',
  mobilephone: 'mobile',
  cellphone: 'mobile',
  cell: 'mobile',
  phone: 'mobile',
  phonenumber: 'mobile',
  telephone: 'mobile',
  primaryphone: 'mobile',
  businessphone: 'mobile',
  homephone: 'home_phone',
  streetnum: 'street_num',
  streetnumber: 'street_num',
  homestreet: 'street1',
  homestreet1: 'street1',
  homestreet2: 'street2',
  homestreet3: 'street2',
  homeaddress: 'street1',
  homeaddresspobox: 'street2',
  homecity: 'city',
  homestate: 'state',
  homepostalcode: 'zip',
  homecountry: 'country',
  businessstreet: 'street1',
  businessstreet1: 'street1',
  businessstreet2: 'street2',
  businessstreet3: 'street2',
  businessaddress: 'street1',
  businessaddresspobox: 'street2',
  businesscity: 'city',
  businessstate: 'state',
  businesspostalcode: 'zip',
  businesscountry: 'country',
  address: 'street1',
  address1: 'street1',
  address2: 'street2',
  addressline1: 'street1',
  addressline2: 'street2',
  street: 'street1',
  streetaddress: 'street1',
  street1: 'street1',
  street2: 'street2',
  apt: 'apt',
  apartment: 'apt',
  unit: 'apt',
  suite: 'apt',
  city: 'city',
  town: 'city',
  state: 'state',
  province: 'state',
  stateprovince: 'state',
  region: 'state',
  zip: 'zip',
  zipcode: 'zip',
  postal: 'zip',
  postalcode: 'zip',
  postcode: 'zip',
  country: 'country',
  company: 'company',
  companyname: 'company',
  organization: 'company',
  organisation: 'company',
  employer: 'company',
  business: 'company',
  tag: 'tags',
  tags: 'tags',
  label: 'tags',
  labels: 'tags',
  groups: 'tags',
  notes: 'notes',
  note: 'notes',
  comments: 'notes',
};

/** Best-effort guess of which persons field a CSV header maps to, or '' (skip) if unknown. */
export function autoMapPersonsHeader(header: string): string {
  const raw = (header || '').toLowerCase().trim();
  const key = raw.replace(/[^a-z0-9]/g, '');
  return HEADER_TO_FIELD[key] || '';
}
```

## File: libs/uxcommon/src/components/detail-item/detail-item.ts

```typescript
import { Component, inject, input, output } from '@angular/core';
import { AlertService } from '../alerts/alert-service';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

@Component({
  selector: 'pc-detail-item',
  imports: [Icon],
  template: `
    <div class="flex flex-col gap-1 mb-4">
      <span class="pc-eyebrow">
        {{ label() }}
      </span>
      <div class="flex items-center gap-2">
        @if (icon()) {
          <pc-icon [name]="icon()!" [size]="4" class="text-base-content/40 flex-shrink-0"></pc-icon>
        }
        @if (value() && link()) {
          <button
            type="button"
            class="cursor-pointer text-left text-sm font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary break-words"
            (click)="linkClicked.emit()"
          >
            {{ value() }}
          </button>
        } @else {
          <span class="text-sm font-medium text-base-content break-words">
            @if (value()) {
              {{ value() }}
            } @else {
              <span class="italic text-base-content/30">Not provided</span>
            }
          </span>
        }
        @if (value() && copyable()) {
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-primary tooltip flex-shrink-0"
            [attr.data-tip]="'Copy ' + label()"
            (click)="copyToClipboard($event)"
          >
            <pc-icon name="document-duplicate" [size]="4"></pc-icon>
          </button>
        }
      </div>
    </div>
  `,
})
export class DetailItem {
  public label = input.required<string>();
  public value = input<string | null | undefined>();
  public icon = input<PcIconNameType | null | undefined>();
  public copyable = input<boolean>(false);
  /** Render the value as a clickable link that emits `linkClicked` (e.g. Address → Household). */
  public link = input<boolean>(false);
  public readonly linkClicked = output<void>();

  private readonly alertSvc = inject(AlertService);

  protected copyToClipboard(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    const val = this.value();
    if (!val) return;

    navigator.clipboard
      .writeText(val)
      .then(() => {
        this.alertSvc.showSuccess(`${this.label()} copied to clipboard`);
      })
      .catch(() => {
        this.alertSvc.showError(`Failed to copy ${this.label()}`);
      });
  }
}
```

## File: libs/uxcommon/src/components/detail-layout/detail-layout.ts

```typescript
import { Component, input, output } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';
import { PcBreadcrumb } from '../breadcrumbs/breadcrumbs';
import { DetailHeader } from '../detail-header/detail-header';

@Component({
  selector: 'pc-detail-layout',
  imports: [Icon, DetailHeader],
  host: {
    '(document:keydown)': 'handleKeydown($event)',
  },
  template: `
    <div class="flex min-h-full flex-col bg-base-200/50 p-6">
      <div class="flex w-full max-w-7xl flex-col gap-6">
        <!-- Header -->
        <pc-detail-header
          [title]="title()"
          [subtitle]="subtitle()"
          [crumbs]="crumbs()"
          [eyebrow]="eyebrow()"
          [statusChip]="statusChip()"
          [icon]="icon()"
          [iconSize]="iconSize()"
          [avatarText]="avatarText()"
          [isLoading]="isLoading()"
          [disabled]="disabled()"
          [showActions]="showActions()"
          [showDelete]="showDelete()"
          [showCancel]="showCancel()"
          [deleteText]="deleteText()"
          [btn1Text]="btn1Text()"
          [btn1Icon]="btn1Icon()"
          [positionLabel]="positionLabel()"
          [hasPrev]="hasPrev()"
          [hasNext]="hasNext()"
          [prevLabel]="prevLabel()"
          [nextLabel]="nextLabel()"
          (save)="save.emit($event)"
          (delete)="delete.emit()"
          (prevRecord)="prevRecord.emit()"
          (nextRecord)="nextRecord.emit()"
        >
          <ng-content select="[pc-title-suffix]" pc-title-suffix></ng-content>
          <ng-content select="[pc-actions-prefix]" pc-actions-prefix></ng-content>
          <ng-content select="[pc-actions-suffix]" pc-actions-suffix></ng-content>
          <ng-content select="[pc-overflow-extra]" pc-overflow-extra></ng-content>
        </pc-detail-header>

        <!-- Body/Content Area -->
        @if (isLoading()) {
          <div class="flex justify-center items-center py-20">
            <progress class="progress w-56"></progress>
          </div>
        } @else if (error()) {
          <div class="alert alert-error shadow-md border-error/20 flex items-center gap-3">
            <pc-icon name="exclamation-triangle" [size]="6"></pc-icon>
            <span>{{ error() }}</span>
          </div>
        } @else if (!hasRecord()) {
          <div class="alert alert-error shadow-md border-error/20 flex items-center gap-3">
            <pc-icon name="exclamation-triangle" [size]="6"></pc-icon>
            <span>{{ notFoundText() }}</span>
          </div>
        } @else {
          <!-- Main Content Slot -->
          <ng-content></ng-content>
        }
      </div>
    </div>
  `,
})
export class DetailLayout {
  public title = input.required<string>();
  public subtitle = input<string | null | undefined>();
  public crumbs = input<PcBreadcrumb[]>([]);
  public eyebrow = input<string>('');
  /** Optional success-tinted status chip beside the title (§3). */
  public statusChip = input<string | null>(null);
  public icon = input<PcIconNameType | null | undefined>();
  public iconSize = input<number>(6);
  /** Optional initials for a circular avatar left of the title (forwarded to the header). */
  public avatarText = input<string | null>(null);
  public isLoading = input.required<boolean>();
  public error = input<string | null | undefined>();
  public hasRecord = input<boolean>(true);
  public notFoundText = input<string>('Record not found or failed to load.');

  public showActions = input<boolean>(true);
  public showDelete = input<boolean>(false);
  /** A read/detail view has no edit to cancel — the header action is a navigation
   * "Edit". Off by default; edit forms use pc-detail-header directly and keep it. */
  public showCancel = input<boolean>(false);
  public deleteText = input<string>('Delete');
  public btn1Text = input<string>('Edit');
  public btn1Icon = input<PcIconNameType>('pencil-square');
  public disabled = input<boolean>(false);

  /** Optional "N of M filtered" pager; also drives J/K keyboard navigation while this page is open. */
  public positionLabel = input<string | null>(null);
  public hasPrev = input<boolean>(false);
  public hasNext = input<boolean>(false);
  public prevLabel = input<string>('Previous record');
  public nextLabel = input<string>('Next record');

  public readonly save = output<any>();
  public readonly delete = output<void>();
  public readonly prevRecord = output<void>();
  public readonly nextRecord = output<void>();

  protected handleKeydown(event: KeyboardEvent): void {
    if (!this.positionLabel()) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isEditableTarget(event.target)) return;

    const key = event.key.toLowerCase();
    if (key === 'j' && this.hasNext()) {
      event.preventDefault();
      this.nextRecord.emit();
    } else if (key === 'k' && this.hasPrev()) {
      event.preventDefault();
      this.prevRecord.emit();
    }
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}
```

## File: libs/uxcommon/src/components/empty-state/empty-state.ts

```typescript
import { Component, input } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

/**
 * The one empty-state idiom (design §3): icon + sentence naming the cause +
 * ONE projected action button. Never italic grey placeholder text.
 *
 * `bordered` (default) draws the dashed full-surface container; turn it off
 * when the surrounding surface (a table cell, a card body) already frames it.
 */
@Component({
  selector: 'pc-empty-state',
  imports: [Icon],
  template: `
    <div
      class="flex flex-col items-center gap-3 py-16 text-center"
      [class.rounded-xl]="bordered()"
      [class.border]="bordered()"
      [class.border-dashed]="bordered()"
      [class.border-base-300]="bordered()"
    >
      <pc-icon [name]="icon()" [size]="8" class="opacity-30" />
      <span class="text-base font-medium">{{ title() }}</span>
      @if (hint(); as h) {
        <span class="text-sm opacity-70">{{ h }}</span>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyState {
  public readonly bordered = input<boolean>(true);
  public readonly hint = input<string>();
  public readonly icon = input.required<PcIconNameType>();
  public readonly title = input.required<string>();
}
```

## File: libs/uxcommon/src/components/fields-selector/fields-selector.html

```html
<div class="space-y-0.5">
  <!-- Email is always required and locked -->
  <div class="flex items-center justify-between py-1 px-2 hover:bg-base-200/50 rounded-lg transition-colors">
    <label class="flex items-center gap-2.5 cursor-not-allowed select-none">
      <input type="checkbox" checked disabled class="checkbox checkbox-sm checkbox-primary" />
      <span class="text-sm font-bold text-primary">Email Address</span>
    </label>
    <span class="badge badge-sm badge-outline text-[10px] font-bold">Required</span>
  </div>

  @for (field of allFields; track field.key) {
  <div class="flex items-center justify-between py-1 px-2 hover:bg-base-200/50 rounded-lg transition-colors">
    <label class="flex items-center gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        [checked]="isEnabled(field.key)"
        (change)="toggleField(field.key)"
        class="checkbox checkbox-sm checkbox-primary"
      />
      <span class="text-sm font-medium text-base-content/85">{{ field.label }}</span>
    </label>
    @if (isEnabled(field.key)) {
    <button
      type="button"
      (click)="toggleRequired(field.key)"
      class="btn btn-xs rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-all"
      [class.btn-primary]="isRequired(field.key)"
      [class.btn-outline]="!isRequired(field.key)"
      [class.btn-accent]="!isRequired(field.key)"
    >
      {{ isRequired(field.key) ? 'Required' : 'Optional' }}
    </button>
    }
  </div>
  }
</div>
```

## File: libs/uxcommon/src/components/form-actions/form-actions.html

```html
<div class="flex gap-2 justify-center">
  <button
    type="button"
    class="btn btn-primary gap-2"
    [class.btn-xs]="size() === 'xs'"
    [class.btn-sm]="size() === 'sm'"
    (click)="handleBtn1Clicked()"
    [disabled]="isSaveDisabled"
  >
    @if (isLoading()) {
    <span class="loading loading-spinner loading-xs text-primary-content"></span>
    } @else {
    <pc-icon [name]="btn1Icon()" [size]="4" />
    } {{ btn1Text() }}
  </button>

  @if (showDelete()) {
  <button
    type="button"
    class="btn btn-error btn-outline gap-2"
    [class.btn-xs]="size() === 'xs'"
    [class.btn-sm]="size() === 'sm'"
    (click)="handleDeleteClicked()"
    [disabled]="isLoading()"
  >
    <pc-icon name="trash" [size]="4" />
    {{ deleteText() }}
  </button>
  } @if (buttonsToShow() === 'three' && !showDelete()) {
  <button
    type="button"
    class="btn btn-primary"
    [class.btn-xs]="size() === 'xs'"
    [class.btn-sm]="size() === 'sm'"
    (click)="handleBtn2Clicked()"
    [disabled]="isSaveDisabled"
  >
    @if (isLoading()) {
    <span class="loading loading-spinner loading-xs text-primary-content"></span>
    } @else { {{ btn2Text() }} }
  </button>
  } @if (showCancel()) {
  <button
    type="button"
    class="btn btn-outline btn-accent gap-2"
    [class.btn-xs]="size() === 'xs'"
    [class.btn-sm]="size() === 'sm'"
    (click)="cancel()"
    [disabled]="isLoading()"
  >
    <pc-icon name="x-mark" [size]="4" />
    Cancel
  </button>
  }
</div>
```

## File: libs/uxcommon/src/components/form-actions/form-actions.ts

```typescript
import { Component, inject, input, output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

/**
 * Minimal structural view of a signal-forms root (the object returned by
 * `form()` from '@angular/forms/signals'): calling it yields the root field
 * state. Kept structural so this shared control does not depend on the
 * experimental signal-forms types directly.
 */
export type SignalFormRoot = () => {
  dirty(): boolean;
  invalid(): boolean;
  reset(): void;
};

@Component({
  selector: 'pc-form-actions',
  imports: [Icon],
  templateUrl: './form-actions.html',
})
export class FormActions {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private stay = false;

  public signalForm = input<SignalFormRoot>();

  public disabled = input<boolean>(false);

  /**
   * §4 "Save never disables": when true, the primary button stays enabled
   * regardless of validity/dirtiness (only `isLoading`/`disabled` gate it). The
   * consuming form is expected to guide on click (markAsTouched + focus the
   * first invalid field) rather than block via a dead button.
   */
  public saveAlwaysEnabled = input<boolean>(false);

  public showDelete = input<boolean>(false);

  /** Whether to render the Cancel button. Read/detail views turn this off — a
   * read view has no edit to cancel; the header's action is a navigation "Edit". */
  public showCancel = input<boolean>(true);

  public deleteText = input<string>('Delete');

  public readonly deleteClicked = output<void>();

  public readonly btn1Clicked = output<() => void>();

  public btn1Icon = input<PcIconNameType>('save');

  public btn1Text = input<string>('Save');

  public btn2Text = input<string>('Save & add more');

  public buttonsToShow = input<'two' | 'three'>('three');

  /** Button size; detail-header uses 'xs' to sit inline with the compact record pager. */
  public size = input<'xs' | 'sm'>('sm');

  public isLoading = input.required<boolean>();

  protected get isSaveDisabled(): boolean {
    if (this.isLoading()) return true;
    if (this.disabled()) return true;
    // Save never disables on validity/dirtiness — the form guides on click.
    if (this.saveAlwaysEnabled()) return false;
    const sigF = this.signalForm();
    if (sigF) {
      return sigF().invalid() || !sigF().dirty();
    }
    // No form at all: plain button bar (e.g. list-view) — never gate Save.
    return false;
  }

  public cancel(): void {
    void this.router.navigate(['../'], { relativeTo: this.route });
  }

  public handleDeleteClicked(): void {
    this.deleteClicked.emit();
  }

  public handleBtn1Clicked(): void {
    this.stay = false;
    this.btn1Clicked.emit(this.stayOrCancel);
  }

  public handleBtn2Clicked(): void {
    this.stay = true;
    this.btn1Clicked.emit(this.stayOrCancel);
  }

  public stayOrCancel = (): void => {
    if (this.stay) {
      this.signalForm()?.().reset();
    } else {
      this.cancel();
    }
  };
}
```

## File: libs/uxcommon/src/components/grid-header/grid-header.ts

```typescript
import { Component, computed, input, signal } from '@angular/core';
import { Icon } from '@icons/icon';

@Component({
  selector: 'pc-grid-header',
  imports: [Icon],
  template: `
    <header class="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <!-- The visible page title is the navbar breadcrumb's first crumb; keep an
             sr-only h1 so the page still has an accessible heading. -->
        <h1 class="sr-only">{{ title() }}</h1>
        <div class="flex items-center gap-1.5">
          @if (countText(); as text) {
            <p class="text-xs tabular-nums text-base-content/60" aria-live="polite">{{ text }}</p>
          }
          @if (description()) {
            <button
              type="button"
              class="btn btn-circle btn-ghost btn-xs text-base-content/40 hover:text-primary"
              aria-label="About this page"
              [attr.aria-expanded]="descriptionOpen()"
              (click)="toggleDescription()"
            >
              <pc-icon name="information-circle" [size]="4"></pc-icon>
            </button>
          }
        </div>
        @if (descriptionOpen() && description()) {
          <p class="mt-1 max-w-2xl text-xs leading-relaxed text-base-content/60">{{ description() }}</p>
        }
      </div>
      <div class="flex items-center gap-2">
        <ng-content></ng-content>
      </div>
    </header>
  `,
})
export class GridHeaderComponent {
  public readonly title = input.required<string>();
  public readonly description = input<string>('');
  public readonly eyebrow = input<string>('');

  /** Initial expanded state of the description; the ⓘ button toggles it afterwards. */
  public readonly open = input<boolean>(false);

  /** Total row count for the current query; null while unknown (before the first load). */
  public readonly totalCount = input<number | null>(null);

  /** Whether any user-applied filter is narrowing the results. */
  public readonly filtered = input<boolean>(false);

  /**
   * Optional caller-provided sentence for the unfiltered total, e.g. "5,012 people total"
   * or "1,890 households across 8 wards". When filters are active it is appended after the
   * matched count: "43 match your filters · 5,012 people total".
   */
  public readonly totalSentence = input<string | null>(null);

  private readonly descToggled = signal<boolean | null>(null);
  protected readonly descriptionOpen = computed(() => this.descToggled() ?? this.open());

  private readonly countFormatter = new Intl.NumberFormat();

  protected readonly countText = computed<string | null>(() => {
    const count = this.totalCount();
    const sentence = this.totalSentence();
    if (count !== null && this.filtered()) {
      const matched =
        count === 1 ? '1 matches your filters' : `${this.countFormatter.format(count)} match your filters`;
      return sentence ? `${matched} · ${sentence}` : matched;
    }
    if (sentence) return sentence;
    if (count === null) return null;
    return count === 1 ? '1 total' : `${this.countFormatter.format(count)} total`;
  });

  protected toggleDescription(): void {
    this.descToggled.set(!this.descriptionOpen());
  }
}
```

## File: libs/uxcommon/src/components/modal-shell/modal-shell.ts

```typescript
import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

/**
 * The one modal chrome for form/tool dialogs: native <dialog> + DaisyUI modal
 * with the house header (primary icon, bold title, ghost-circle close) and a
 * `[pc-modal-footer]` slot for actions. Blocking yes/no decisions stay on
 * ConfirmDialogService — this shell is for dialogs with real content.
 *
 * Drive it either declaratively (`[open]="someSignal()"`) or imperatively via
 * a template ref (`#dlg` → `dlg.show()` / `dlg.close()`). `closed` fires on
 * every close path (X button, ESC, backdrop, programmatic).
 */
@Component({
  selector: 'pc-modal-shell',
  imports: [Icon],
  template: `
    <dialog #dlg class="modal" (close)="closed.emit()" (cancel)="onCancel($event)">
      <div class="modal-box" [class]="boxClass()">
        <div class="mb-5 flex items-center justify-between">
          <h3 class="flex items-center gap-2 text-lg font-bold">
            @if (icon(); as ic) {
              <pc-icon [name]="ic" [size]="5" class="text-primary" />
            }
            {{ title() }}
          </h3>
          <button type="button" class="btn btn-ghost btn-sm btn-circle" aria-label="Close" (click)="close()">
            <pc-icon name="x-mark" [size]="4" />
          </button>
        </div>
        <ng-content />
        <div class="modal-action empty:hidden">
          <ng-content select="[pc-modal-footer]" />
        </div>
      </div>
      @if (dismissible()) {
        <form method="dialog" class="modal-backdrop">
          <button type="submit" aria-label="Close">close</button>
        </form>
      }
    </dialog>
  `,
})
export class ModalShell {
  /** Extra classes for the modal box — width overrides only (e.g. 'max-w-3xl'). */
  public readonly boxClass = input<string>('');
  /** Allow ESC / backdrop-click to dismiss. Turn off for dialogs holding unsaved work. */
  public readonly dismissible = input<boolean>(true);
  public readonly icon = input<PcIconNameType | null>(null);
  /** Declarative visibility; leave unset to drive imperatively via show()/close(). */
  public readonly open = input<boolean | undefined>(undefined);
  public readonly title = input.required<string>();

  public readonly closed = output<void>();

  private readonly dlgRef = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const open = this.open();
      if (open === undefined) return;
      const dlg = this.dlgRef().nativeElement;
      try {
        if (open && !dlg.open) dlg.showModal();
        else if (!open && dlg.open) dlg.close();
      } catch {
        /* dialog not connected yet — the next effect run settles it */
      }
    });
  }

  public close(): void {
    const dlg = this.dlgRef().nativeElement;
    if (dlg.open) dlg.close();
  }

  public show(): void {
    const dlg = this.dlgRef().nativeElement;
    if (!dlg.open) dlg.showModal();
  }

  protected onCancel(e: Event): void {
    if (!this.dismissible()) e.preventDefault();
  }
}
```

## File: libs/uxcommon/src/components/public-link-panel/public-link-panel.html

```html
<pc-card [title]="label()" [subtitle]="subtitle()">
  <div class="space-y-3">
    <div class="flex gap-2">
      <input type="text" [value]="url()" readonly class="input input-bordered input-sm flex-1 font-mono text-xs" />
      <a
        [href]="url()"
        target="_blank"
        class="btn btn-sm btn-outline btn-secondary px-3 flex items-center justify-center"
        title="Open public page"
      >
        <pc-icon name="arrow-top-right-on-square"></pc-icon>
      </a>
      <button type="button" class="btn btn-sm btn-outline btn-secondary px-3" (click)="copyUrl()" title="Copy link">
        <pc-icon name="document-duplicate"></pc-icon>
      </button>
    </div>
  </div>
</pc-card>
```

## File: libs/uxcommon/src/components/stat-card/stat-card.ts

```typescript
import { Component, input } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

@Component({
  selector: 'pc-stat-card',
  imports: [Icon],
  template: `
    <div
      class="stats border border-base-200 bg-base-100 shadow-sm transition-all duration-200 hover:shadow-md flex flex-row items-center justify-between p-4 rounded w-full"
    >
      <div class="stat p-0 leading-normal">
        @if (title()) {
          <div class="stat-title pc-eyebrow">
            {{ title() }}
          </div>
        }
        @if (loading()) {
          <!-- Known-shape placeholder for the value: a skeleton block, never a spinner (§3). -->
          <div class="skeleton mt-1 h-6 w-16 rounded"></div>
        } @else {
          <div class="stat-value text-xl font-extrabold mt-1 sm:text-2xl tabular-nums" [class]="valueColorClass()">
            {{ value() }}
          </div>
        }
        <div class="stat-desc text-[10px] text-base-content/40 mt-1">
          @if (description()) {
            <span>{{ description() }}</span>
          }
          <ng-content select="[pc-stat-desc]"></ng-content>
        </div>
      </div>

      <div class="flex-shrink-0 flex items-center justify-center gap-2">
        @if (icon()) {
          <div class="w-12 h-12 rounded-xl flex items-center justify-center" [class]="iconBgClass()">
            <pc-icon [name]="icon()!" [size]="6" [class]="iconColorClass()"></pc-icon>
          </div>
        }
        <ng-content select="[pc-stat-extra]"></ng-content>
      </div>
    </div>
  `,
})
export class StatCard {
  public title = input<string>();
  public value = input<string | number>();
  /** When true, the value renders as a skeleton block instead of a number/spinner. */
  public loading = input<boolean>(false);
  public description = input<string>();
  public icon = input<PcIconNameType>();
  public valueColorClass = input<string>('text-base-content');
  public iconBgClass = input<string>('bg-base-200/50');
  public iconColorClass = input<string>('text-base-content/70');
}
```

## File: libs/uxcommon/src/components/status-badge/status-badge.ts

```typescript
import { Component, computed, input } from '@angular/core';

export type PcStatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'ghost';

@Component({
  selector: 'pc-status-badge',
  template: `
    <span class="badge font-semibold uppercase" [class]="badgeClass()">
      <ng-content></ng-content>
    </span>
  `,
})
export class StatusBadge {
  public type = input<PcStatusType>('ghost');
  public size = input<'xs' | 'sm' | 'md' | 'lg'>('xs');

  protected badgeClass = computed(() => {
    const t = this.type();
    let cls = '';
    if (this.size() === 'xs') cls += 'badge-xs ';
    else if (this.size() === 'sm') cls += 'badge-sm ';
    else if (this.size() === 'md') cls += 'badge-md ';
    else if (this.size() === 'lg') cls += 'badge-lg ';

    switch (t) {
      case 'success':
        return cls + 'badge-success text-success-content';
      case 'warning':
        return cls + 'badge-warning text-warning-content';
      case 'error':
        return cls + 'badge-error text-error-content';
      case 'info':
        return cls + 'badge-info text-info-content';
      case 'neutral':
        return cls + 'badge-neutral text-neutral-content';
      default:
        return cls + 'badge-ghost';
    }
  });
}
```

## File: libs/uxcommon/src/components/swap/swap.ts

```typescript
import { Component, input, output } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

@Component({
  selector: 'pc-swap',
  imports: [Icon],
  template: `<label
    class="swap ml-auto flex-none cursor-pointer p-2"
    [class.swap-flip]="animation() === 'flip'"
    [class.swap-rotate]="animation() === 'rotate'"
    [class.swap-active]="checked()"
    (click)="emitClick($event)"
  >
    <pc-icon [name]="swapOnIcon()!" class="swap-on" [size]="size()" />

    <pc-icon [name]="swapOffIcon()!" [hover]="hoverIcon()" class="swap-off" [size]="size()" />
  </label> `,
})
export class Swap {
  // eslint-disable-next-line @angular-eslint/no-output-native -- pre-existing public API; renaming `click` breaks every pc-swap consumer and is out of scope here
  public readonly click = output<void>();

  public animation = input<'flip' | 'rotate'>('rotate');

  public checked = input<boolean>(false);
  public hoverIcon = input<PcIconNameType | null>(null);
  public size = input(6);

  public swapOffIcon = input.required<PcIconNameType>();

  public swapOnIcon = input.required<PcIconNameType>();

  public emitClick(event: Event) {
    event.stopPropagation();
    this.click.emit();
  }
}
```

## File: libs/uxcommon/src/components/table/table.ts

````typescript
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * `pc-table` — the lightweight presentational table shell.
 *
 * The counterpart to the house `pc-datagrid`: where the datagrid owns data
 * fetching, sorting, filtering, selection and inline editing, `pc-table` owns
 * only the *chrome* — the bordered shell, the micro-caps header row, cell
 * density and the shared skeleton-loading idiom. It exists so bespoke tables
 * (Tags, Issues, Donations) stay visually identical to the datagrid without
 * inheriting its machinery. See the `pplcrm-table` skill.
 *
 * All visual styling comes from the shared, global `.pc-table-shell` / `.pc-table`
 * contract in `apps/frontend/src/styles.css` — the single source of truth both
 * this component and the datagrid consume. This component ships no styles of its
 * own (emulated encapsulation could not reach the projected rows anyway).
 *
 * Consumers keep full control of every cell and of the empty state (which is
 * per-entity by design — see design principles §3), projecting:
 *   - `[pcTableHead]` — the `<th>` cells for the header row
 *   - the default slot — the body rows *and* the page's own empty-state row,
 *     rendered only when not loading
 *   - `[pcTableFooter]` — optional caption/pagination hint rendered inside the
 *     shell, below the table (e.g. "Showing the latest 25 of 312")
 *
 * ```html
 * <pc-table [loading]="loading()" [columns]="5">
 *   <ng-container pcTableHead>
 *     <th>Tag</th><th>People</th><th>Last applied</th><th class="w-10"></th>
 *   </ng-container>
 *
 *   @if (rows().length === 0) {
 *     <tr><td colspan="5">…guided empty state…</td></tr>
 *   } @else {
 *     @for (row of rows(); track row.id) {
 *       <tr [class.animate-saved-flash]="highlightId() === row.id">…</tr>
 *     }
 *   }
 * </pc-table>
 * ```
 */
@Component({
  selector: 'pc-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pc-table-shell">
      <table class="table pc-table w-full">
        <thead>
          <tr>
            <ng-content select="[pcTableHead]"></ng-content>
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            @for (row of skeletonList(); track row) {
              <tr>
                <td [attr.colspan]="columns()">
                  <div class="skeleton h-6 w-full"></div>
                </td>
              </tr>
            }
          } @else {
            <ng-content></ng-content>
          }
        </tbody>
      </table>
      <ng-content select="[pcTableFooter]"></ng-content>
    </div>
  `,
})
export class Table {
  /** Number of columns — drives the skeleton row's colspan so it spans the table. */
  public readonly columns = input.required<number>();

  /** When true, render placeholder skeleton rows instead of the projected body. */
  public readonly loading = input<boolean>(false);

  /** How many skeleton rows to show while loading. */
  public readonly skeletonRows = input<number>(5);

  protected readonly skeletonList = computed<number[]>(() => Array.from({ length: this.skeletonRows() }, (_, i) => i));
}
````

## File: libs/uxcommon/src/components/tabs/tabs.ts

```typescript
import { Component, computed, input, model } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface PcTabOption {
  id: string;
  label: string;
  badge?: string | number;
  disabled?: boolean;
  tooltip?: string;
  /** When set, the pill renders as a router link (page-level tabs that navigate) instead of a stateful button. */
  route?: string;
  /** Match the route exactly for the active state (default false). */
  exact?: boolean;
}

const PILL_BASE =
  'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors focus:outline-none';
const PILL_ACTIVE = 'border-primary/30 bg-primary/10 text-primary';
const PILL_INACTIVE = 'border-base-200 bg-base-100 text-base-content/70';

/**
 * The one tab idiom (design §4): the pill tab bar from the person view, with count
 * badges ("numbers before clicks", §1). Stateful tabs bind `[(activeTab)]`; tabs that
 * navigate set `route` on the option instead. The only sanctioned exception is the
 * grain-tabs row on the People / Households / Companies grids.
 */
@Component({
  selector: 'pc-tab-bar',
  imports: [RouterLink, RouterLinkActive],
  host: { class: 'block' },
  template: `
    <div role="tablist" class="flex flex-wrap gap-2">
      @for (tab of tabs(); track tab.id) {
        @if (tab.route) {
          <a
            role="tab"
            [routerLink]="tab.route"
            routerLinkActive="!border-primary/30 !bg-primary/10 !text-primary"
            [routerLinkActiveOptions]="{ exact: tab.exact ?? false }"
            class="{{ pillBase }} {{ pillInactive }} cursor-pointer hover:bg-base-200/60"
          >
            <span>{{ tab.label }}</span>
            @if (tab.badge !== undefined && tab.badge !== null) {
              <span class="rounded-full bg-base-200 px-1.5 text-xs font-semibold tabular-nums text-base-content/50">{{
                tab.badge
              }}</span>
            }
          </a>
        } @else {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="activeTab() === tab.id"
            [attr.aria-disabled]="tab.disabled || null"
            [class]="pillClass(tab)"
            [class.tooltip]="tab.disabled && tab.tooltip"
            [attr.data-tip]="tab.disabled && tab.tooltip ? tab.tooltip : null"
            (click)="!tab.disabled && selectTab(tab.id)"
          >
            <span>{{ tab.label }}</span>
            @if (tab.badge !== undefined && tab.badge !== null) {
              <span
                class="rounded-full px-1.5 text-xs font-semibold tabular-nums"
                [class]="activeTab() === tab.id ? 'bg-primary/20 text-primary' : 'bg-base-200 text-base-content/50'"
                >{{ tab.badge }}</span
              >
            }
          </button>
        }
      }
    </div>
  `,
})
export class TabBar {
  public tabs = input.required<PcTabOption[]>();
  public activeTab = model<string>('');

  protected readonly pillBase = PILL_BASE;
  protected readonly pillInactive = PILL_INACTIVE;

  protected pillClass(tab: PcTabOption): string {
    const state = this.activeTab() === tab.id ? PILL_ACTIVE : PILL_INACTIVE;
    const cursor = tab.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer';
    const hover = !tab.disabled && this.activeTab() !== tab.id ? 'hover:bg-base-200/60' : '';
    return `${PILL_BASE} ${state} ${cursor} ${hover}`;
  }

  protected selectTab(id: string): void {
    this.activeTab.set(id);
  }
}

/** Pill tab bar + the standard content card (the person-view composition) with projected pc-tab-panels. */
@Component({
  selector: 'pc-tabs',
  imports: [TabBar],
  host: { class: 'flex flex-grow flex-col gap-6' },
  template: `
    <pc-tab-bar [tabs]="tabs()" [(activeTab)]="activeTab" />
    <div class="card rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm">
      <ng-content></ng-content>
    </div>
  `,
})
export class Tabs {
  public tabs = input.required<PcTabOption[]>();
  public activeTab = model.required<string>();
}

@Component({
  selector: 'pc-tab-panel',
  template: `
    @if (isActive()) {
      <div class="space-y-4">
        <ng-content></ng-content>
      </div>
    }
  `,
})
export class TabPanel {
  public id = input.required<string>();
  public activeTab = input.required<string>();

  protected isActive = computed(() => this.activeTab() === this.id());
}
```

## File: libs/uxcommon/src/components/user-avatar/user-avatar.ts

```typescript
import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'pc-user-avatar',
  template: `
    <div class="avatar" [class.placeholder]="!avatarUrl()">
      @if (avatarUrl()) {
        <div
          class="rounded-full overflow-hidden ring ring-base-100 ring-offset-1"
          [style.width.rem]="sizeRem()"
          [style.height.rem]="sizeRem()"
        >
          <img
            [src]="avatarUrl()!"
            [alt]="name() + ' avatar'"
            class="w-full h-full object-cover"
            referrerpolicy="no-referrer"
          />
        </div>
      } @else {
        <div
          class="rounded-full grid place-items-center font-bold ring ring-base-100 ring-offset-1 bg-primary/15 text-primary"
          [style.width.rem]="sizeRem()"
          [style.height.rem]="sizeRem()"
          [style.font-size.rem]="fontSizeRem()"
        >
          <span>{{ initials() }}</span>
        </div>
      }
    </div>
  `,
  host: { class: 'contents' },
})
export class UserAvatarComponent {
  readonly avatarUrl = input<string | null | undefined>(null);

  readonly name = input.required<string>();

  readonly size = input<number>(8);

  protected readonly sizeRem = computed(() => this.size() * 0.25);
  protected readonly fontSizeRem = computed(() => Math.max(0.5, this.size() * 0.25 * 0.4));

  protected readonly initials = computed(() => {
    const n = (this.name() ?? '').trim();
    if (!n) return '?';
    const parts = n.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    }
    return n[0]!.toUpperCase();
  });
}
```

## File: libs/uxcommon/src/components/confirm-dialog-host.html

```html
<dialog #dlg class="modal">
  @if (state()) {
  <div class="modal-box">
    <div class="flex items-center gap-2">
      <pc-icon [name]="icon()" class="text-xl" />
      <h3 class="text-lg font-bold">{{ state()!.title }}</h3>
    </div>

    @if (state()!.message) {
    <p class="pt-4 pb-6 font-light whitespace-pre-line">{{ state()!.message }}</p>
    } @if (state()!.type === 'prompt') {
    <input
      [placeholder]="state()!.inputPlaceholder || ''"
      class="input input-bordered w-full mb-4"
      [value]="promptValue()"
      (input)="onPromptInput($event)"
    />
    } @if (state()!.type === 'choose') {
    <div class="flex flex-col gap-2 w-full mt-4">
      @for (choice of state()!.choices; track choice.label) {
      <button class="btn w-full" [class]="choiceBtnClass(choice.variant)" (click)="onChoice(choice.value)">
        {{ choice.label }}
      </button>
      } @if (showCancel()) {
      <button class="btn w-full font-normal" (click)="onCancel()">{{ state()!.cancelText }}</button>
      }
    </div>
    } @else {
    <div class="flex justify-end gap-2">
      @if (showCancel()) {
      <button class="btn" [class]="cancelBtnClass()" (click)="onCancel()">{{ state()!.cancelText }}</button>
      }
      <button class="btn" [class]="confirmBtnClass()" (click)="onConfirm()">{{ state()!.confirmText }}</button>
    </div>
    }
  </div>

  <form method="dialog" class="modal-backdrop" (submit)="onBackdrop()">
    <button>close</button>
  </form>
  }
</dialog>
```

## File: libs/uxcommon/src/directives/spin-on-click.directive.ts

```typescript
import { Directive, DestroyRef, ElementRef, inject, input } from '@angular/core';

@Directive({
  selector: 'button[pcSpinOnClick]',
  exportAs: 'pcSpinOnClick',
  host: { '(click)': 'onButtonClick()' },
})
export class SpinOnClickDirective {
  private readonly el = inject(ElementRef<HTMLButtonElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly minMs = input(700);

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearTimer());
  }

  protected onButtonClick(): void {
    const icon = this.el.nativeElement.querySelector('pc-icon') as HTMLElement | null;
    if (!icon) return;

    icon.classList.add('animate-spin', 'inline-block');
    this.clearTimer();

    this.timer = setTimeout(() => {
      icon.classList.remove('animate-spin', 'inline-block');
      this.timer = null;
    }, this.minMs());
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
```

## File: libs/uxcommon/src/pipes/timeago.pipe.ts

```typescript
import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform, inject } from '@angular/core';

export interface TimeAgoOptions {
  thresholdDays?: number;
  style?: 'long' | 'short' | 'compact' | string;
  compact?: boolean;
  hideSuffix?: boolean;
  // Index signature ensures any other existing options in your codebase are accepted
  [key: string]: any;
}

@Pipe({
  name: 'timeAgo', // Matched to your template casing
  pure: false, // Must be false to update the UI over time
})
export class TimeAgoPipe implements PipeTransform, OnDestroy {
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private lastValue?: string | number | Date | null;
  private lastOptsJson?: string;
  private lastResult = '';

  private readonly cdr = inject(ChangeDetectorRef);

  public transform(value: string | number | Date | null | undefined, opts?: TimeAgoOptions): string {
    // Stringify options to avoid pure:false memory reference loops
    const optsJson = opts ? JSON.stringify(opts) : '';

    // Only recalculate if the date OR the options have actually changed
    if (this.lastValue === value && this.lastOptsJson === optsJson && this.timerId) {
      return this.lastResult;
    }

    this.lastValue = value;
    this.lastOptsJson = optsJson;
    this.clearTimer();

    if (!value) {
      this.lastResult = '';
      return this.lastResult;
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      this.lastResult = String(value);
      return this.lastResult;
    }

    const diffMs = new Date().getTime() - date.getTime();

    // Calculate and cache the result
    this.lastResult = this.formatTimeAgo(date, diffMs, opts);
    this.setupTimer(diffMs);

    return this.lastResult;
  }

  private formatTimeAgo(date: Date, diffMs: number, opts?: TimeAgoOptions): string {
    const seconds = Math.floor(Math.abs(diffMs) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    // If a threshold is set and exceeded, fallback to a standard date string
    if (opts?.thresholdDays !== undefined && days >= opts.thresholdDays) {
      return date.toLocaleDateString(undefined, {
        month: opts.style === 'short' ? 'short' : 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    const suffix = opts?.hideSuffix ? '' : ' ago';

    // Handle compact/short styles
    if (opts?.compact || opts?.style === 'compact' || opts?.style === 'short') {
      if (seconds < 60) return 'now';
      if (minutes < 60) return `${minutes}m`;
      if (hours < 24) return `${hours}h`;
      return `${days}d`;
    }

    // Default long style
    if (seconds < 60) return 'just now';
    if (minutes === 1) return `a minute${suffix}`;
    if (minutes < 60) return `${minutes} minutes${suffix}`;
    if (hours === 1) return `an hour${suffix}`;
    if (hours < 24) return `${hours} hours${suffix}`;
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days} days${suffix}`;

    const months = Math.floor(days / 30);
    if (months === 1) return `a month${suffix}`;
    if (months < 12) return `${months} months${suffix}`;

    const years = Math.floor(days / 365);
    if (years === 1) return `a year${suffix}`;
    return `${years} years${suffix}`;
  }

  private setupTimer(diffMs: number): void {
    const seconds = Math.floor(Math.abs(diffMs) / 1000);
    const minutes = Math.floor(seconds / 60);

    let timeoutMs = 60000;

    // Scale update frequency based on age to save CPU
    if (seconds < 60) {
      timeoutMs = 10000; // 10 seconds
    } else if (minutes < 60) {
      timeoutMs = 60000; // 1 minute
    } else if (minutes < 1440) {
      timeoutMs = 3600000; // 1 hour
    } else {
      timeoutMs = 86400000; // 1 day
    }

    // Native setTimeout triggers Angular's zoneless scheduler internally
    // when markForCheck is called inside it.
    this.timerId = setTimeout(() => {
      this.cdr.markForCheck();
    }, timeoutMs);
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public ngOnDestroy(): void {
    this.clearTimer();
  }
}
```

## File: libs/uxcommon/src/styles/themes.css

```css
/*
 * Shared DaisyUI theme tokens — the single source of truth for the pplCRM
 * palette, consumed by every app (apps/frontend, apps/companion). Import this
 * from each app's styles.css right after `@plugin "daisyui";`. Do not fork
 * these values into an app-local theme block; change them here.
 */

/* base-50: the sub-base-200 "card wash" tint. Registered here so Tailwind generates
   bg-base-50 (incl. /NN opacity modifiers); the real value is set per theme in the
   DaisyUI blocks below, same as --color-line. */
@theme {
  --color-base-50: #fbfbfc;
}

/* pc-icon builds `w-${size} h-${size}` at runtime (icon.ts), which Tailwind's static
   scanner cannot see — without this safelist an icon size only works if some other
   file happens to use the same w-/h- class literally. Covers every [size] in use. */
@source inline("{w,h}-{2,3,4,5,6,7,8,10,12,16}");

@plugin "daisyui/theme" {
  name: 'light';
  default: true;
  --color-primary: #3498db;
  --color-primary-content: #ffffff;
  --color-secondary: #22a6b3;
  --color-secondary-content: #ffffff;
  --color-accent: #818789;
  --color-accent-content: #f0f0f0;
  --color-neutral: #cbd5e1;
  --color-neutral-content: #1f2937;
  --color-base-50: #fbfbfc; /* card wash — between base-100 and base-200 */
  --color-base-100: #ffffff;
  --color-base-200: #f8f8f8ff;
  --color-base-300: rgb(226, 226, 226);
  --color-base-content: #1f2937;
  --color-info: #38bdf8;
  --color-success: #2dd4bf;
  --color-success-content: #053a34;
  --color-warning: #e3d6a7;
  --color-warning-content: #4a3d0a;
  --color-error: #eb4d4b;
  --color-error-content: #ffffff;

  /* Hairline border token — one line color app-wide, per theme (design §5). */
  --color-line: #e7e5e4;

  /* Button/input rounding — the app-wide "slight rounded edge". Pinned explicitly so the
     look survives DaisyUI default changes; per-button rounded-* utilities are forbidden
     (UX-GUIDELINES "Buttons"). */
  --radius-field: 0.25rem;

  --tooltip-bg: #333333;
  --tooltip-color: #eeeeee;
  --color-placeholder: #9ca3af;
}

@plugin "daisyui/theme" {
  name: 'dark';

  /* Brand / accent */
  --color-primary: #3ea6ff; /* bright azure */
  --color-secondary: #20d7a7; /* teal pop (optional) */
  --color-accent: #3ea6ff;
  --color-accent-content: #0b1220; /* dark text on bright azure */

  /* Text + neutrals */
  --color-neutral: #0e182b; /* chrome / panels */
  --color-neutral-content: #c7d1e5; /* default text on dark */

  /* Surfaces */
  --color-base-50: #0f1729; /* card wash — between base-100 and base-200 */
  --color-base-100: #0b1220; /* app/page background */
  --color-base-200: #131e31; /* row alt / subtle surface */
  --color-base-300: #1a2b45; /* headers / raised surface */

  /* Hairline border token — one line color app-wide, per theme (design §5). */
  --color-line: #1a2b45;

  /* Button/input rounding — keep identical to the light theme (UX-GUIDELINES "Buttons"). */
  --radius-field: 0.25rem;

  /* Feedback */
  --color-info: #3ea6ff;
  --color-success: #22c55e;
  --color-success-content: #052e12;
  --color-warning: #f59e0b;
  --color-warning-content: #3d2a05;
  --color-error: #ef4444;
  --color-error-content: #2b0505;

  /* Tooltips */
  --tooltip-bg: #0e1626;
  --tooltip-color: #e6edf7;
}
```

## File: libs/uxcommon/src/request-guard.ts

````typescript
export type RequestGuard = {
  /**
   * Marks the start of a new request and returns a checker for it. After each
   * `await`, bail out unless the checker still returns true — a newer request
   * has superseded this one and its (stale) response must not land.
   */
  begin(): () => boolean;
};

/**
 * Guards a reloadable async data source against out-of-order responses: when a
 * component reloads on an input change (e.g. prev/next record navigation), a
 * slow earlier response must not overwrite the newer record.
 *
 * ```ts
 * private readonly guard = createRequestGuard();
 *
 * async load(id: string) {
 *   const isCurrent = this.guard.begin();
 *   const data = await this.svc.getById(id);
 *   if (!isCurrent()) return;
 *   this.detail.set(data);
 * }
 * ```
 */
export function createRequestGuard(): RequestGuard {
  let sequence = 0;
  return {
    begin(): () => boolean {
      const requestId = ++sequence;
      return () => requestId === sequence;
    },
  };
}
````

## File: libs/common/src/lib/schemas/marketing.schema.ts

```typescript
import { z } from 'zod';

import { idSchema } from './core.schema';

export const marketingEmailTopLinkObj = z.object({
  url: z.string(),
  clicks: z.number().int().nonnegative(),
});

export const MarketingEmailObj = z.object({
  id: z.string(),
  tenant_id: z.string(),
  name: z.string(),
  status: z.enum(['draft', 'scheduled', 'paused', 'sent', 'archived']).default('sent'),
  subject: z.string().nullable().optional(),
  preview_text: z.string().nullable().optional(),
  audience_description: z.string().nullable().optional(),
  target_lists: z.string().nullable().optional(),
  segments: z.string().nullable().optional(),
  total_recipients: z.number().int().nonnegative(),
  delivered_count: z.number().int().nonnegative(),
  bounce_count: z.number().int().nonnegative(),
  open_rate: z.number(),
  click_rate: z.number(),
  unique_opens: z.number().int().nonnegative(),
  unique_clicks: z.number().int().nonnegative(),
  unsubscribe_count: z.number().int().nonnegative(),
  spam_complaint_count: z.number().int().nonnegative(),
  reply_count: z.number().int().nonnegative(),
  send_date: z.coerce.date().nullable(),
  last_engagement_at: z.coerce.date().nullable().optional(),
  summary: z.string().nullable().optional(),
  html_content: z.string().nullable().optional(),
  plain_text_content: z.string().nullable().optional(),
  top_links: z.array(marketingEmailTopLinkObj).nullable().optional(),
  updated_at: z.coerce.date(),
  created_at: z.coerce.date(),
  createdby_id: z.string(),
  updatedby_id: z.string(),
});

export const AddMarketingEmailObj = z.object({
  /** Campaigns §15 — the context this newsletter sends within; backend defaults to the office. */
  campaign_id: idSchema.optional(),
  name: z.string(),
  status: z.enum(['draft', 'scheduled', 'paused', 'sent', 'archived']).default('draft').optional(),
  subject: z.string().nullable().optional(),
  preview_text: z.string().nullable().optional(),
  audience_description: z.string().nullable().optional(),
  target_lists: z.string().nullable().optional(),
  segments: z.string().nullable().optional(),
  total_recipients: z.number().int().nonnegative().default(0).optional(),
  delivered_count: z.number().int().nonnegative().default(0).optional(),
  bounce_count: z.number().int().nonnegative().default(0).optional(),
  open_rate: z.number().min(0).max(100).default(0).optional(),
  click_rate: z.number().min(0).max(100).default(0).optional(),
  unique_opens: z.number().int().nonnegative().default(0).optional(),
  unique_clicks: z.number().int().nonnegative().default(0).optional(),
  unsubscribe_count: z.number().int().nonnegative().default(0).optional(),
  spam_complaint_count: z.number().int().nonnegative().default(0).optional(),
  reply_count: z.number().int().nonnegative().default(0).optional(),
  send_date: z.coerce.date().nullable().optional(),
  last_engagement_at: z.coerce.date().nullable().optional(),
  summary: z.string().nullable().optional(),
  html_content: z.string().nullable().optional(),
  plain_text_content: z.string().nullable().optional(),
  top_links: z.array(marketingEmailTopLinkObj).nullable().optional(),
});

export const UpdateMarketingEmailObj = AddMarketingEmailObj.partial();

/* ------------------------------------------------------------------ */
/* Newsletter report — the shape of newsletters.getReport             */
/* ------------------------------------------------------------------ */

/** A CRM person matched by email — enough to render a link to their record. */
export const NewsletterReportPersonObj = z.object({
  id: z.string(),
  /** Opaque public id — the canonical /people/:id route key. */
  public_id: z.string().nullable(),
  name: z.string(),
});

export const NewsletterReportBounceObj = z.object({
  email: z.string(),
  /** hard = permanent, soft = provider deferral ('blocked'), dropped = never attempted. */
  kind: z.enum(['hard', 'soft', 'dropped']),
  reason: z.string().nullable(),
  occurred_at: z.coerce.date().nullable(),
  person: NewsletterReportPersonObj.nullable(),
});

export const NewsletterReportEngagedObj = z.object({
  email: z.string(),
  opens: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  /** Distinct links clicked — 0 when unknown (raw events already pruned). */
  links: z.number().int().nonnegative(),
  person: NewsletterReportPersonObj.nullable(),
});

export const NewsletterReportLinkObj = z.object({
  url: z.string(),
  clicks: z.number().int().nonnegative(),
  /** Unique clickers of this link — null when unknown (raw events already pruned). */
  people: z.number().int().nonnegative().nullable(),
});

export const NewsletterReportPreviousSendObj = z.object({
  id: z.string(),
  name: z.string(),
  send_date: z.coerce.date().nullable(),
  open_rate: z.number(),
  click_rate: z.number(),
  unsubscribe_rate: z.number(),
  bounce_rate: z.number(),
});

export const NewsletterReportObj = z.object({
  /** Hourly opens/clicks buckets from raw events (empty once events are pruned). */
  timeline: z.array(
    z.object({
      time: z.string(),
      opens: z.number().int().nonnegative(),
      clicks: z.number().int().nonnegative(),
    }),
  ),
  /** Share of all opens that landed within 24h of send — null when not computable. */
  opens_in_24h_pct: z.number().nullable(),
  bounces: z.object({
    total: z.number().int().nonnegative(),
    hard: z.number().int().nonnegative(),
    soft: z.number().int().nonnegative(),
    dropped: z.number().int().nonnegative(),
    rows: z.array(NewsletterReportBounceObj),
  }),
  top_links: z.array(NewsletterReportLinkObj),
  tracked_links: z.number().int().nonnegative(),
  total_clicks: z.number().int().nonnegative(),
  unique_clickers: z.number().int().nonnegative(),
  most_engaged: z.array(NewsletterReportEngagedObj),
  unsubscribes: z.object({
    total: z.number().int().nonnegative(),
    /** Reason buckets; null reason = "No reason given" (no unsubscribe survey exists yet). */
    reasons: z.array(z.object({ reason: z.string().nullable(), count: z.number().int().nonnegative() })),
  }),
  spam_reports: z.object({
    total: z.number().int().nonnegative(),
    rows: z.array(z.object({ email: z.string().nullable(), occurred_at: z.coerce.date().nullable() })),
  }),
  audience: z.object({
    lists: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        mode: z.enum(['include', 'exclude']),
        members: z.number().int().nonnegative(),
      }),
    ),
    /** Members in more than one included list, counted once. */
    overlap_removed: z.number().int().nonnegative(),
    /** Included members whose address is on the suppression list. */
    suppressed_skipped: z.number().int().nonnegative(),
  }),
  /** Up to the last 5 sent newsletters in this campaign, oldest → newest, ending with this send. */
  previous_sends: z.array(NewsletterReportPreviousSendObj),
  from: z.object({ name: z.string().nullable(), email: z.string().nullable() }).nullable(),
});

export const CreateClickersListResultObj = z.object({
  id: z.string(),
  name: z.string(),
  members: z.number().int().nonnegative(),
});
```

## File: libs/uxcommon/src/components/alerts/alerts.html

```html
<div
  class="pointer-events-none z-50 flex w-full flex-col items-center gap-2 px-4"
  [class.absolute]="!isPositionRelative()"
  [class.left-0]="!isPositionRelative()"
  [class.top-4]="isPositionTop()"
  [class.bottom-4]="isPositionBottom()"
>
  @for (alert of alerts(); track alert.id) {
  <div
    class="pointer-events-auto relative flex max-w-[520px] cursor-pointer items-start gap-2 rounded-[10px] border border-base-300 bg-base-100 px-3.5 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,.16)]"
    role="alert"
    *pcAnimateIf="alert.visible; enter: getEnterAnim(); exit: getExitAnim()"
    (click)="dismiss(alert.id)"
  >
    <span
      aria-hidden="true"
      class="absolute -left-[3px] top-1.5 bottom-1.5 w-[5px] rounded-full {{ barToneClass(alert.type) }}"
    ></span>
    <pc-icon [name]="icon(alert.type)" [size]="4" class="mt-px shrink-0 {{ toneClass(alert.type) }}"></pc-icon>
    <div class="line-clamp-3 text-[12.5px] leading-[1.45] text-base-content [overflow-wrap:anywhere]">
      {{ alert.text }}
    </div>
    @if (alert.count() > 1) {
    <span
      class="mt-px shrink-0 rounded-full bg-base-content/10 px-[7px] py-px text-[10.5px] font-semibold tabular-nums text-base-content"
    >
      ×{{ alert.count() }}
    </span>
    }
  </div>
  }
</div>
```

## File: libs/uxcommon/src/components/alerts/alerts.ts

```typescript
import { Component, computed, inject, input } from '@angular/core';
import { Icon } from '@icons/icon';
import type { PcIconNameType } from '@icons/icons.index';
import { AnimateIfDirective } from '@uxcommon/directives/animate-if.directive';

import { ALERTTYPE, AlertService } from './alert-service';

@Component({
  selector: 'pc-alerts',
  imports: [Icon, AnimateIfDirective],
  templateUrl: './alerts.html',
})
export class Alerts {
  protected alertSvc = inject(AlertService);

  public position = input<'top' | 'bottom' | 'relative'>('bottom');

  protected readonly alerts = computed(() => {
    const list = this.alertSvc.alertList();
    // Service list is newest-first; render newest nearest the pinned edge
    // (bottom of the stack when pinned bottom — spec §2).
    return this.isPositionBottom() ? list.slice().reverse() : list;
  });

  protected dismiss(id: string): void {
    this.alertSvc.dismiss(id);
  }

  protected getEnterAnim(): string {
    return this.isPositionTop() || this.isPositionRelative() ? 'animate-down' : 'animate-up';
  }

  protected getExitAnim(): string {
    return this.isPositionTop() || this.isPositionRelative() ? 'animate-exit-up' : 'animate-exit-down';
  }

  protected icon(type?: ALERTTYPE): PcIconNameType {
    return type === 'success'
      ? 'check-circle'
      : type === 'warning'
        ? 'exclamation-triangle'
        : type === 'error'
          ? 'exclamation-circle'
          : 'information-circle';
  }

  protected isPositionBottom() {
    return this.position() === 'bottom';
  }

  protected isPositionRelative() {
    return this.position() === 'relative';
  }

  protected isPositionTop() {
    return this.position() === 'top';
  }

  /** Tone accent bar hugging the card's left edge — the card surface and text stay neutral. */
  protected barToneClass(type?: ALERTTYPE): string {
    return type === 'success'
      ? 'bg-success'
      : type === 'warning'
        ? 'bg-warning'
        : type === 'error'
          ? 'bg-error'
          : 'bg-info';
  }

  /** Tone lives on the icon and the left accent bar — the card surface and text stay neutral. */
  protected toneClass(type?: ALERTTYPE): string {
    return type === 'success'
      ? 'text-success'
      : type === 'warning'
        ? 'text-warning'
        : type === 'error'
          ? 'text-error'
          : 'text-info';
  }
}
```

## File: libs/uxcommon/src/components/icons/icons.index.ts

```typescript
/****************************************************** */
/*
/* Look at https://heroicons.com for icons. Most of these
/* are from the Heroicons set, some are custom.
/*
/****************************************************** */
export type PcIconNameType = keyof typeof icons;

export async function loadIconSvg(name: PcIconNameType): Promise<string> {
  let cached = _cache.get(name);
  if (!cached) {
    cached = resolveIconSvg(name);
    _cache.set(name, cached);
  }
  return cached;
}

async function resolveIconSvg(name: PcIconNameType): Promise<string> {
  const svg = await fetchSvg(icons[name]);
  if (svg != null) return svg;
  // Fall back to the generic unknown glyph — but only if it itself is a real SVG.
  if (name !== UNKNOWN) {
    const fallback = await loadIconSvg(UNKNOWN);
    if (fallback) return fallback;
  }
  // Nothing usable (e.g. the assets aren't being served): render nothing rather than
  // injecting a dev-server 404 page ("Cannot GET /assets/icons/unknown.svg") as markup.
  return '';
}

/** Fetch an icon and return its text only if it is actually an SVG, else null. */
async function fetchSvg(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const text = await r.text();
    return text.trimStart().startsWith('<svg') ? text : null;
  } catch {
    return null;
  }
}

const UNKNOWN: PcIconNameType = 'unknown';

/** Optional: load SVG text when you need to inline it (works with Tailwind/DaisyUI) */
const _cache = new Map<PcIconNameType, Promise<string>>();

export const icons = {
  none: 'none',
  'add-company': 'assets/icons/add-company.svg',
  'add-form': 'assets/icons/add-form.svg',
  'add-group': 'assets/icons/add-group.svg',
  'add-home': 'assets/icons/add-home.svg',
  'add-issue': 'assets/icons/add-issue.svg',
  'add-label': 'assets/icons/add-label.svg',
  'add-list': 'assets/icons/add-list.svg',
  'add-newsletter': 'assets/icons/add-newsletter.svg',
  'add-notes': 'assets/icons/add-notes.svg',
  'add-schedule': 'assets/icons/add-schedule.svg',
  'add-task': 'assets/icons/add-task.svg',
  'add-ticket': 'assets/icons/add-ticket.svg',
  'add-users': 'assets/icons/add-users.svg',
  'add-volunteer': 'assets/icons/add-volunteer.svg',
  'add-fundraising': 'assets/icons/add-fundraising.svg',
  'adjustments-horizontal': 'assets/icons/adjustments-horizontal.svg',
  'archive-box': 'assets/icons/archive-box.svg',
  'archive-box-arrow-down': 'assets/icons/archive-box-arrow-down.svg',
  'arrow-down-tray': 'assets/icons/arrow-down-tray.svg',
  'arrow-left': 'assets/icons/arrow-left.svg',
  'arrow-left-start-on-rectangle': 'assets/icons/arrow-left-start-on-rectangle.svg',
  'arrow-menu-open': 'assets/icons/arrow-menu-open.svg',
  'arrow-menu-close': 'assets/icons/arrow-menu-close.svg',
  'arrow-path': 'assets/icons/arrow-path.svg',
  'arrow-right-end-on-rectangle': 'assets/icons/arrow-right-end-on-rectangle.svg',
  'arrow-right-start-on-rectangle': 'assets/icons/arrow-right-start-on-rectangle.svg',
  'arrow-top-right-on-square': 'assets/icons/arrow-top-right-on-square.svg',
  'arrow-up-tray': 'assets/icons/arrow-up-tray.svg',
  'arrow-uturn-left': 'assets/icons/arrow-uturn-left.svg',
  'arrow-uturn-right': 'assets/icons/arrow-uturn-right.svg',
  'arrows-pointing-in': 'assets/icons/arrows-pointing-in.svg',
  'arrows-pointing-out': 'assets/icons/arrows-pointing-out.svg',
  'arrows-up-down-tray': 'assets/icons/arrows-up-down-tray.svg',
  'at-symbol': 'assets/icons/at-symbol.svg',
  'attach-fat': 'assets/icons/attach-fat.svg',
  'attach-file-off': 'assets/icons/attach-file-off.svg',
  banknotes: 'assets/icons/banknotes.svg',
  'bars-3': 'assets/icons/bars-3.svg',
  'bars-4': 'assets/icons/bars-4.svg',
  bell: 'assets/icons/bell.svg',
  bookmark: 'assets/icons/bookmark.svg',
  'bookmark-plus': 'assets/icons/bookmark-plus.svg',
  'bookmark-filled': 'assets/icons/bookmark-filled.svg',
  'bookmark-slash': 'assets/icons/bookmark-slash.svg',
  briefcase: 'assets/icons/briefcase.svg',
  calendar: 'assets/icons/calendar.svg',
  'chart-pie': 'assets/icons/chart-pie.svg',
  'check-circle': 'assets/icons/check-circle.svg',
  'chat-bubble-bottom-center-text': 'assets/icons/chat-bubble-bottom-center-text.svg',
  'chevron-double-left': 'assets/icons/chevron-double-left.svg',
  'chevron-double-right': 'assets/icons/chevron-double-right.svg',
  'chevron-down': 'assets/icons/chevron-down.svg',
  'chevron-left': 'assets/icons/chevron-left.svg',
  'chevron-right': 'assets/icons/chevron-right.svg',
  'chevron-up': 'assets/icons/chevron-up.svg',
  'clipboard-document-list': 'assets/icons/clipboard-document-list.svg',
  clock: 'assets/icons/clock.svg',
  'cloud-arrow-up': 'assets/icons/cloud-arrow-up.svg',
  cog: 'assets/icons/cog.svg',
  'cog-6-tooth': 'assets/icons/cog-6-tooth.svg',
  'collapse-content': 'assets/icons/collapse-content.svg',
  'credit-card': 'assets/icons/credit-card.svg',
  'currency-dollar': 'assets/icons/currency-dollar.svg',
  document: 'assets/icons/document.svg',
  'document-check': 'assets/icons/document-check.svg',
  'document-currency-dollar': 'assets/icons/document-currency-dollar.svg',
  'document-duplicate': 'assets/icons/document-duplicate.svg',
  'document-text': 'assets/icons/document-text.svg',
  'ellipsis-vertical': 'assets/icons/ellipsis-vertical.svg',
  envelope: 'assets/icons/envelope.svg',
  'exclamation-circle': 'assets/icons/exclamation-circle.svg',
  'exclamation-triangle': 'assets/icons/exclamation-triangle.svg',
  'expand-content': 'assets/icons/expand-content.svg',
  eye: 'assets/icons/eye.svg',
  'eye-slash': 'assets/icons/eye-slash.svg',
  facebook: 'assets/icons/facebook.svg',
  file: 'assets/icons/file.svg',
  'file-archive': 'assets/icons/file-archive.svg',
  'file-audio': 'assets/icons/file-audio.svg',
  'file-calendar': 'assets/icons/file-calendar.svg',
  'file-code': 'assets/icons/file-code.svg',
  'file-contact': 'assets/icons/file-contact.svg',
  'file-db': 'assets/icons/file-db.svg',
  'file-design': 'assets/icons/file-design.svg',
  'file-disk': 'assets/icons/file-disk.svg',
  'file-doc': 'assets/icons/file-doc.svg',
  'file-ebook': 'assets/icons/file-ebook.svg',
  'file-email': 'assets/icons/file-email.svg',
  'file-exe': 'assets/icons/file-exe.svg',
  'file-font': 'assets/icons/file-font.svg',
  'file-image': 'assets/icons/file-image.svg',
  'file-pdf': 'assets/icons/file-pdf.svg',
  'file-sheet': 'assets/icons/file-sheet.svg',
  'file-slides': 'assets/icons/file-slides.svg',
  'file-text': 'assets/icons/file-text.svg',
  'file-video': 'assets/icons/file-video.svg',
  filter: 'assets/icons/funnel.svg',
  forward: 'assets/icons/forward.svg',
  funnel: 'assets/icons/funnel.svg',
  'globe-americas': 'assets/icons/globe-americas.svg',
  hashtag: 'assets/icons/hashtag.svg',
  home: 'assets/icons/home.svg',
  'house-modern': 'assets/icons/house-modern.svg',
  identification: 'assets/icons/identification.svg',
  inbox: 'assets/icons/inbox.svg',
  'inbox-stack': 'assets/icons/inbox-stack.svg',
  'information-circle': 'assets/icons/information-circle.svg',
  instagram: 'assets/icons/instagram.svg',
  label: 'assets/icons/label.svg',
  linkedin: 'assets/icons/linkedin.svg',
  'lock-closed': 'assets/icons/lock-closed.svg',
  loading: 'assets/icons/loading.svg',
  'magnifying-glass': 'assets/icons/magnifying-glass.svg',
  mailbox: 'assets/icons/mailbox.svg',
  map: 'assets/icons/map.svg',
  'map-pin': 'assets/icons/map-pin.svg',
  megaphone: 'assets/icons/megaphone.svg',
  message: 'assets/icons/message.svg',
  'menu-open': 'assets/icons/menu-open.svg',
  merge: 'assets/icons/merge.svg',
  moon: 'assets/icons/moon.svg',
  notification: 'assets/icons/notification.svg',
  'paper-airplane': 'assets/icons/paper-airplane.svg',
  'paper-clip': 'assets/icons/paper-clip.svg',
  'pencil-square': 'assets/icons/pencil-square.svg',
  plus: 'assets/icons/plus.svg',
  'presentation-chart-line': 'assets/icons/presentation-chart-line.svg',
  print: 'assets/icons/print.svg',
  'queue-list': 'assets/icons/queue-list.svg',
  'rectangle-stack': 'assets/icons/rectangle-stack.svg',
  'redo-fat': 'assets/icons/redo-fat.svg',
  route: 'assets/icons/route.svg',
  reply: 'assets/icons/reply.svg',
  'reply-all': 'assets/icons/reply-all.svg',
  'restore-from-trash': 'assets/icons/restore-from-trash.svg',
  save: 'assets/icons/save.svg',
  'shield-exclamation': 'assets/icons/shield-exclamation.svg',
  'square-3-stack-3d': 'assets/icons/square-3-stack-3d.svg',
  star: 'assets/icons/star.svg',
  'star-filled': 'assets/icons/star-filled.svg',
  sun: 'assets/icons/sun.svg',
  'table-cells': 'assets/icons/table-cells.svg',
  phone: 'assets/icons/phone.svg',
  tag: 'assets/icons/tag.svg',
  task: 'assets/icons/task.svg',
  ticket: 'assets/icons/ticket.svg',
  trash: 'assets/icons/trash.svg',
  'trash-forever': 'assets/icons/trash-forever.svg',
  'undo-fat': 'assets/icons/undo-fat.svg',
  unknown: 'assets/icons/unknown.svg',
  'user-circle': 'assets/icons/user-circle.svg',
  'user-group': 'assets/icons/user-group.svg',
  'user-plus': 'assets/icons/user-plus.svg',
  users: 'assets/icons/users.svg',
  'view-column': 'assets/icons/view-column.svg',
  'view-kanban': 'assets/icons/view-kanban.svg',
  volunteer: 'assets/icons/volunteer.svg',
  'wrench-screwdriver': 'assets/icons/wrench-screwdriver.svg',
  'x-circle': 'assets/icons/x-circle.svg',
  x: 'assets/icons/x.svg',
  'x-mark': 'assets/icons/x-mark.svg',
} as const;
```

## File: libs/uxcommon/src/index.ts

```typescript
export * from './loading-gate';
export * from './request-guard';

// Components
export * from './components/alerts/alert-service';
export * from './components/alerts/alerts';
export * from './components/icons/icon';
export * from './components/icons/icons.index';
export * from './components/confirm-dialog-host';
export * from './components/confirm-dialog.service';
export * from './components/user-avatar/user-avatar';
export * from './components/tags/tagitem';
export * from './components/input/input';
export * from './components/textarea/textarea';
export * from './components/select/select';
export * from './components/toggle/toggle';
export * from './components/detail-header/detail-header';
export * from './components/detail-layout/detail-layout';
export * from './components/entity-overview/entity-overview';
export * from './components/address-form-group/address-form-group';
export * from './components/card/card';
export * from './components/stat-card/stat-card';
export * from './components/table/table';
export * from './components/side-drawer/side-drawer';
export * from './components/tabs/tabs';
export * from './components/status-badge/status-badge';
export * from './components/profile-card/profile-card';
export * from './components/detail-row/detail-row';
export * from './components/detail-item/detail-item';
export * from './components/system-metadata/system-metadata';
export * from './components/fields-selector/fields-selector';
export * from './components/public-link-panel/public-link-panel';
export * from './components/map/map';
export * from './components/map/map-types';
export * from './components/geocode-chip/geocode-chip';

// Directives
export * from './directives/animate-if.directive';
export * from './directives/spin-on-click.directive';

// Pipes
export * from './pipes/file-icon.pipe';
export * from './pipes/filesize.pipe';
export * from './pipes/sanitize-html.pipe';
export * from './pipes/svg-html-pipe';
export * from './pipes/timeago.pipe';
```

## File: libs/common/src/lib/auth.ts

```typescript
import { z } from 'zod';

export interface IAuthKeyPayload {
  name?: string;

  session_id: string;

  tenant_id: string;

  user_id: string;

  role?: string | null;

  source?: string;
}

export interface IAuthUser {
  email: string;

  first_name: string;

  last_name?: string;

  id: string;

  role?: string | null;

  avatar_url?: string | null;

  email_verified: boolean;

  passkey_setup_dismissed_at?: Date | null;

  tenant_deletion_scheduled_at?: Date | null;

  tenant_paused_at?: Date | null;

  /** Set while the tenant still has the seeded demo data (drives the demo-mode banner). */
  tenant_demo_mode_at?: Date | null;

  /** The tenant's public subdomain label — used to build public form URLs (`<slug>.<baseDomain>`). */
  tenant_slug?: string | null;
}

export interface IUserStatsSnapshot {
  emails_assigned: {
    total: number;
    open: number;
    closed: number;
  };
  contacts_added: {
    total: number;
    last_created_at: Date | null;
  };
  files_imported: {
    count: number;
    total_rows: number;
    last_activity_at: Date | null;
  };
  files_exported: {
    count: number;
    total_rows: number;
    last_activity_at: Date | null;
  };
}

export interface IAuthUserRecord extends IAuthUser {
  last_name: string;
  role: string | null;
  verified: boolean;
  two_factor_enabled: boolean;
  deletion_scheduled_at: Date | null;
  /** Admin deactivation: set = can't sign in until an admin/owner reactivates. */
  deactivated_at?: Date | null;
  /** Most recent session activity; null until the user has signed in at least once. */
  last_active_at?: Date | null;
  created_at: Date | null;
  updated_at: Date | null;
  previous_email?: string | null;
  previous_role?: string | null;
  avatar_url?: string | null;
  notification_preferences?: {
    mention_in_comment: boolean;
    mention_in_comment_in_app: boolean;
    task_assigned: boolean;
    task_assigned_in_app: boolean;
    task_due: boolean;
    task_due_in_app: boolean;
    person_assigned: boolean;
    person_assigned_in_app: boolean;
    export_ready: boolean;
    export_ready_in_app: boolean;
    import_summary: boolean;
    import_summary_in_app: boolean;
  };
}

export interface IAuthUserDetail extends IAuthUserRecord {
  stats: IUserStatsSnapshot;
}

export interface IToken {
  auth_token: string | null;
  refresh_token: string | null;
}

/**
 * The one generic message shown for any failed sign-in attempt, regardless of
 * whether the email or the password was wrong — never reveal which, so that
 * sign-in cannot be used to probe which emails have accounts. Shared by the
 * backend error formatter and the frontend so the copy never drifts.
 */
export const GENERIC_SIGNIN_ERROR = 'Please check your email and password and try again.';

/**
 * Product names for the stored role values — the working role 'user' is shown as
 * "Editor" everywhere (Users list, user page, Profile). Shared so the label never drifts.
 */
export const AUTH_ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  user: 'Editor',
  viewer: 'Viewer',
};

export function authRoleLabel(role: string | null | undefined): string {
  return role ? (AUTH_ROLE_LABELS[role] ?? role) : '—';
}

export type signInInputType = z.infer<typeof signInInputObj>;

export type signUpInputType = z.infer<typeof signUpInputObj>;

export const signInInputObj = z.object({
  email: z.email(),
  password: z.string().min(8).max(72),
  rememberMe: z.boolean().optional(),
});

export const signUpInputObj = z.object({
  organization: z.string(),
  email: z.string().max(100),
  password: z.string().min(8).max(72),
  first_name: z.string().max(100),
});
```

## File: libs/uxcommon/src/components/detail-header/detail-header.ts

```typescript
import { Component, DestroyRef, computed, effect, inject, input, output } from '@angular/core';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';

import { PcBreadcrumb } from '../breadcrumbs/breadcrumbs';
import { BreadcrumbsService } from '../breadcrumbs/breadcrumbs.service';
import { FormActions } from '../form-actions/form-actions';

@Component({
  selector: 'pc-detail-header',
  imports: [Icon, FormActions],
  template: `
    <div class="flex flex-col gap-2 rounded-xl border border-base-200 bg-base-100 p-5 shadow-sm">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 items-center gap-3">
          @if (avatarText()) {
            <span
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
              aria-hidden="true"
              >{{ avatarText() }}</span
            >
          } @else if (icon()) {
            <pc-icon [name]="icon()!" class="text-primary" [size]="iconSize()"></pc-icon>
          }
          <div class="min-w-0">
            @if (eyebrow()) {
              <p class="pc-eyebrow">{{ eyebrow() }}</p>
            }
            <div class="flex min-w-0 items-center gap-2">
              <h1 class="truncate text-xl font-bold">{{ title() }}</h1>
              @if (statusChip()) {
                <span
                  class="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success whitespace-nowrap"
                  >{{ statusChip() }}</span
                >
              }
              <!-- Tone-colored badges the fixed success statusChip can't express (e.g. pc-status-badge) -->
              <ng-content select="[pc-title-suffix]"></ng-content>
            </div>
            @if (dirtyFieldCount() > 0) {
              <p class="mt-0.5 flex items-center gap-1.5 text-sm text-warning">
                <span class="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true"></span>
                Unsaved changes · {{ dirtyFieldCount() }} field{{ dirtyFieldCount() === 1 ? '' : 's' }}
              </p>
            } @else if (subtitle()) {
              <p class="mt-0.5 text-sm text-base-content/60">{{ subtitle() }}</p>
            }
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- "N of M filtered" walk-the-list pager — lives in the header card (design source),
               so J/K navigation is visible next to the actions. Self-hides with no grid context. -->
          @if (positionLabel()) {
            <div class="mr-1 flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                class="btn btn-circle btn-ghost btn-xs"
                [attr.aria-label]="prevLabel()"
                [disabled]="!hasPrev()"
                [class.btn-ghost]="!hasPrev()"
                (click)="prevRecord.emit()"
              >
                <pc-icon name="chevron-left" [size]="4"></pc-icon>
              </button>
              <span class="whitespace-nowrap px-1 text-xs tabular-nums text-base-content/50">{{
                positionLabel()
              }}</span>
              <button
                type="button"
                class="btn btn-circle btn-xs"
                [attr.aria-label]="nextLabel()"
                [disabled]="!hasNext()"
                [class.btn-ghost]="!hasNext()"
                (click)="nextRecord.emit()"
              >
                <pc-icon name="chevron-right" [size]="4"></pc-icon>
              </button>
            </div>
          }
          <ng-content select="[pc-actions-prefix]"></ng-content>
          @if (showActions()) {
            <pc-form-actions
              size="sm"
              [isLoading]="isLoading()"
              [signalForm]="form()"
              [disabled]="disabled()"
              [saveAlwaysEnabled]="saveAlwaysEnabled()"
              [buttonsToShow]="formActionsButtons()"
              [btn1Text]="btn1Text()"
              [btn1Icon]="btn1Icon()"
              [showDelete]="false"
              [showCancel]="showCancel()"
              (btn1Clicked)="save.emit($event)"
            ></pc-form-actions>
          }
          <ng-content select="[pc-actions-suffix]"></ng-content>
          @if (showDelete()) {
            <div class="dropdown dropdown-end">
              <button type="button" tabindex="0" class="btn btn-circle btn-ghost btn-sm" aria-label="More actions">
                <pc-icon name="ellipsis-vertical" [size]="5"></pc-icon>
              </button>
              <ul
                tabindex="0"
                class="menu dropdown-content z-30 w-56 rounded-box border border-base-200 bg-base-100 p-2 shadow-lg"
              >
                <!-- Page-supplied overflow items (e.g. Export vCard, Merge…) render above Delete (§3) -->
                <ng-content select="[pc-overflow-extra]"></ng-content>
                <li>
                  <button type="button" class="text-error" [disabled]="isLoading()" (click)="delete.emit()">
                    <pc-icon name="trash" [size]="4"></pc-icon>
                    {{ deleteText() }}
                  </button>
                </li>
              </ul>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class DetailHeader {
  private readonly breadcrumbs = inject(BreadcrumbsService);

  public readonly delete = output<void>();
  public readonly save = output<any>();
  public readonly prevRecord = output<void>();
  public readonly nextRecord = output<void>();

  public btn1Icon = input<PcIconNameType>('save');
  public btn1Text = input<string>('Save');
  public buttonsToShow = input<'two' | 'three'>('three');
  public crumbs = input<PcBreadcrumb[]>([]);
  public deleteText = input<string>('Delete');
  public disabled = input<boolean>(false);
  /** §4: keep the primary button enabled regardless of validity/dirtiness. */
  public saveAlwaysEnabled = input<boolean>(false);
  public eyebrow = input<string>('');
  /** Optional success-tinted status chip beside the title, e.g. "Monthly donor" (§3). */
  public statusChip = input<string | null>(null);
  public form = input<any>();
  public icon = input<PcIconNameType | null | undefined>();
  public iconSize = input<number>(5);
  /** Optional initials shown in a circular avatar left of the title (e.g. "JB"). Takes precedence over icon(). */
  public avatarText = input<string | null>(null);
  public isLoading = input.required<boolean>();
  public showActions = input<boolean>(true);
  public showDelete = input<boolean>(false);
  /** Forwarded to form-actions. Defaults on for edit forms (used directly);
   * detail-layout overrides it to false for read views. */
  public showCancel = input<boolean>(true);
  public subtitle = input<string | null | undefined>();
  public title = input.required<string>();

  /** Optional "N of M filtered" pager, rendered inline with the breadcrumb trail. */
  public positionLabel = input<string | null>(null);
  public hasPrev = input<boolean>(false);
  public hasNext = input<boolean>(false);
  public prevLabel = input<string>('Previous record');
  public nextLabel = input<string>('Next record');

  /** When > 0, replaces the subtitle with an amber "Unsaved changes · N fields" line. */
  public dirtyFieldCount = input<number>(0);

  // Delete moved to the overflow menu. Suppressing the third button whenever
  // Delete is offered preserves the layout form-actions previously produced
  // when it rendered the Delete button inline.
  protected readonly formActionsButtons = computed<'two' | 'three'>(() =>
    this.showDelete() ? 'two' : this.buttonsToShow(),
  );

  constructor() {
    // The breadcrumb trail renders in the navbar; the record pager now lives in
    // this header card (design source), so publish the trail only and leave the
    // navbar pager empty to avoid a duplicate. Clear on destroy so the strip
    // empties when navigating to a page (e.g. a grid) that owns no trail.
    effect(() => {
      this.breadcrumbs.set({
        crumbs: this.crumbs(),
        positionLabel: null,
        hasPrev: false,
        hasNext: false,
        prevLabel: this.prevLabel(),
        nextLabel: this.nextLabel(),
        onPrev: () => this.prevRecord.emit(),
        onNext: () => this.nextRecord.emit(),
      });
    });

    inject(DestroyRef).onDestroy(() => this.breadcrumbs.clear());
  }
}
```

## File: libs/uxcommon/src/components/confirm-dialog-host.ts

```typescript
import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Icon } from '@uxcommon/components/icons/icon';
import { ConfirmDialogService, DialogVariant } from './confirm-dialog.service';

@Component({
  selector: 'pc-dialog-host',
  imports: [Icon],
  templateUrl: './confirm-dialog-host.html',
})
export class ConfirmDialogHost {
  private readonly svc = inject(ConfirmDialogService);

  public readonly promptValue = signal(''); // bound via [value] + (input) in the template

  private readonly stateSignal = this.svc.stateSignal;
  private readonly openSignal = this.svc.isOpenSignal;
  public state = this.stateSignal;
  // §7.4: destructive dialogs style the SAFE action as primary. Danger variants
  // default to emphasizing the cancel/keep button unless a caller opts out, and
  // only when a cancel button is actually shown.
  public readonly effectiveEmphasizeCancel = computed(() => {
    const st = this.state();
    if (!st) return false;
    const explicit = st.emphasizeCancel;
    const wants = explicit ?? st.variant === 'danger';
    return wants && this.showCancel();
  });
  public confirmBtnClass = computed(() => {
    const v = (this.state()?.variant ?? 'neutral') as DialogVariant;
    if (this.effectiveEmphasizeCancel()) {
      switch (v) {
        case 'danger':
          return 'btn-ghost text-error';
        case 'warning':
          return 'btn-ghost text-warning';
        case 'info':
          return 'btn-ghost text-info';
        case 'success':
          return 'btn-ghost text-success';
        default:
          return 'btn-ghost';
      }
    }
    // UX-GUIDELINES §4b: destructive/archive confirms wear the outline role classes;
    // affirmative confirms (info/success/neutral) are the surface's main action.
    switch (v) {
      case 'danger':
        return 'btn-outline btn-error';
      case 'warning':
        return 'btn-outline btn-warning';
      case 'info':
      case 'success':
      default:
        return 'btn-primary';
    }
  });

  // Mirror the confirm side: whenever the destructive/confirm action is de-emphasized
  // (danger variants by default, or any explicit emphasizeCancel), style the safe
  // cancel/keep action as the primary default so there is always a clear safe default (§7.4).
  // Default cancel wears the house cancel style (UX-GUIDELINES "Buttons"): outline accent.
  public cancelBtnClass = computed(() => (this.effectiveEmphasizeCancel() ? 'btn-primary' : 'btn-outline btn-accent'));

  public choiceBtnClass(v?: DialogVariant): string {
    if (!v) return '';
    switch (v) {
      case 'danger':
        return 'btn-outline btn-error';
      case 'warning':
        return 'btn-outline btn-warning';
      case 'info':
      case 'success':
        return 'btn-primary';
      default:
        return '';
    }
  }

  public readonly dlgRef = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  public icon = computed(() => this.state()?.icon ?? this.svc.defaultIconFor('neutral'));
  public showCancel = computed(() => {
    const st = this.state();
    if (!st) return false;
    if (st.type === 'choose') {
      return !!st.cancelText;
    }
    return !!st.cancelText && st.type !== 'alert';
  });

  constructor() {
    effect(() => {
      const open = this.openSignal();
      const dlg = this.dlgRef()?.nativeElement;
      if (!dlg) return;

      if (open) {
        this.promptValue.set(this.stateSignal()?.defaultValue ?? '');
        if (!dlg.open) {
          try {
            dlg.showModal();
          } catch {}
        }
      } else if (dlg.open) {
        try {
          dlg.close();
        } catch {}
      }
    });
  }

  public onPromptInput(event: Event): void {
    this.promptValue.set((event.target as HTMLInputElement).value);
  }

  public onBackdrop(): void {
    const st = this.state();
    if (st?.allowBackdropClose) this.svc.cancel();
  }

  public onCancel(): void {
    this.svc.cancel();
  }

  public onConfirm(): void {
    const st = this.state();
    if (!st) return;
    if (st.type === 'prompt') this.svc.ok(this.promptValue());
    else if (st.type === 'alert') this.svc.ok();
    else this.svc.ok(true);
  }

  public onChoice(value: unknown): void {
    this.svc.ok(value);
  }
}
```

## File: libs/common/src/index.ts

```typescript
export type {
  IAuthKeyPayload,
  IAuthUser,
  IAuthUserDetail,
  IAuthUserRecord,
  IUserStatsSnapshot,
  IToken,
  signInInputType,
  signUpInputType,
} from './lib/auth';

export { AUTH_ROLE_LABELS, GENERIC_SIGNIN_ERROR, authRoleLabel, signInInputObj, signUpInputObj } from './lib/auth';

export type {
  INow,
  AddTagType,
  AddListType,
  AddMarketingEmailType,
  AddTaskType,
  AddTeamType,
  AddCampaignType,
  UpdateCampaignType,
  UpsertCampaignPersonFactType,
  SetCampaignSubscriptionType,
  CarryOverCampaignType,
  InviteAuthUserType,
  Verify2FAType,
  PERSONINHOUSEHOLDTYPE,
  PersonsType,
  MarketingEmailType,
  MarketingEmailTopLinkType,
  NewsletterReportType,
  NewsletterReportBounceType,
  NewsletterReportEngagedType,
  NewsletterReportLinkType,
  NewsletterReportPreviousSendType,
  CreateClickersListResultType,
  TasksType,
  ListsType,
  SettingsType,
  SettingsEntryType,
  UpsertSettingsInputType,
  SortModelType,
  UpdateHouseholdsType,
  UpdatePersonsType,
  UpdateTagType,
  UpdateListType,
  UpdateTeamType,
  UpdateAuthUserType,
  ProfilePreferencesType,
  UpdateMarketingEmailType,
  UpdateTaskType,
  getAllOptionsType,
  ExportCsvInputType,
  ExportCsvResponseType,
  QueueExportInputType,
  LogInstantExportInputType,
  DataExportRecordType,
  ImportListItem,
  AddVolunteerEventType,
  VolunteerEventsType,
  UpdateVolunteerEventType,
  AddVolunteerShiftType,
  VolunteerShiftsType,
  UpdateVolunteerShiftType,
  AddWebFormType,
  UpdateWebFormType,
  WebFormsType,
  CreateFormType,
  UpdateFormType,
  FormSubmissionType,
  QueryBuilderRuleNode,
  QueryBuilderGroupNode,
  QueryBuilderNode,
  WorkflowsType,
  AddWorkflowType,
  UpdateWorkflowType,
  WorkflowStepsType,
  AddWorkflowStepType,
  UpdateWorkflowStepType,
  WorkflowEnrollmentsType,
  AddEventType,
  EventType,
  UpdateEventType,
  AddTicketTypeType,
  TicketTypeType,
  UpdateTicketTypeType,
  AddRegistrationType,
  RegistrationType,
  UpdateRegistrationType,
  AddConnectionType,
  AddTurfType,
  UpdateTurfType,
  CutTurfsType,
  AssignTurfType,
  FieldReportRangeType,
  LogKnockType,
} from './lib/models';

export {
  cloneQueryBuilderNode,
  AddTagObj,
  AddListObj,
  AddMarketingEmailObj,
  AddTaskObj,
  TASK_STATUSES,
  TASK_BOARD_STATUSES,
  TASK_OPEN_STATUSES,
  TASK_STATUS_LABELS,
  isTaskStatus,
  isTaskBoardStatus,
  AddTeamObj,
  AddCampaignObj,
  UpdateCampaignObj,
  UpsertCampaignPersonFactObj,
  SetCampaignSubscriptionObj,
  CarryOverCampaignObj,
  SUBSCRIPTION_STATUSES,
  CONSENT_SOURCES,
  CAMPAIGN_KINDS,
  CAMPAIGN_STATUSES,
  SUPPORT_LEVELS,
  SUPPORT_LEVEL_LABELS,
  VOTING_STATUSES,
  VOTING_STATUS_LABELS,
  FACT_SOURCES,
  DNC_CHANNELS,
  InviteAuthUserObj,
  Verify2FAObj,
  PersonsObj,
  MarketingEmailObj,
  marketingEmailTopLinkObj,
  TasksObj,
  ListsObj,
  SettingsObj,
  SettingsEntryObj,
  UpsertSettingsInputObj,
  UpdateHouseholdsObj,
  UpdatePersonsObj,
  UpdateTagObj,
  UpdateListObj,
  UpdateTeamObj,
  UpdateAuthUserObj,
  NotificationPreferencesObj,
  ProfilePreferencesObj,
  UpdateMarketingEmailObj,
  UpdateTaskObj,
  sortModelItem,
  getAllOptions,
  exportCsvInput,
  exportCsvResponse,
  queueExportInput,
  logInstantExportInput,
  dataExportRecord,
  ImportListItemObj,
  dbIdSchema,
  uuidSchema,
  addressSchema,
  idSchema,
  folderIdSchema,
  regularFolderIdSchema,
  nameSchema,
  descriptionSchema,
  emailSchema,
  phoneSchema,
  notesSchema,
  AddVolunteerEventObj,
  VolunteerEventsObj,
  UpdateVolunteerEventObj,
  AddVolunteerShiftObj,
  VolunteerShiftsObj,
  UpdateVolunteerShiftObj,
  AddWebFormObj,
  UpdateWebFormObj,
  WebFormsObj,
  CreateFormObj,
  UpdateFormObj,
  FormSubmissionObj,
  FormFieldObj,
  FormTypeEnum,
  FORM_TYPES,
  FORM_STATUSES,
  FORM_TEMPLATES,
  FORM_STANDARD_CATALOG,
  FORM_EMAIL_FIELD,
  normForm,
  fieldsForTemplate,
  WorkflowObj,
  AddWorkflowObj,
  UpdateWorkflowObj,
  WorkflowStepObj,
  AddWorkflowStepObj,
  UpdateWorkflowStepObj,
  WorkflowEnrollmentObj,
  WorkflowRunObj,
  WorkflowStepConfigObj,
  WORKFLOW_TRIGGER_TYPES,
  WORKFLOW_STEP_KINDS,
  CompanyInputObj,
  CompanyEnrichmentObj,
  AddEventObj,
  EventObj,
  UpdateEventObj,
  AddTicketTypeObj,
  TicketTypeObj,
  UpdateTicketTypeObj,
  AddRegistrationObj,
  RegistrationObj,
  UpdateRegistrationObj,
  AddConnectionObj,
  RELATION_TYPES,
  RELATION_TYPE_LABELS,
  relationTypeSchema,
  AddTurfObj,
  UpdateTurfObj,
  CutTurfsObj,
  AssignTurfObj,
  FieldReportRangeObj,
  LogKnockObj,
  TURF_STATUSES,
  KNOCK_OUTCOMES,
  KNOCK_RESPONSES,
  KNOCK_RESPONSE_LABELS,
  DOORS_PER_TURF_PRESETS,
  turfStatusSchema,
  knockOutcomeSchema,
  knockResponseSchema,
  isTurfStatus,
  isKnockOutcome,
  CompanionSurveyObj,
  CompanionPersonResultObj,
  CompanionDoorOutcomeObj,
  CompanionClearOutcomeObj,
  CompanionPersonCreateObj,
  CompanionOpObj,
  CompanionResultsObj,
  UpdateCompanionSettingsObj,
  AddDeliveryRequestObj,
  UpdateDeliveryRequestObj,
  SetDeliveryRequestStatusObj,
  PlanDeliveriesObj,
  CommitDeliveriesObj,
  UpdateDeliveryRouteObj,
  AssignVolunteerObj,
  SetDeliveryRouteStatusObj,
  ReorderStopObj,
  StopActionObj,
  RouteIdObj,
  MintShareLinkObj,
  PublicStopActionObj,
  GetSignStatusObj,
  DELIVERY_REQUEST_STATUSES,
  DELIVERY_REQUEST_STATUS_LABELS,
  DELIVERY_ROUTE_STATUSES,
  DELIVERY_STOP_STATUSES,
  DELIVERY_SOURCES,
  DELIVERY_SKIP_REASONS,
  DONATION_METHODS,
  DONATION_METHOD_LABELS,
  donationMethodSchema,
  RecordDonationObj,
  INTERACTION_TYPES,
  INTERACTION_TYPE_LABELS,
  interactionTypeSchema,
  LogInteractionObj,
  CompanionAccessQueryObj,
  CompanionVerifyStartObj,
  CompanionVerifyConfirmObj,
  COMPANION_LINK_KINDS,
  COMPANION_VERIFY_CHANNELS,
  COMPANION_VOLUNTEER_STATUSES,
  COMPANION_ACCESS_STATES,
} from './lib/schema';

export type {
  CompanionLinkKind,
  CompanionVerifyChannel,
  CompanionVolunteerStatus,
  CompanionAccessState,
  CompanionContact,
  CompanionAccessPayload,
  CompanionVerifyConfirmResult,
  CompanionVolunteerRow,
} from './lib/schemas/companion-access.schema';

export type {
  CampaignKind,
  CampaignStatus,
  SupportLevel,
  VotingStatus,
  FactSource,
  SubscriptionStatus,
  ConsentSource,
} from './lib/schemas/campaigns.schema';
export type { DncChannel } from './lib/schemas/persons.schema';

export type { InteractionType, LogInteractionType } from './lib/schemas/activity.schema';

export type { DonationMethod, RecordDonationType } from './lib/schemas/donations.schema';

export type { FormType, FormStatus, FormField } from './lib/schemas/web-forms.schema';
export type { TaskStatus, TaskBoardStatus } from './lib/schemas/tasks.schema';
export type {
  WorkflowTriggerType,
  WorkflowStepKind,
  WorkflowStepConfigType,
  WorkflowRunType,
} from './lib/schemas/workflows.schema';
export type {
  TurfStatus,
  KnockOutcome,
  KnockResponse,
  CompanionSurveyType,
  CompanionOpType,
  CompanionResultsType,
  CompanionOpAck,
  CompanionSurveyPrefill,
  CompanionPersonResult,
  CompanionPerson,
  CompanionDoorOutcome,
  CompanionHousehold,
  CompanionTurfPayload,
  UpdateCompanionSettingsType,
} from './lib/schemas/canvassing.schema';
export type {
  AddDeliveryRequestType,
  UpdateDeliveryRequestType,
  SetDeliveryRequestStatusType,
  PlanDeliveriesType,
  CommitDeliveriesType,
  UpdateDeliveryRouteType,
  AssignVolunteerType,
  SetDeliveryRouteStatusType,
  ReorderStopType,
  StopActionType,
  MintShareLinkType,
  PublicStopActionType,
  GetSignStatusType,
  DeliveryRequestStatus,
  DeliveryRouteStatus,
  DeliveryStopStatus,
  DeliverySource,
  DeliverySkipReason,
} from './lib/schemas/deliveries.schema';

export { debounce, escapeHtml, sleep, slugifyHandle, slugifyRecordName, RESERVED_SUBDOMAINS } from './lib/utils';
export {
  CROCKFORD_ALPHABET,
  PUBLIC_ID_LENGTH,
  encodeCrockford,
  normalizeCrockford,
  extractPublicIdFromSlug,
  buildPersonSlug,
} from './lib/public-id';
export { calculateWorkingTimeMs } from './lib/sla';

export { SPECIAL_FOLDERS, EMAIL_FOLDERS } from './lib/emails';

export type { EmailStatus, EmailFolderConfig } from './lib/emails';

export { jsend, JSendFail as JSendFailError, JSendError as JSendServerError, httpStatusForJSend } from './lib/jsend';

export type {
  JSend,
  JSendSuccessInterface as JSendSuccess,
  JSendFailInterface as JSendFail,
  JSendStatus,
  JSendErrorInterface as JSendError,
} from './lib/jsend';
```

## File: libs/common/src/lib/kysely.models.ts

```typescript
// tsco:ignore
/* eslint-disable @typescript-eslint/no-explicit-any */
//
// ====================================================================
// When adding a new table, you have to  :-
// 1. Add a model and add it to the interface Models

// ====================================================================
import type {
  ColumnType,
  Insertable,
  OperandValueExpressionOrList,
  SelectExpression,
  Selectable,
  Updateable,
} from 'kysely';
import type { EmailStatus } from './emails';
import type { z } from 'zod';
import type { addressSchema } from './schema';

export type Keys<T> = keyof T;
type Json = ColumnType<JsonValue, string, string>;
type JsonArray = JsonValue[];
type JsonObject = { [K in string]?: JsonValue };
type JsonPrimitive = boolean | number | string | null;
type JsonValue = JsonArray | JsonObject | JsonPrimitive;
type Timestamp = ColumnType<Date, Date | string, Date | string>;
type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U> ? ColumnType<S, I | undefined, U> : ColumnType<T, T | undefined, T>;

export interface Models {
  authusers: AuthUsers;
  campaign_person_facts: CampaignPersonFacts;
  campaign_subscriptions: CampaignSubscriptions;
  campaigns: Campaigns;
  email_suppressions: EmailSuppressions;
  households: Households;
  map_campaigns_users: MapCampaignsUsers;
  map_households_tags: MapHouseholdsTags;
  map_peoples_tags: MapPeoplesTags;
  map_roles_users: MapRolesUsers;
  lists: Lists;
  map_lists_persons: MapListsPersons;
  map_lists_households: MapListsHouseholds;
  teams: Teams;
  map_teams_persons: MapTeamsPersons;
  map_teams_lists: MapTeamsLists;
  map_newsletters_lists: MapNewslettersLists;
  map_web_forms_lists: MapWebFormsLists;
  tasks: Tasks;
  persons: Persons;
  profiles: Profiles;
  roles: Roles;
  sessions: Sessions;
  tags: Tags;
  tenants: Tenants;
  settings: Settings;
  donations: Donations;
  donation_periods: DonationPeriods;
  donation_pledges: DonationPledges;
  emails: Emails;
  newsletters: Newsletters;
  newsletter_events: NewsletterEvents;
  person_newsletter_engagements: PersonNewsletterEngagements;
  email_comments: EmailComments;
  email_bodies: EmailBodies;
  email_headers: EmailHeaders;
  email_recipients: EmailRecipients;
  email_attachments: EmailAttachments;
  email_drafts: EmailDrafts;
  email_trash: EmailTrash;
  email_read_states: EmailReadStates;
  task_comments: TaskComments;
  task_subtasks: TaskSubtasks;
  task_attachments: TaskAttachments;
  user_activity: UserActivity;
  ms_oauth_tokens: MsOauthTokens;
  google_oauth_tokens: GoogleOauthTokens;
  data_imports: DataImports;
  companies: Companies;
  files: Files;
  notifications: Notifications;
  volunteer_events: VolunteerEvents;
  volunteer_shifts: VolunteerShifts;
  events: Events;
  event_ticket_types: EventTicketTypes;
  event_registrations: EventRegistrations;
  web_forms: WebForms;
  form_submissions: FormSubmissions;
  background_jobs: BackgroundJobs;
  webhook_events: WebhookEvents;
  data_exports: DataExports;
  potential_duplicates: PotentialDuplicates;
  dismissed_duplicate_groups: DismissedDuplicateGroups;
  workflows: Workflows;
  workflow_steps: WorkflowSteps;
  workflow_enrollments: WorkflowEnrollments;
  workflow_runs: WorkflowRuns;
  person_connections: PersonConnections;
  passkeys: Passkeys;
  zapier_subscriptions: ZapierSubscriptions;
  turfs: Turfs;
  turf_households: TurfHouseholds;
  turf_assignments: TurfAssignments;
  turf_knocks: TurfKnocks;
  delivery_requests: DeliveryRequests;
  delivery_routes: DeliveryRoutes;
  delivery_route_stops: DeliveryRouteStops;
  companion_volunteers: CompanionVolunteers;
  companion_sessions: CompanionSessions;
  companion_ops: CompanionOps;
}

export type AuthUsersType = Omit<AuthUsers, 'id'> & { id: string };

export type GetOperandType<
  T extends Keys<TablesOperationMap>,
  Op extends Keys<TablesOperationMap[T]>,
  Key extends Keys<TablesOperationMap[T][Op]>,
> = unknown extends TablesOperationMap[T][Op][Key]
  ? never
  : TablesOperationMap[T][Op][Key] extends never
    ? never
    : TablesOperationMap[T][Op][Key];

export type OperationDataType<
  T extends Keys<Models>,
  Op extends 'select' | 'update' | 'insert',
> = TablesOperationMap[T][Op];

export type TypeId<T extends keyof Models> = string & { _table?: T };
export type TypeTenantId<T extends keyof Models> = string & { _table?: T };

type ExtractTableAlias<DB, TE> = TE extends `${string} as ${infer TA}`
  ? TA extends keyof DB
    ? TA
    : never
  : TE extends keyof DB
    ? TE
    : never;

export type TypeColumn<T extends keyof Models, U> = OperandValueExpressionOrList<
  Models,
  ExtractTableAlias<Models, T>,
  U
>;
export type TypeTableColumns<T extends keyof Models> = T extends keyof Models
  ? SelectExpression<Models, ExtractTableAlias<Models, T>>
  : never;

export type TablesOperationMap = {
  [K in Keys<Models>]: {
    select: Selectable<Models[K]>;
    insert: Insertable<Models[K]> & { tenant_id: string };
    update: Updateable<Models[K]>;
  };
};

export type TypeColumnValue<TTable extends keyof Models, TColumn extends keyof Models[TTable]> = UnwrapSelect<
  Models[TTable][TColumn]
>;

/*
type TableType = {
  [K in Keys<Models>]: K;
};
*/

// ====================================================================
// The following are the type definitions for the database schema
// Since I use a base controller to handle the CRUD operations, I don't
// know the exact type of the table until runtime. So I use the following
// type definitions to help me out.
// ====================================================================
interface RecordType {
  id: Generated<string>;
  tenant_id: string;
  createdby_id: string;
  updatedby_id: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}
interface JunctionRecordType {
  tenant_id: string;
  createdby_id: string;
  updatedby_id: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}
export type AddressType = z.infer<typeof addressSchema>;

interface AuthUsers extends RecordType {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_reset_code: string | null;
  // TODO: move to Sessions
  password_reset_code_created_at: Timestamp | null;
  role: string | null;
  verified: boolean;
  two_factor_enabled: boolean;
  two_factor_code: string | null;
  two_factor_expires_at: Timestamp | null;
  two_factor_attempts: Generated<number>;
  deletion_scheduled_at: Timestamp | null;
  /** Admin deactivation: set = can't sign in until an admin/owner reactivates. NULL = active. */
  deactivated_at: Timestamp | null;
  previous_email: string | null;
  previous_role: string | null;
  passkey_setup_dismissed_at: Timestamp | null;
}

/** Per-campaign email CONSENT (§15). Address health lives in EmailSuppressions; DNC on Persons. */
interface CampaignSubscriptions extends RecordType {
  campaign_id: string;
  person_id: string;
  email: string;
  /** 'subscribed' | 'pending' (double opt-in) | 'unsubscribed'. Sendable = subscribed. */
  status: Generated<string>;
  /** 'form' (express) | 'import' | 'manual' (implied) | 'copied' (carry-over). */
  consent_source: Generated<string>;
  consent_at: Timestamp | null;
  unsubscribed_at: Timestamp | null;
}

/** Global per-address suppression (§15): a hard bounce / spam complaint kills the address everywhere. */
interface EmailSuppressions {
  id: Generated<string>;
  tenant_id: string;
  email: string;
  reason: string;
  occurred_at: Generated<Timestamp>;
  created_at: Generated<Timestamp>;
}

/** Campaign-scoped person facts (§15): support level + voting status. No row / NULL = Unknown. */
interface CampaignPersonFacts extends RecordType {
  campaign_id: string;
  person_id: string;
  support_level: string | null;
  support_source: string | null;
  support_recorded_by: string | null;
  support_recorded_at: Timestamp | null;
  voting_status: string | null;
  voting_source: string | null;
  voting_recorded_by: string | null;
  voting_recorded_at: Timestamp | null;
}

interface Campaigns extends Omit<RecordType, 'createdby_id'> {
  admin_id: string;
  createdby_id: string;
  description: string | null;
  startdate: string | null;
  enddate: string | null;
  name: string;
  notes: string | null;
  /** 'office' = the permanent constituency-office context; 'election' = a time-bounded run. */
  kind: Generated<string>;
  /** 'active' | 'archived' — archived campaigns are read-only history. */
  status: Generated<string>;
  /** Issue-chip vocabulary shown in the canvass companion survey (spec §3.5). */
  canvass_issues: Generated<string[]>;
  /** Door script shown (collapsible) at the top of the companion survey. */
  canvass_script: string | null;
}

export interface Households extends Omit<RecordType, 'createdby_id'>, AddressType {
  /** Provenance only ("first captured in") — households are tenant-wide, never campaign-scoped. */
  campaign_id: string | null;
  createdby_id: string;
  file_id: string | null;
  home_phone: string | null;
  notes: string | null;
  address_fp_street: string | null;
  address_fp_full: string | null;
  is_placeholder?: boolean;
  district: string | null;
  precinct: string | null;
  ward: string | null;
  geocoding_status: string | null;
  /** URL slug, unique per tenant (spec §1). Generated app-side — see lib/slug.ts. */
  slug: string | null;
}

interface MapCampaignsUsers extends Omit<JunctionRecordType, 'createdby_id' | 'updatedby_id'> {
  campaign_id: string;
  user_id: string;
}

interface MapHouseholdsTags extends JunctionRecordType {
  household_id: string;
  tag_id: string;
}

export interface MapPeoplesTags extends JunctionRecordType {
  person_id: string;
  tag_id: string;
  deletable: Generated<boolean>;
}

interface MapRolesUsers extends JunctionRecordType {
  role_id: string;
  user_id: string;
}

interface Teams extends RecordType {
  name: string;
  description: string | null;
  team_captain_id: string | null;
  team_lead_user_id: string | null;
}

interface MapTeamsPersons extends JunctionRecordType {
  team_id: string;
  person_id: string;
}

// Deliveries (spec §14). "routed" is intentionally NOT a column on delivery_requests — it is
// derived from an active (pending) delivery_route_stops row (one source of truth).
export interface DeliveryRequests extends RecordType {
  /** The context this record belongs to (Campaigns §15); backfilled to the office. */
  campaign_id: string;

  household_id: string;
  person_id: string | null;
  web_form_id: string | null;
  source: Generated<'web_form' | 'manual'>;
  status: Generated<'new' | 'approved' | 'declined' | 'delivered'>;
  notes: string | null;
  skip_reason: string | null;
}

export interface DeliveryRoutes extends RecordType {
  /** The context this record belongs to (Campaigns §15); backfilled to the office. */
  campaign_id: string;

  name: string;
  status: Generated<'draft' | 'assigned' | 'in_progress' | 'completed' | 'canceled'>;
  volunteer_person_id: string | null;
  start_address: string;
  start_lat: number;
  start_lng: number;
  est_minutes: Generated<number>;
  est_km: Generated<number>;
  scheduled_for: Timestamp | null;
  // Only the sha256 hash of the raw capability token is ever stored; the raw token is returned once.
  share_token_hash: string | null;
  share_token_expires_at: Timestamp | null;
  params: Generated<Json>;
}

export interface DeliveryRouteStops extends RecordType {
  route_id: string;
  request_id: string;
  seq: number;
  leg_minutes: Generated<number>;
  status: Generated<'pending' | 'delivered' | 'skipped'>;
  reason: string | null;
  acted_at: Timestamp | null;
  acted_via: 'volunteer_link' | 'staff' | null;
}

interface MapTeamsLists extends JunctionRecordType {
  team_id: string;
  list_id: string;
}

/**
 * Canvassing §13. A turf is a geographic slice of a smart-list universe cut into
 * a walkable door list. `status` is the stored lifecycle only —
 * 'draft' (unassigned) | 'active' (assigned/in the field) | 'retired'. Display
 * state ("In field now", "Complete") and all progress numbers are DERIVED from
 * turf_knocks at read time, never stored here (§22.6).
 */
interface Turfs extends RecordType {
  /** The context this record belongs to (Campaigns §15); backfilled to the office. */
  campaign_id: string;

  name: string;
  status: string;
  list_id: string | null;
  target_doors: number | null;
  centroid_lat: number | null;
  centroid_lng: number | null;
  ward: string | null;
  notes: string | null;
}

/** The doors of a turf — one row per household. */
interface TurfHouseholds extends JunctionRecordType {
  turf_id: string;
  household_id: string;
  /** Suggested visiting order (1-based), computed at cut/assign time. A hint, never a lock. */
  walk_order: number | null;
}

/** A turf handed to a team and/or opened via a tokenised Companion link. */
interface TurfAssignments extends RecordType {
  turf_id: string;
  team_id: string | null;
  token: string;
  status: string;
  assigned_at: Timestamp;
  /** The person this link belongs to — the companion access layer verifies against them. */
  volunteer_person_id: string | null;
  /** Optional hard expiry for the capability link (companion access layer). */
  expires_at: Timestamp | null;
}

/**
 * Companion access layer (COMPANION-APPS-PLAN.md §2): one row per (tenant,
 * person) who has ever been sent a companion link. `status` is the approval
 * lifecycle — 'invited' → 'verified' (code confirmed, awaiting admin) →
 * 'approved' | 'revoked'. Approval is per volunteer, not per assignment.
 */
interface CompanionVolunteers {
  id: Generated<string>;
  tenant_id: string;
  person_id: string;
  status: Generated<string>;
  verify_code_hash: string | null;
  verify_code_expires_at: Timestamp | null;
  verify_attempts: Generated<number>;
  verify_channel: 'email' | 'sms' | null;
  verified_at: Timestamp | null;
  approved_by: string | null;
  approved_at: Timestamp | null;
  revoked_at: Timestamp | null;
  createdby_id: string | null;
  updatedby_id: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

/** A verified companion device — only the sha256 of the session token is stored. */
interface CompanionSessions {
  id: Generated<string>;
  tenant_id: string;
  volunteer_id: string;
  token_hash: string;
  expires_at: Timestamp;
  revoked_at: Timestamp | null;
  last_used_at: Timestamp | null;
  user_agent: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

/**
 * Write-once idempotency ledger for volunteer actions (both companions).
 * Insert ON CONFLICT DO NOTHING; a conflict means "op already applied".
 */
interface CompanionOps {
  tenant_id: string;
  op_id: string;
  scope: 'canvass' | 'deliveries';
  created_at: Generated<Timestamp>;
}

/** One door interaction, synced live from a Canvass Companion. */
interface TurfKnocks extends RecordType {
  turf_id: string;
  household_id: string;
  person_id: string | null;
  outcome: string;
  response: string | null;
  notes: string | null;
  source: string;
  canvasser_name: string | null;
  client_knock_id: string | null;
  knocked_at: Timestamp;
  /** Issue chips picked in the survey (campaign-configured vocabulary). */
  issues: Generated<string[]>;
  /** Follow-up toggles from the survey (spec §3.5). */
  wants_volunteer: Generated<boolean>;
  wants_yard_sign: Generated<boolean>;
  set_dnc: Generated<boolean>;
  /** Contact info captured at the door (also applied to the person if blank there). */
  contact_phone: string | null;
  contact_email: string | null;
  subscribe: Generated<boolean>;
}

export interface MapListsPersons extends JunctionRecordType {
  list_id: string;
  person_id: string;
}

interface MapListsHouseholds extends JunctionRecordType {
  list_id: string;
  household_id: string;
}

/**
 * Normalized newsletter list targeting (replaces the JSONB
 * newsletters.target_lists document as the source of truth). `mode` carries
 * the {include, exclude} split; list_id/newsletter_id cascade on delete.
 */
export interface MapNewslettersLists extends JunctionRecordType {
  newsletter_id: string;
  list_id: string;
  mode: Generated<'include' | 'exclude'>;
}

/**
 * Normalized web-form list targeting (replaces the JSONB
 * web_forms.target_lists document as the source of truth).
 */
export interface MapWebFormsLists extends JunctionRecordType {
  web_form_id: string;
  list_id: string;
}

export interface Persons extends Omit<RecordType, 'createdby_id'> {
  /** Provenance only ("first captured in") — persons are tenant-wide, never campaign-scoped. */
  campaign_id: string | null;
  /** Global compliance override (§15): suppresses contact in every campaign context. */
  do_not_contact: Generated<boolean>;
  /** Channels the DNC applies to ('email' | 'phone' | 'door'); null = all channels. */
  do_not_contact_channels: string[] | null;
  household_id: string | null;
  createdby_id: string;
  first_name: string | null;
  middle_names: string | null;
  last_name: string | null;
  email: string | null;
  email2: string | null;
  mobile: string | null;
  home_phone: string | null;
  file_id: string | null;
  company_id: string | null;
  notes: string | null;
  linkedin: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  assigned_to: string | null;
  preferred_contact: string | null;
  /**
   * Opaque public identifier — 8 Crockford Base32 chars (40 CSPRNG bits),
   * unique per tenant, the canonical person lookup key (spec §1). Generated
   * app-side and NEVER changes — see lib/person-public-id.ts.
   */
  public_id: string | null;
  /**
   * URL display slug `{name}-{xxxx}-{xxxx}` (spec §1: /people/joseph-4t9k-2xpm).
   * The name is decorative; resolution is by public_id. Regenerated on rename,
   * app-side — see lib/person-public-id.ts.
   */
  slug: string | null;
}

interface Profiles extends RecordType, AddressType {
  auth_id: string;
  avatar_file_id: string | null;
  email: string | null;
  email2: string | null;
  mobile: string | null;
  home_phone: string | null;
  /** Typed contract: ProfilePreferencesObj ({ notifications: {...} }). */
  preferences: Json | null;
}

interface Settings extends Omit<RecordType, 'createdby_id' | 'updatedby_id'> {
  key: string;
  value: JsonValue;
  createdby_id: string | null;
  updatedby_id: string | null;
}

export interface Donations extends Omit<RecordType, 'createdby_id' | 'updatedby_id'> {
  /** The context this record belongs to (Campaigns §15); backfilled to the office. */
  campaign_id: string;

  person_id: string | null;
  amount: number;
  status: Generated<string>;
  stripe_session_id: string | null;
  /** Stripe PaymentIntent id, used to correlate refund/dispute webhooks back to this gift. */
  stripe_payment_intent_id: string | null;
  /** When a refund or lost chargeback reversed this gift; null while it stands. */
  refunded_at: ColumnType<Date, Date | string, Date | string> | null;
  pledge_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  street: string | null;
  apt: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  method: Generated<string>;
  receipt_sent: Generated<boolean>;
}

export interface DonationPeriods extends RecordType {
  /** The context this record belongs to (Campaigns §15); backfilled to the office. */
  campaign_id: string;

  name: string;
  start_date: ColumnType<Date, Date | string, Date | string>;
  end_date: ColumnType<Date, Date | string, Date | string> | null;
  limit_amount: number;
  is_active: Generated<boolean>;
}

export interface DonationPledges extends RecordType {
  /** The context this record belongs to (Campaigns §15); backfilled to the office. */
  campaign_id: string;

  person_id: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  monthly_amount: number;
  status: Generated<string>;
  started_at: Generated<Timestamp>;
  cancelled_at: Timestamp | null;
  next_billing_date: ColumnType<Date, Date | string, Date | string> | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  state: string | null;
  country: string | null;
}

interface Roles extends RecordType {
  name: string;
  description: string | null;
  permissions: Json | null;
}

interface Sessions extends Omit<RecordType, 'createdby_id' | 'updatedby_id' | 'updated_at'> {
  session_id: Generated<string>;
  user_id: string;
  ip_address: string;
  last_accessed: Generated<Timestamp>;
  other_properties: Json | null;
  refresh_token: Generated<string>;
  status: string;
  user_agent: string;
  expires_at: Timestamp | null;
  last_used_at: Timestamp | null;
}

export interface Lists extends RecordType {
  /** The context this record belongs to (Campaigns §15); backfilled to the office. */
  campaign_id: string;

  name: string;
  description: string | null;
  object: 'people' | 'households';
  is_dynamic: boolean;
  definition: Json | null;
  last_refreshed_at: Timestamp | null;
  status: Generated<'idle' | 'refreshing' | 'failed'>;
}

export interface Tags extends RecordType {
  name: string;
  description: string | null;
  color: string | null;
  deletable: boolean;
  type: Generated<'tag' | 'issue'>;
}

export interface Tasks extends RecordType {
  name: string;
  details?: string;
  due_at: Timestamp | null;
  /** Canonical vocabulary: TASK_STATUSES in libs/common/src/lib/schemas/tasks.schema.ts. */
  status: 'todo' | 'in_progress' | 'waiting' | 'done' | 'archived' | null;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  completed_at: Timestamp | null;
  position: number | null;
  assigned_to: string | null;
  team_id: string | null;
  file_id: string | null;
}

interface Tenants extends RecordType, AddressType {
  name: string;
  slug: string | null;
  admin_id: string | null;
  email: string | null;
  email2: string | null;
  mobile: string | null;
  notes: string | null;
  placeholder_household_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_ends_at: Timestamp | null;
  deletion_scheduled_at: Timestamp | null;
  suspended_at: Timestamp | null;
  paused_at: Timestamp | null;
  /** Demo mode: set while the seeded test-drive data is present; NULL = exited/never. */
  demo_mode_at: Timestamp | null;
}

interface Emails extends RecordType {
  /** The campaign context this email was synced into (§15). */
  campaign_id: string;
  folder_id: string;
  from_email: string | null;
  /** Display-only cache of the To list; email_recipients is the source of truth (D-10). */
  to_email: string | null;
  subject: string | null;
  preview: string | null;
  assigned_to: string | null;
  is_favourite: boolean;
  deleted_at: Timestamp | null;
  status: EmailStatus | null;
}

interface Newsletters extends RecordType {
  /** The context this newsletter belongs to (§15); recipients are filtered by its consent. */
  campaign_id: string;
  name: string;
  status: string;
  subject: string | null;
  preview_text: string | null;
  audience_description: string | null;
  target_lists: Json | null;
  segments: Json | null;
  total_recipients: Generated<number>;
  delivered_count: Generated<number>;
  bounce_count: Generated<number>;
  open_rate: Generated<number>;
  click_rate: Generated<number>;
  unique_opens: Generated<number>;
  unique_clicks: Generated<number>;
  unsubscribe_count: Generated<number>;
  spam_complaint_count: Generated<number>;
  reply_count: Generated<number>;
  send_date: Timestamp | null;
  last_engagement_at: Timestamp | null;
  summary: string | null;
  html_content: string | null;
  plain_text_content: string | null;
  top_links: Json | null;
}

export interface NewsletterEvents {
  id: Generated<string>;
  tenant_id: string;
  newsletter_id: string;
  email: string;
  event_type: string;
  sg_event_id: string;
  sg_message_id: string | null;
  url: string | null;
  ip: string | null;
  user_agent: string | null;
  /** SendGrid's human-readable failure reason (bounce/dropped events only). */
  reason: string | null;
  /** SendGrid bounce sub-type: 'bounce' = hard, 'blocked' = soft. */
  bounce_type: string | null;
  timestamp: Timestamp;
  created_at: Generated<Timestamp>;
}

export interface PersonNewsletterEngagements {
  tenant_id: string;
  newsletter_id: string;
  email: string;
  open_count: number;
  click_count: number;
  has_unsubscribed: boolean;
  hard_bounced: boolean;
  soft_bounced: boolean;
  first_opened_at: Timestamp | null;
  last_opened_at: Timestamp | null;
  first_clicked_at: Timestamp | null;
  last_clicked_at: Timestamp | null;
  bounced_at: Timestamp | null;
  unsubscribed_at: Timestamp | null;
}

interface WebForms extends RecordType {
  /** The context this record belongs to (Campaigns §15); backfilled to the office. */
  campaign_id: string;

  name: string;
  description: string | null;
  redirect_url: string | null;
  target_tags: Json | null;
  target_lists: Json | null;
  status: 'draft' | 'published' | 'archived';
  fields: Json | null;
  send_confirmation: boolean;
  send_alert: boolean;
  form_type: string;
  type: string | null;
  slug: string;
  submit_label: string | null;
  thanks_title: string | null;
  thanks_body: string | null;
  confirm_subject: string | null;
  confirm_body: string | null;
  notify_team_on: Generated<boolean>;
  archived_at: Timestamp | null;
}

interface FormSubmissions {
  id: Generated<string>;
  tenant_id: string;
  form_id: string;
  person_id: string;
  answers: Json;
  created_at: Generated<Timestamp>;
}

interface EmailComments extends RecordType {
  email_id: string;
  author_id: string;
  comment: string;
}

interface EmailBodies extends RecordType {
  email_id: string;
  body_html: string;
}

interface EmailHeaders extends RecordType {
  email_id: string;
  headers_json: Json | null;
  raw_headers: string | null;
  date_sent: Timestamp | null;
}

interface EmailRecipients extends RecordType {
  email_id: string;
  kind: 'to' | 'cc' | 'bcc';
  name: string | null;
  email: string;
  pos: number;
}

interface EmailAttachments extends RecordType {
  email_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  cid: string | null;
  is_inline: boolean;
  pos: number;
  file_id: string | null;
}

interface EmailDrafts extends RecordType {
  /** The campaign context this draft belongs to (§15). */
  campaign_id: string;
  user_id: string;
  thread_id: string | null;
  to_list: JsonValue | null;
  cc_list: JsonValue | null;
  bcc_list: JsonValue | null;
  subject: string | null;
  body_html: string | null;
  body_delta: JsonValue | null;
  meta: JsonValue | null;
  is_locked: boolean;
}

interface EmailTrash extends RecordType {
  email_id: string;
  from_folder_id: string;
  trashed_at: Timestamp;
}

export interface EmailReadStates {
  tenant_id: string;
  user_id: string;
  email_id: string;
  is_read: boolean;
  created_at: Generated<Timestamp>;
}

interface UserActivity extends RecordType {
  user_id: string;
  activity: string;
  entity: string;
  entity_id: string | null;
  quantity: number;
  metadata: Json | null;
}

interface DataImports extends RecordType {
  file_name: string;
  source: string;
  /**
   * Tag name requested at import time; label of record once the tag is deleted
   * (tag deletion nulls tag_id). While the tag exists, tags.name via tag_id is
   * the source of truth (D-10).
   */
  tag_name: string | null;
  tag_id: string | null;
  row_count: number;
  inserted_count: number;
  error_count: number;
  skipped_count: number;
  households_created: number;
  metadata: Json | null;
  processed_at: Timestamp;
  status: Generated<string>;
  error_message: string | null;
  /** Rows folded into an existing person via the "Merge into existing" duplicate decision (spec §17). */
  merged_count: Generated<number>;
  /** All tags applied by this import (the wizard allows several comma-separated tags, not just the auto tag). */
  tags_applied: Generated<Json>;
  /** Storage key for the retained original upload — kept 90 days so History can offer a re-download. */
  source_file_key: string | null;
  source_file_size: number | null;
  /** Per-row reasons for skipped rows, so History can offer a "download skipped rows" CSV. */
  skip_reasons: Generated<Json>;
}

export interface DataExports {
  id: Generated<string>;
  tenant_id: string;
  user_id: string;
  entity: string;
  file_name: string;
  status: Generated<'pending' | 'processing' | 'completed' | 'failed'>;
  row_count: number | null;
  storage_key: string | null;
  columns: ColumnType<string[] | null, string | null, string | null>;
  error: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface BackgroundJobs {
  id: Generated<string>;
  tenant_id: string | null;
  queue: Generated<string>;
  status: Generated<string>;
  payload: Json;
  attempts: Generated<number>;
  max_attempts: Generated<number>;
  error: string | null;
  run_at: Generated<Timestamp>;
  locked_at: Timestamp | null;
  locked_by: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface WebhookEvents {
  id: Generated<string>;
  tenant_id: string | null;
  stripe_event_id: string;
  type: string;
  payload: Json;
  status: Generated<string>;
  attempts: Generated<number>;
  max_attempts: Generated<number>;
  error: string | null;
  run_at: Generated<Timestamp>;
  locked_at: Timestamp | null;
  locked_by: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  processed_at: Timestamp | null;
}

export interface PotentialDuplicates {
  id: Generated<string>;
  tenant_id: string;
  group_key: string;
  person_id: string | null;
  household_id?: string | null;
  company_id?: string | null;
  reason: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

/** §9.3 Duplicates: a "Not duplicates" dismissal, keyed by the same `group_key` the nightly
 * sweep uses. No surrogate id — `(tenant_id, group_key)` is the natural primary key. */
export interface DismissedDuplicateGroups {
  tenant_id: string;
  group_key: string;
  dismissed_by_id: string;
  dismissed_at: Generated<Timestamp>;
}

interface MsOauthTokens {
  id: Generated<string>;
  tenant_id: string;
  /** The campaign context this mailbox connection belongs to (§15). */
  campaign_id: string;
  user_id: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: Timestamp;
  ms_email: string | null;
  delta_link: string | null;
  synced_at: Timestamp | null;
  last_sync_error: string | null;
  last_sync_error_at: Timestamp | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface GoogleOauthTokens {
  id: Generated<string>;
  tenant_id: string;
  /** The campaign context this mailbox connection belongs to (§15). */
  campaign_id: string;
  user_id: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: Timestamp;
  google_email: string | null;
  delta_link: string | null;
  synced_at: Timestamp | null;
  last_sync_error: string | null;
  last_sync_error_at: Timestamp | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface TaskComments extends RecordType {
  task_id: string;
  author_id: string;
  comment: string;
}

export interface TaskSubtasks extends RecordType {
  task_id: string;
  name: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'canceled' | null;
  position: number | null;
}

export interface TaskAttachments extends RecordType {
  task_id: string;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  url: string | null;
}

export interface Companies extends RecordType {
  name: string;
  description: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  notes: string | null;
  /** Typed contract: CompanyEnrichmentObj (Google Places enrichment payload). */
  enrichment: Json | null;
  file_id: string | null;
  /** URL slug, unique per tenant (spec §1). Generated app-side — see lib/slug.ts. */
  slug: string | null;
}

export interface Files {
  id: Generated<string>;
  tenant_id: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_key: string;
  sha256_hex: string | null;
  uploaded_by: string | null;
  /** Polymorphic link — what this file belongs to (e.g. 'newsletter', 'team'). Null for untethered uploads. */
  entity_type: string | null;
  entity_id: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface Notifications {
  id: Generated<string>;
  tenant_id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface VolunteerEvents extends RecordType {
  name: string;
  description: string | null;
  location_address: string | null;
  start_time: Timestamp;
  end_time: Timestamp;
  capacity: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_private: boolean;
  send_reminder: boolean;
  slug: string;
  send_signup_confirmation: boolean;
  send_volunteer_alert: boolean;
  fields: Generated<string[]>;
}

export interface VolunteerShifts extends RecordType {
  event_id: string;
  person_id: string;
  status: 'signed_up' | 'attended' | 'no_show' | 'cancelled';
  hours_worked: number | null;
  notes: string | null;
}

export interface Events extends RecordType {
  /** The context this record belongs to (Campaigns §15); backfilled to the office. */
  campaign_id: string;

  name: string;
  description: string | null;
  location_address: string | null;
  start_time: Timestamp;
  end_time: Timestamp;
  capacity: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  slug: string;
  is_published: Generated<boolean>;
  send_reminder: Generated<boolean>;
  send_registration_confirmation: Generated<boolean>;
  fields: Generated<string[]>;
}

export interface EventTicketTypes extends RecordType {
  event_id: string;
  name: string;
  description: string | null;
  price_cents: Generated<number>;
  capacity: number | null;
  sort_order: Generated<number>;
}

export interface EventRegistrations extends RecordType {
  event_id: string;
  person_id: string;
  ticket_type_id: string | null;
  status: Generated<'registered' | 'attended' | 'no_show' | 'cancelled'>;
  checked_in_at: Timestamp | null;
  notes: string | null;
}

export interface Workflows extends RecordType {
  name: string;
  description: string | null;
  trigger_type: string;
  status: string;
  trigger_event_id: string | null;
  // Spec §16 ONLY ENROLL IF — a QueryBuilder group node (see core.schema QueryBuilderGroupNode).
  conditions: Json | null;
}

export interface WorkflowSteps {
  id: Generated<string>;
  tenant_id: string;
  workflow_id: string;
  step_number: number;
  delay_days: number;
  delay_unit: 'days' | 'hours';
  // Spec §16: steps are polymorphic. `kind` discriminates; the value each kind carries lives
  // in `config` (send_email uses subject/html/text columns; wait uses delay_days/delay_unit).
  kind: 'wait' | 'send_email' | 'add_tag' | 'create_task' | 'notify_team';
  config: Json | null;
  subject: string | null;
  preview_text: string | null;
  html_content: string | null;
  plain_text_content: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

// Spec §16: one row per executed step (success or failure) — feeds the list's RUNS 30D /
// LAST RUN and the editor's RECENT RUNS. A failed run records the failing step for narration.
export interface WorkflowRuns {
  id: Generated<string>;
  tenant_id: string;
  workflow_id: string;
  enrollment_id: string | null;
  person_id: string | null;
  step_number: number | null;
  step_kind: string | null;
  status: 'success' | 'failed';
  error: string | null;
  created_at: Generated<Timestamp>;
}

export interface WorkflowEnrollments {
  id: Generated<string>;
  tenant_id: string;
  workflow_id: string;
  person_id: string;
  status: string;
  current_step_number: number;
  next_run_at: Timestamp | null;
  enrolled_at: Generated<Timestamp>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export type RelationType =
  | 'referred_by'
  | 'referred_to'
  | 'close_friend'
  | 'family_member'
  | 'spouse'
  | 'colleague'
  | 'org_affiliation'
  | 'introduced_by'
  | 'introduced_to'
  | 'custom';

export interface PersonConnections extends RecordType {
  from_person_id: string;
  to_person_id: string;
  relation_type: RelationType;
  custom_label: string | null;
  is_mutual: Generated<boolean>;
  notes: string | null;
}

interface Passkeys {
  id: Generated<string>;
  user_id: string;
  tenant_id: string;
  credential_id: string;
  public_key: string;
  counter: Generated<number>;
  device_type: string;
  backed_up: Generated<boolean>;
  transports: string[] | null;
  aaguid: string | null;
  friendly_name: string | null;
  created_at: Generated<Timestamp>;
}

interface ZapierSubscriptions {
  id: Generated<string>;
  tenant_id: string;
  event_type: string;
  webhook_url: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

type UnwrapSelect<T> = T extends ColumnType<infer S, any, any> ? S : T;

type SelectShape<T> = { [K in keyof T]: UnwrapSelect<T[K]> };

export type HouseholdCol = keyof Models['households'];
export type PersonsdCol = keyof Models['persons'];

export type HouseholdWithExtras = SelectShape<Models['households']> & {
  persons_count: number;
  tags: string[] | null;
};
```
