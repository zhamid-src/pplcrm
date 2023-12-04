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
import type { ColumnType, Insertable, Selectable, Updateable } from 'kysely';

export interface Models {
  campaigns: Campaigns;
  households: Households;
  map_campaigns_users: MapCampaignsUsers;
  map_households_tags: MapHouseholdsTags;
  map_peoples_tags: MapPeoplesTags;
  persons: Persons;
  tags: Tags;
  tenants: Tenants;
  users: Users;
}

// The above interface and the below tables should match
export enum TableType {
  campaigns = 'campaigns',
  households = 'households',
  map_campaigns_users = 'map_campaigns_users',
  map_households_tags = 'map_households_tags',
  map_peoples_tags = 'map_peoples_tags',
  persons = 'persons',
  tags = 'tags',
  tenants = 'tenants',
  users = 'users',
}

// ====================================================================
// The following are the type definitions for the database schema
// Since I use a base controller to handle the CRUD operations, I don't
// know the exact type of the table until runtime. So I use the following
// type definitions to help me out.
// ====================================================================

type TablesOperationMap = {
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
  users: {
    select: Selectable<Users>;
    insert: Insertable<Users>;
    update: Updateable<Users>;
  };
};

type Keys<T> = keyof T;

type DiscriminatedUnionOfRecord<
  A,
  B = {
    [Key in keyof A as '_']: {
      [K in Key]: [
        { [S in K]: A[K] extends A[Exclude<K, Keys<A>>] ? never : A[K] }
      ];
    };
  }['_']
> = Keys<A> extends Keys<B>
  ? B[Keys<A>] extends Array<any>
    ? B[Keys<A>][number]
    : never
  : never;

type TableOpsUnion = DiscriminatedUnionOfRecord<TablesOperationMap>;
export type OperationDataType<
  T extends keyof Models,
  Op extends 'select' | 'update' | 'insert'
> = T extends keyof TableOpsUnion ? TableOpsUnion[T][Op] : never;
export type GetOperandType<
  T extends keyof TablesOperationMap,
  Op extends keyof TablesOperationMap[T],
  Key extends keyof TablesOperationMap[T][Op]
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

type Int8 = ColumnType<
  string,
  bigint | number | string,
  bigint | number | string
>;
type Json = ColumnType<JsonValue, string, string>;
type JsonArray = JsonValue[];
type JsonObject = {
  [K in string]?: JsonValue;
};
type JsonPrimitive = boolean | number | string | null;
type JsonValue = JsonArray | JsonObject | JsonPrimitive;
type Timestamp = ColumnType<Date, Date | string, Date | string>;

interface MapCampaignsUsers {
  id: Generated<Int8>;
  tenant_id: Int8;
  user_id: Int8;
  campaign_id: Int8;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

interface MapHouseholdsTags {
  id: Generated<Int8>;
  tenant_id: Int8;
  household_id: Int8;
  tag_id: Int8;
  updated_at: Generated<Timestamp>;
  created_at: Generated<Timestamp>;
}

interface MapPeoplesTags {
  id: Generated<Int8>;
  tenant_id: Int8;
  person_id: Int8;
  tag_id: Int8;
  updated_at: Generated<Timestamp>;
  created_at: Generated<Timestamp>;
}

interface Tags {
  id: Generated<Int8>;
  tenant_id: Int8;
  createdby_id: Int8;
  name: string;
  updated_at: Generated<Timestamp>;
  created_at: Generated<Timestamp>;
}

interface Campaigns {
  id: Generated<Int8>;
  tenant_id: Int8;
  createdby_id: Int8;
  admin_id: Int8;
  name: string;
  startdate: string | null;
  enddate: string | null;
  json: Json | null;
  notes: string | null;
  updated_at: Generated<Timestamp>;
  created_at: Generated<Timestamp>;
}

interface Persons {
  id: Generated<Int8>;
  tenant_id: Int8;
  campaign_id: Int8;
  createdby_id: Int8;
  household_id: Int8;
  first_name: string | null;
  middle_names: string | null;
  last_name: string | null;
  email: string | null;
  email2: string | null;
  home_phone: string | null;
  mobile: string | null;
  file_id: Int8 | null;
  notes: string | null;
  json: Json | null;
  updated_at: Generated<Timestamp>;
  created_at: Generated<Timestamp>;
}

interface Households {
  campaign_id: Int8;
  city: string | null;
  country: string | null;
  created_at: Generated<Timestamp>;
  createdby_id: Int8;
  file_id: Int8 | null;
  home_phone: string | null;
  id: Generated<Int8>;
  json: Json | null;
  notes: string | null;
  state: string | null;
  street1: string | null;
  street2: string | null;
  tenant_id: Int8;
  updated_at: Generated<Timestamp>;
  zip: string | null;
}

interface Tenants {
  admin_id: Int8;
  billing_city: string;
  billing_country: string;
  billing_state: string;
  billing_street1: string;
  billing_street2: string;
  billing_zip: string;
  city: string | null;
  country: string | null;
  created_at: Generated<Timestamp>;
  createdby_id: Int8;
  email: string | null;
  email2: string | null;
  id: Generated<Int8>;
  json: Json | null;
  mobile: string | null;
  name: string;
  notes: string | null;
  state: string | null;
  street1: string | null;
  street2: string | null;
  updated_at: Generated<Timestamp>;
  zip: string | null;
}

interface Users {
  city: string | null;
  country: string | null;
  created_at: Generated<Timestamp>;
  email: string | null;
  email2: string | null;
  first_name: string | null;
  home_phone: string | null;
  id: Generated<Int8>;
  json: Json | null;
  last_name: string | null;
  middle_names: string | null;
  mobile: string | null;
  role: string | null;
  state: string | null;
  street1: string | null;
  street2: string | null;
  tenant_id: Int8 | null;
  updated_at: Generated<Timestamp>;
  username: string | null;
  zip: string | null;
}
