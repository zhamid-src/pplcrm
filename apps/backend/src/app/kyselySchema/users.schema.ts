import { Generated } from 'kysely';
import { Int8, Json, Timestamp } from './base.schema';

export interface Users {
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
