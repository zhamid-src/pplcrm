import { Generated } from 'kysely';
import { Int8, Json, Timestamp } from './base.schema';

export interface Households {
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
