// tsco:ignore
/* eslint-disable @typescript-eslint/no-explicit-any */
//
// ====================================================================
// When adding a new table, you have to  :-
// 1. Add a model and add it to the interfaxe Models

// ====================================================================
import type {
  ColumnType,
  Insertable,
  OperandValueExpressionOrList,
  SelectExpression,
  Selectable,
  Updateable,
} from 'kysely';
import { UndirectedOrderByExpression } from 'node_modules/kysely/dist/cjs/parser/order-by-parser';
import { ExtractTableAlias } from 'node_modules/kysely/dist/cjs/parser/table-parser';

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
  persons: Persons;
  profiles: Profiles;
  roles: Roles;
  sessions: Sessions;
  tags: Tags;
  tenants: Tenants;
}

export type AuthUsersType = Omit<AuthUsers, 'id'> & { id: bigint };
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
export type GroupDataType<T extends keyof Models> = T extends keyof Models
  ? UndirectedOrderByExpression<Models, ExtractTableAlias<Models, T>, object>
  : never;
export type OperationDataType<
  T extends Keys<Models>,
  Op extends 'select' | 'update' | 'insert',
> = T extends Keys<TableOpsUnion> ? TableOpsUnion[T][Op] : never;
// export type TableColumnsType<T extends keyof Models> = ValuesOf<T>;
export type TableColumnsType<T extends keyof Models> = T extends keyof Models
  ? SelectExpression<Models, ExtractTableAlias<Models, T>>
  : never;
type TableOpsUnion = DiscriminatedUnionOfRecord<TablesOperationMap>;

export type TableIdType<T extends keyof Models> = OperandValueExpressionOrList<
  Models,
  ExtractTableAlias<Models, T>,
  'id'
>;

export type TablesOperationMap = {
  [K in Keys<Models>]: {
    select: Selectable<Models[K]>;
    insert: Insertable<Models[K]>;
    update: Updateable<Models[K]>;
  };
};

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
  id: Generated<bigint>;
  tenant_id: bigint;
  createdby_id: bigint;
  updatedby_id: bigint;
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
  street?: string;
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
  admin_id: bigint;
  createdby_id: bigint;
  description: string | null;
  startdate: string | null;
  enddate: string | null;
  name: string;
  json: Json | null;
  notes: string | null;
}

export interface Households extends Omit<RecordType, 'createdby_id'>, AddressType {
  campaign_id: bigint;
  createdby_id: bigint;
  file_id: bigint | null;
  home_phone: string | null;
  json: Json | null;
  notes: string | null;
}

interface MapCampaignsUsers extends RecordType {
  campaign_id: bigint;
  user_id: bigint;
}

interface MapHouseholdsTags extends RecordType {
  household_id: bigint;
  tag_id: bigint;
}

interface MapPeoplesTags extends RecordType {
  person_id: bigint;
  tag_id: bigint;
}

interface MapRolesUsers extends RecordType {
  role_id: bigint;
  user_id: bigint;
}

export interface Persons extends Omit<RecordType, 'createdby_id'> {
  campaign_id: bigint;
  household_id: bigint;
  createdby_id: bigint;
  first_name: string | null;
  middle_names: string | null;
  last_name: string | null;
  email: string | null;
  email2: string | null;
  mobile: string | null;
  home_phone: string | null;
  file_id: bigint | null;
  json: Json | null;
  notes: string | null;
}

interface Profiles extends RecordType, AddressType {
  auth_id: bigint;
  email: string | null;
  email2: string | null;
  mobile: string | null;
  home_phone: string | null;
  json: Json | null;
}

interface Roles extends RecordType {
  name: string;
  description: string | null;
  permissions: Json | null;
}

// We use a UUID for the Id here, so we can't extend the recordtype
interface Sessions extends RecordType {
  session_id: Generated<string>;
  user_id: bigint;
  ip_address: string;
  last_accessed: Generated<Timestamp>;
  other_properties: Json | null;
  refresh_token: Generated<string>;
  status: string;
  user_agent: string;
}

export interface Tags extends RecordType {
  name: string;
  description: string | null;
}

interface Tenants extends Omit<RecordType, 'tenant_id'>, AddressType {
  name: string;
  admin_id: bigint | null;
  email: string | null;
  email2: string | null;
  phone: string | null;
  json: Json | null;
  notes: string | null;
}
