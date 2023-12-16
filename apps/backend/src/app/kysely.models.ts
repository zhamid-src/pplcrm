/* eslint-disable @typescript-eslint/no-explicit-any */
// This file is used to generate the types for the database schema to assist with
// migration. It also tells kysely the types of the columns in the database.
// We don't really use it anywhere else
// The only exports are the Database interface and the table type enum
//
// ====================================================================
// When adding a new table, you have to edit three things :-
// 1. Add a model and add it to the interfaxe Models
// 2. Add the enum in TableType
// 3. Add the type in the TablesOperationMap
// ====================================================================

import type {
  ColumnType,
  Insertable,
  SelectExpression,
  Selectable,
  Updateable,
} from "kysely";
import { UndirectedOrderByExpression } from "node_modules/kysely/dist/cjs/parser/order-by-parser";
import { ExtractTableAlias } from "node_modules/kysely/dist/cjs/parser/table-parser";

export interface Models {
  authusers: AuthUsers;
  campaigns: Campaigns;
  households: Households;
  map_campaigns_users: MapCampaignsUsers;
  map_households_tags: MapHouseholdsTags;
  map_peoples_tags: MapPeoplesTags;
  map_roles_users: MapRolesUsers;
  persons: Persons;
  roles: Roles;
  sessions: Sessions;
  tags: Tags;
  tenants: Tenants;
  userprofiles: UserProfiles;
}

// The above interface and the below tables should match
export enum TableType {
  campaigns = "campaigns",
  households = "households",
  map_campaigns_users = "map_campaigns_users",
  map_households_tags = "map_households_tags",
  map_peoples_tags = "map_peoples_tags",
  persons = "persons",
  tags = "tags",
  tenants = "tenants",
  userprofiles = "userprofiles",
  authusers = "authusers",
  sessions = "sessions",
  roles = "roles",
  map_roles_users = "map_roles_users",
}

// ====================================================================
// The following are the type definitions for the database schema
// Since I use a base controller to handle the CRUD operations, I don't
// know the exact type of the table until runtime. So I use the following
// type definitions to help me out.
// ====================================================================

export type TablesOperationMap = {
  campaigns: {
    select: Selectable<Campaigns>;
    insert: Insertable<Campaigns>;
    update: Updateable<Campaigns>;
  };
  households: {
    select: Selectable<Households>;
    insert: Insertable<Households>;
    update: Updateable<Households>;
  };
  map_campaigns_users: {
    select: Selectable<MapCampaignsUsers>;
    insert: Insertable<MapCampaignsUsers>;
    update: Updateable<MapCampaignsUsers>;
  };
  map_households_tags: {
    select: Selectable<MapHouseholdsTags>;
    insert: Insertable<MapHouseholdsTags>;
    update: Updateable<MapHouseholdsTags>;
  };
  map_peoples_tags: {
    select: Selectable<MapPeoplesTags>;
    insert: Insertable<MapPeoplesTags>;
    update: Updateable<MapPeoplesTags>;
  };
  persons: {
    select: Selectable<Persons>;
    insert: Insertable<Persons>;
    update: Updateable<Persons>;
  };
  tags: {
    select: Selectable<Tags>;
    insert: Insertable<Tags>;
    update: Updateable<Tags>;
  };
  tenants: {
    select: Selectable<Tenants>;
    insert: Insertable<Tenants>;
    update: Updateable<Tenants>;
  };
  userprofiles: {
    select: Selectable<UserProfiles>;
    insert: Insertable<UserProfiles>;
    update: Updateable<UserProfiles>;
  };
  authusers: {
    select: Selectable<AuthUsers>;
    insert: Insertable<AuthUsers>;
    update: Updateable<AuthUsers>;
  };
  sessions: {
    select: Selectable<Sessions>;
    insert: Insertable<Sessions>;
    update: Updateable<Sessions>;
  };
  roles: {
    select: Selectable<Roles>;
    insert: Insertable<Roles>;
    update: Updateable<Roles>;
  };
  map_roles_users: {
    select: Selectable<MapRolesUsers>;
    insert: Insertable<MapRolesUsers>;
    update: Updateable<MapRolesUsers>;
  };
};

type Keys<T> = keyof T;

type DiscriminatedUnionOfRecord<
  A,
  B = {
    [Key in keyof A as "_"]: {
      [K in Key]: [
        { [S in K]: A[K] extends A[Exclude<K, Keys<A>>] ? never : A[K] },
      ];
    };
  }["_"],
> = Keys<A> extends Keys<B>
  ? B[Keys<A>] extends Array<any>
    ? B[Keys<A>][number]
    : never
  : never;

type TableOpsUnion = DiscriminatedUnionOfRecord<TablesOperationMap>;
// export type TableColumnsType<T extends keyof Models> = ValuesOf<T>;

export type TableColumnsType<T extends keyof Models> = T extends keyof Models
  ? SelectExpression<Models, ExtractTableAlias<Models, T>>
  : never;

export type GroupDataType<T extends keyof Models> = T extends keyof Models
  ? UndirectedOrderByExpression<Models, ExtractTableAlias<Models, T>, object>
  : never;
export type OperationDataType<
  T extends keyof Models,
  Op extends "select" | "update" | "insert",
