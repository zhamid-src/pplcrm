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
  campaigns: Campaigns;
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
  background_jobs: BackgroundJobs;
  webhook_events: WebhookEvents;
  data_exports: DataExports;
  potential_duplicates: PotentialDuplicates;
  workflows: Workflows;
  workflow_steps: WorkflowSteps;
  workflow_enrollments: WorkflowEnrollments;
  person_connections: PersonConnections;
  passkeys: Passkeys;
  zapier_subscriptions: ZapierSubscriptions;
  email_folders: EmailFolders;
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
  deletion_scheduled_at: Timestamp | null;
  previous_email: string | null;
  previous_role: string | null;
  passkey_setup_dismissed_at: Timestamp | null;
}

interface Campaigns extends Omit<RecordType, 'createdby_id'> {
  admin_id: string;
  createdby_id: string;
  description: string | null;
  startdate: string | null;
  enddate: string | null;
  name: string;
  json: Json | null;
  notes: string | null;
}

export interface Households extends Omit<RecordType, 'createdby_id'>, AddressType {
  campaign_id: string;
  createdby_id: string;
  file_id: string | null;
  home_phone: string | null;
  json: Json | null;
  notes: string | null;
  address_fp_street: string | null;
  address_fp_full: string | null;
  is_placeholder?: boolean;
  district: string | null;
  precinct: string | null;
  ward: string | null;
  geocoding_status: string | null;
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

interface MapTeamsLists extends JunctionRecordType {
  team_id: string;
  list_id: string;
}

export interface MapListsPersons extends JunctionRecordType {
  list_id: string;
  person_id: string;
}

interface MapListsHouseholds extends JunctionRecordType {
  list_id: string;
  household_id: string;
}

export interface Persons extends Omit<RecordType, 'createdby_id'> {
  campaign_id: string;
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
  json: Json | null;
  notes: string | null;
  linkedin: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  assigned_to: string | null;
  opt_in_status: string | null;
  opt_in_confirmed_at: Timestamp | null;
}

interface Profiles extends RecordType, AddressType {
  auth_id: string;
  avatar_file_id: string | null;
  email: string | null;
  email2: string | null;
  mobile: string | null;
  home_phone: string | null;
  json: Json | null;
}

interface Settings extends Omit<RecordType, 'createdby_id' | 'updatedby_id'> {
  key: string;
  value: JsonValue;
  createdby_id: string | null;
  updatedby_id: string | null;
}

export interface Donations extends Omit<RecordType, 'createdby_id' | 'updatedby_id'> {
  person_id: string | null;
  amount: number;
  status: Generated<string>;
  stripe_session_id: string | null;
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
}

export interface DonationPeriods extends RecordType {
  name: string;
  start_date: ColumnType<Date, Date | string, Date | string>;
  end_date: ColumnType<Date, Date | string, Date | string> | null;
  limit_amount: number;
  is_active: Generated<boolean>;
}

export interface DonationPledges extends RecordType {
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
  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'canceled' | 'archived' | null;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  completed_at: Timestamp | null;
  position: number | null;
  assigned_to: string | null;
  team_id: string | null;
  file_id: string | null;
}

interface Tenants extends RecordType, AddressType {
  name: string;
  admin_id: string | null;
  email: string | null;
  email2: string | null;
  mobile: string | null;
  json: Json | null;
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
}

interface Emails extends RecordType {
  folder_id: string;
  from_email: string | null;
  to_email: string | null;
  subject: string | null;
  body: string | null;
  preview: string | null;
  assigned_to: string | null;
  is_favourite: boolean;
  deleted_at: Timestamp | null;
  status: EmailStatus | null;
}

interface Newsletters extends RecordType {
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
  attachments: Json | null;
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
  name: string;
  description: string | null;
  redirect_url: string | null;
  target_tags: Json | null;
  target_lists: Json | null;
  status: 'active' | 'archived';
  fields: Json | null;
  send_confirmation: boolean;
  send_alert: boolean;
  form_type: string;
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

interface MsOauthTokens {
  id: Generated<string>;
  tenant_id: string;
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
  json: Json | null;
  file_id: string | null;
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
}

export interface WorkflowSteps {
  id: Generated<string>;
  tenant_id: string;
  workflow_id: string;
  step_number: number;
  delay_days: number;
  delay_unit: 'days' | 'hours';
  subject: string;
  preview_text: string | null;
  html_content: string | null;
  plain_text_content: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
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

interface EmailFolders {
  id: Generated<string>;
  tenant_id: string;
  name: string;
  icon: string | null;
  sort_order: Generated<number>;
  is_default: Generated<boolean>;
  createdby_id: string;
  updatedby_id: string;
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
