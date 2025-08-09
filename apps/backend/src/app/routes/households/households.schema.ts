/**
 * JSON schema definitions for household-related routes.
 * This generally matches the database schema found in `kysely.models`, but it can differ.
 */
const HouseholdsType = {
  id: { type: 'string' },
  tenant_id: { type: 'string' },
  campaign_id: { type: 'string' },
  created_by: { type: 'string' },
  file_id: { type: 'string' },
  name: { type: 'string' },
  home_phone: { type: 'string' },
  apt: { type: 'string' },
  street_num: { type: 'string' },
  street1: { type: 'string' },
  street2: { type: 'string' },
  city: { type: 'string' },
  state: { type: 'string' },
  zip: { type: 'string' },
  country: { type: 'string' },
  json: { type: 'string' },
  created_at: { type: 'string' },
  updated_at: { type: 'string' },
};
/** Schema for a single household object. */
const household = {
  type: 'object',
  properties: HouseholdsType,
};
/** Schema for an array of household objects. */
const households = {
  type: 'array',
  items: HouseholdsType,
};

/** Schema for route parameters containing a household ID. */
export const IdParam = {
  type: 'object',
  properties: { id: { type: 'string' } },
};
/** Schema for the response when counting households. */
export const count = {
  schema: {
    response: { 200: { type: 'number' } },
  },
};
/** Schema for retrieving a household by ID. */
export const findFromId = {
  schema: {
    params: IdParam,
    response: { 200: household },
  },
};
/** Schema for retrieving all households. */
export const getAll = {
  schema: {
    response: {
      200: households,
    },
  },
};
/** Schema for updating a household. */
export const update = {
  schema: {
    body: {
      type: 'object',
      required: [],
      properties: { ...HouseholdsType },
    },
    response: { 201: households },
  },
};