> = T extends keyof TableOpsUnion ? TableOpsUnion[T][Op] : never;
export type GetOperandType<
  T extends keyof TablesOperationMap,
  Op extends keyof TablesOperationMap[T],
  Key extends keyof TablesOperationMap[T][Op],
> = unknown extends TablesOperationMap[T][Op][Key]
  ? never
  : TablesOperationMap[T][Op][Key] extends never
    ? never
    : TablesOperationMap[T][Op][Key];

// ====================================================================
// =====================  GENERATED TYPES BELOW  =====================
// ====================================================================
type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

type Json = ColumnType<JsonValue, string, string>;
type JsonArray = JsonValue[];
type JsonObject = {
  [K in string]?: JsonValue;
};
type JsonPrimitive = boolean | number | string | null;
type JsonValue = JsonArray | JsonObject | JsonPrimitive;
type Timestamp = ColumnType<Date, Date | string, Date | string>;
interface MapCampaignsUsers {
  campaign_id: number;
  created_at: Generated<Timestamp>;
  id: Generated<number>;
  tenant_id: number;
  updated_at: Generated<Timestamp>;
  user_id: number;
}

interface MapHouseholdsTags {
  created_at: Generated<Timestamp>;
  household_id: number;
  id: Generated<number>;
  tag_id: number;
  tenant_id: number;
  updated_at: Generated<Timestamp>;
}

interface MapPeoplesTags {
  created_at: Generated<Timestamp>;
  id: Generated<number>;
  person_id: number;
  tag_id: number;
  tenant_id: number;
  updated_at: Generated<Timestamp>;
}

interface Tags {
  created_at: Generated<Timestamp>;
  createdby_id: number;
  id: Generated<number>;
  name: string;
  tenant_id: number;
  updated_at: Generated<Timestamp>;
}

interface Campaigns {
  admin_id: number;
  created_at: Generated<Timestamp>;
  createdby_id: number;
  description: string | null;
  enddate: string | null;
  id: Generated<number>;
  json: Json | null;
  name: string;
  notes: string | null;
  startdate: string | null;
  tenant_id: number;
  updated_at: Generated<Timestamp>;
}

interface Persons {
  campaign_id: number;
  created_at: Generated<Timestamp>;
  createdby_id: number;
  email: string | null;
  email2: string | null;
  file_id: number | null;
  first_name: string | null;
  home_phone: string | null;
  household_id: number;
  id: Generated<number>;
  json: Json | null;
  last_name: string | null;
  middle_names: string | null;
  mobile: string | null;
  notes: string | null;
  tenant_id: number;
  updated_at: Generated<Timestamp>;
}

interface Households {
  campaign_id: number;
  city: string | null;
  country: string | null;
  created_at: Generated<Timestamp>;
  createdby_id: number;
  file_id: number | null;
  home_phone: string | null;
  id: Generated<number>;
  json: Json | null;
  notes: string | null;
  state: string | null;
  street1: string | null;
  street2: string | null;
  tenant_id: number;
  updated_at: Generated<Timestamp>;
  zip: string | null;
}

interface Tenants {
  admin_id: number | null;
  billing_city: string | null;
  billing_country: string | null;
  billing_state: string | null;
  billing_street1: string | null;
  billing_street2: string | null;
  billing_zip: string | null;
  city: string | null;
  country: string | null;
  created_at: Generated<Timestamp>;
  createdby_id: number | null;
  email: string | null;
  email2: string | null;
  id: Generated<number>;
  json: Json | null;
  name: string;
  notes: string | null;
  phone: string | null;
  state: string | null;
  street1: string | null;
  street2: string | null;
  updated_at: Generated<Timestamp>;
  zip: string | null;
}

interface Sessions {
  created_at: Generated<Timestamp>;
  expires_at: Generated<Timestamp>;
  id: Generated<string>;
  ip_address: string;
  last_accessed: Generated<Timestamp>;
  other_properties: Json | null;
  refresh_token: Generated<string>;
  status: string;
  tenant_id: number;
  user_agent: string;
  user_id: number;
}
export type SesssionsType = Sessions;

interface Roles {
  created_at: Generated<Timestamp>;
  description: string | null;
  id: Generated<number>;
  name: string;
  permissions: Json | null;
  tenant_id: number;
  updated_at: Generated<Timestamp>;
}

interface MapRolesUsers {
  created_at: Generated<Timestamp>;
  id: Generated<number>;
  role_id: number;
  tenant_id: number;
  updated_at: Generated<Timestamp>;
  user_id: number;
}

interface AuthUsers {
  created_at: Generated<Timestamp>;
  email: string;
  first_name: string;
  id: Generated<number>;
  last_name: string | null;
  middle_names: string | null;
  password: string;
  role: string | null;
  tenant_id: number;
  updated_at: Generated<Timestamp>;
  verified: boolean;
}
export type AuthUsersType = AuthUsers;

interface UserProfiles {
  auth_id: number;
  city: string | null;
  country: string | null;
  created_at: Generated<Timestamp>;
  email2: string | null;
  home_phone: string | null;
  id: number;
  json: Json | null;
  mobile: string | null;
  state: string | null;
  street1: string | null;
  street2: string | null;
  tenant_id: number | null;
  uid: number;
  updated_at: Generated<Timestamp>;
  zip: string | null;
}
