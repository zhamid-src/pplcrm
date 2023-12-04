import { Generated } from 'kysely';
import { Int8, Json, Timestamp } from './base.schema';

export interface Persons {
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
