/* eslint-disable @typescript-eslint/no-explicit-any */
// This file is used to generate the types for the database schema to assist with
// migration. It also tells kysely the types of the columns in the database.
// We don't really use it anywhere else
// The only exports are the Database interface and the table type enum
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
  UpdateObject,
  Updateable,
} from 'kysely';
import { UndirectedOrderByExpression } from 'node_modules/kysely/dist/cjs/parser/order-by-parser';
import { ExtractTableAlias } from 'node_modules/kysely/dist/cjs/parser/table-parser';

type Keys<T> = keyof T;
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

export type UpdateRow<T extends keyof Models> = UpdateObject<
  Models,
  ExtractTableAlias<Models, T>,
  ExtractTableAlias<Models, T>
>;

type TablesOperationMap = {
  [K in Keys<Models>]: {
    select: Selectable<Models[K]>;
    insert: Insertable<Models[K]>;
    update: Updateable<Models[K]>;
  };
};

type TableType = {
  [K in Keys<Models>]: K;
};

// ====================================================================
// The following are the type definitions for the database schema
// Since I use a base controller to handle the CRUD operations, I don't
// know the exact type of the table until runtime. So I use the following
// type definitions to help me out.
// ====================================================================
interface RecordType {
  id: Generated<bigint>;
  tenant_id: bigint;
  createdby_id: bigint | null;
  updatedby_id: bigint | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
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
  enddate: string | null;
  json: Json | null;
  name: string;
  notes: string | null;
  startdate: string | null;
}

//TODO: add an Address type
interface Households extends Omit<RecordType, 'createdby_id'> {
  campaign_id: bigint;
  city: string | null;
  country: string | null;
  createdby_id: bigint;
  file_id: bigint | null;
  home_phone: string | null;
  json: Json | null;
  notes: string | null;
  state: string | null;
  street1: string | null;
  street2: string | null;
  zip: string | null;
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

interface Persons extends Omit<RecordType, 'createdby_id'> {
  campaign_id: bigint;
  createdby_id: bigint;
  email: string | null;
  email2: string | null;
  file_id: bigint | null;
  first_name: string | null;
  home_phone: string | null;
  household_id: bigint;
  json: Json | null;
  last_name: string | null;
  middle_names: string | null;
  mobile: string | null;
  notes: string | null;
}

interface Profiles extends RecordType {
  auth_id: bigint;
  city: string | null;
  country: string | null;
  created_at: Generated<Timestamp>;
  email2: string | null;
  home_phone: string | null;
  json: Json | null;
  mobile: string | null;
  state: string | null;
  street1: string | null;
  street2: string | null;
  zip: string | null;
}

interface Roles extends RecordType {
  description: string | null;
  name: string;
  permissions: Json | null;
}

// We use a UUID for the Id here, so we can't extend the recordtype
interface Sessions extends RecordType {
  ip_address: string;
  last_accessed: Generated<Timestamp>;
  other_properties: Json | null;
  refresh_token: Generated<string>;
  session_id: Generated<string>;
  status: string;
  tenant_id: bigint;
  user_agent: string;
  user_id: bigint;
}

interface Tags extends RecordType {
  description: string | null;
  name: string;
}

interface Tenants extends Omit<RecordType, 'tenant_id'> {
  admin_id: bigint | null;
  billing_city: string | null;
  billing_country: string | null;
  billing_state: string | null;
  billing_street1: string | null;
  billing_street2: string | null;
  billing_zip: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  email2: string | null;
  json: Json | null;
  name: string;
  notes: string | null;
  phone: string | null;
  state: string | null;
  street1: string | null;
  street2: string | null;
  zip: string | null;
}
