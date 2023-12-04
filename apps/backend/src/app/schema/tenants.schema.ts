import { Generated } from 'kysely';
import { Int8, Json, Timestamp } from './base.schema';

export interface Tenants {
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
