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
import type { ExtractColumnType } from 'node_modules/kysely/dist/esm/util/type-utils';
import type { EmailStatus } from './emails';

export type Keys<T> = keyof T;
type Json = ColumnType<JsonValue, string, string>;
type JsonArray = JsonValue[];
type JsonObject = { [K in string]?: JsonValue };
type JsonPrimitive = boolean | number | string | null;
type JsonValue = JsonArray | JsonObject | JsonPrimitive;
type Timestamp = ColumnType<Date, Date | string, Date | string>;
type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

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
  persons: Persons;
  profiles: Profiles;
  roles: Roles;
  sessions: Sessions;
  tags: Tags;
  tenants: Tenants;
  settings: Settings;
  emails: Emails;
  email_comments: EmailComments;
  email_bodies: EmailBodies;
  email_headers: EmailHeaders;
  email_recipients: EmailRecipients;
  email_attachments: EmailAttachments;
  email_drafts: EmailDrafts;
  email_trash: EmailTrash;
}

export type AuthUsersType = Omit<AuthUsers, 'id'> & { id: string };
type DiscriminatedUnionOfRecord<
  A,
  B = {
    [Key in Keys<A> as '_']: {
      [K in Key]: [{ [S in K]: A[K] extends A[Exclude<K, Keys<A>>] ? never : A[K] }];
    };
  }['_'],
> = Keys<A> extends Keys<B> ? (B[Keys<A>] extends Array<any> ? B[Keys<A>][number] : never) : never;

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
> = T extends Keys<TableOpsUnion> ? TableOpsUnion[T][Op] : never;
// export type TableColumnsType<T extends keyof Models> = ValuesOf<T>;
type TableOpsUnion = DiscriminatedUnionOfRecord<TablesOperationMap>;

export type TypeId<T extends keyof Models> = TypeColumn<T, 'id'>;
export type TypeTenantId<T extends keyof Models> = TypeColumn<T, 'tenant_id'>;

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

export type TypeColumnValue<TTable extends keyof Models, TColumn extends keyof Models[TTable]> = ExtractColumnType<
  Models,
  TTable,
  TColumn
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
export interface AddressType {
  lat?: number;
  lng?: number;
  formatted_address?: string;
  type?: string;
  apt?: string;
  street_num?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
}

interface AuthUsers extends RecordType {
  email: string;
  first_name: string;
  password: string;
  password_reset_code: string | null;
  // TODO: move to Sessions
  password_reset_code_created_at: Timestamp | null;
  role: string | null;
  verified: boolean;
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
}

interface MapCampaignsUsers extends RecordType {
  campaign_id: string;
  user_id: string;
}

interface MapHouseholdsTags extends RecordType {
  household_id: string;
  tag_id: string;
}

export interface MapPeoplesTags extends RecordType {
  person_id: string;
  tag_id: string;
}

interface MapRolesUsers extends RecordType {
  role_id: string;
  user_id: string;
}

export interface MapListsPersons extends RecordType {
  list_id: string;
  person_id: string;
}

interface MapListsHouseholds extends RecordType {
  list_id: string;
  household_id: string;
}

export interface Persons extends Omit<RecordType, 'createdby_id'> {
  campaign_id: string;
  household_id: string;
  createdby_id: string;
  first_name: string | null;
  middle_names: string | null;
  last_name: string | null;
  email: string | null;
  email2: string | null;
  mobile: string | null;
  home_phone: string | null;
  file_id: string | null;
  json: Json | null;
  notes: string | null;
}

interface Profiles extends RecordType, AddressType {
  auth_id: string;
  email: string | null;
  email2: string | null;
  mobile: string | null;
  home_phone: string | null;
  json: Json | null;
}

interface Settings extends RecordType {
  key: string;
  value: JsonValue;
}

interface Roles extends RecordType {
  name: string;
  description: string | null;
  permissions: Json | null;
}

// We use a UUID for the Id here, so we can't extend the recordtype
interface Sessions extends RecordType {
  session_id: Generated<string>;
  user_id: string;
  ip_address: string;
  last_accessed: Generated<Timestamp>;
  other_properties: Json | null;
  refresh_token: Generated<string>;
  status: string;
  user_agent: string;
}

export interface Lists extends RecordType {
  name: string;
  description: string | null;
  object: 'people' | 'households';
  is_dynamic: boolean;
  definition: Json | null;
}

export interface Tags extends RecordType {
  name: string;
  description: string | null;
  deletable: boolean;
}

interface Tenants extends RecordType, AddressType {
  name: string;
  admin_id: string | null;
  email: string | null;
  email2: string | null;
  phone: string | null;
  json: Json | null;
  notes: string | null;
}

interface Emails extends RecordType {
  folder_id: string;
  from_email: string | null;
  to_email: string | null;
  subject: string | null;
  preview: string | null;
  assigned_to: string | null;
  is_favourite: boolean;
  deleted_at: Timestamp | null;
  status: EmailStatus | null;
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

/** Take the “S” (select-time) part if it’s a ColumnType, otherwise leave as-is */
type UnwrapSelect<T> = T extends ColumnType<infer S, any, any> ? S : T;

/** Recursively apply UnwrapSelect to every property */
type SelectShape<T> = { [K in keyof T]: UnwrapSelect<T[K]> };

export type HouseholdCol = keyof Models['households'];
export type PersonsdCol = keyof Models['persons'];

/** The row you actually return to the grid */
export type HouseholdWithExtras = SelectShape<Models['households']> & {
  persons_count: number;
  tags: string[] | null;
};
