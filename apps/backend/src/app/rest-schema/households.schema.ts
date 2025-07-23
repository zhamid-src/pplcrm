// This generally matches the dB schema found in kysely.models, but it doesn't have to
const HouseholdsType = {
  id: { type: 'string' },
  tenant_id: { type: 'string' },
  campaign_id: { type: 'string' },
  created_by: { type: 'string' },
  file_id: { type: 'string' },
  name: { type: 'string' },
  home_phone: { type: 'string' },
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
const household = {
  type: 'object',
  properties: HouseholdsType,
};
const households = {
  type: 'array',
  items: HouseholdsType,
};

export const IdParam = {
  type: 'object',
  properties: { id: { type: 'string' } },
};
export const count = {
  schema: {
    response: { 200: { type: 'number' } },
  },
};
export const findFromId = {
  schema: {
    params: IdParam,
    response: { 200: household },
  },
};
export const getAll = {
  schema: {
    response: {
      200: households,
    },
  },
};
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
