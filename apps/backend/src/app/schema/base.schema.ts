import type { ColumnType } from 'kysely';

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Int8 = ColumnType<string, bigint | number | string, bigint | number | string>;
export type Json = ColumnType<JsonValue, string, string>;
export type JsonArray = JsonValue[];
export type JsonObject = {
  [K in string]?: JsonValue;
};
export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonArray | JsonObject | JsonPrimitive;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface MapCampaignsUsers {
  id: Generated<Int8>;
  tenant_id: Int8;
  user_id: Int8;
  campaign_id: Int8;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

export interface MapHouseholdsTags {
  id: Generated<Int8>;
  tenant_id: Int8;
  household_id: Int8;
  tag_id: Int8;
  updated_at: Generated<Timestamp>;
  created_at: Generated<Timestamp>;
}

export interface MapPeoplesTags {
  id: Generated<Int8>;
  tenant_id: Int8;
  person_id: Int8;
  tag_id: Int8;
  updated_at: Generated<Timestamp>;
  created_at: Generated<Timestamp>;
}

export interface Tags {
  id: Generated<Int8>;
  tenant_id: Int8;
  createdby_id: Int8;
  name: string;
  updated_at: Generated<Timestamp>;
  created_at: Generated<Timestamp>;
}
