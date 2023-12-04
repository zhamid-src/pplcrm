import { MapCampaignsUsers, MapHouseholdsTags, MapPeoplesTags, Tags } from './base.table';
import { Campaigns } from './campaigns.table';
import { Households } from './households.table';
import { Persons } from './persons.table';
import { Tenants } from './tenants.table';
import { Users } from './users.table';

export interface Database {
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
