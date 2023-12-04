import { Generated } from 'kysely';
import { Int8, Json, Timestamp } from './base.schema';

export interface Campaigns {
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
