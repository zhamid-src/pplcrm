/**
 * JSON schema definitions for person-related routes.
 * This generally matches the database schema found in `kysely.models`, but it can differ.
 */
const PersonType = {
  id: { type: 'string' },
  tenant_id: { type: 'string' },
  username: { type: 'string' },
  role: { type: 'string' },
  first_name: { type: 'string' },
  middle_names: { type: 'string' },
  last_name: { type: 'string' },
  home_phone: { type: 'string' },
  mobile: { type: 'string' },
  work_phone: { type: 'string' },
  email: { type: 'string' },
  email2: { type: 'string' },
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
/** Schema for a single person object. */
const person = {
  type: 'object',
  properties: PersonType,
};
/** Schema for an array of person objects. */
const persons = {
  type: 'array',
  items: PersonType,
};

/** Schema for route parameters containing a person ID. */
export const IdParam = {
  type: 'object',
  properties: { id: { type: 'string' } },
};
/** Schema for the response when counting persons. */
export const count = {
  schema: {
    response: { 200: { type: 'number' } },
  },
};
/** Schema for retrieving a person by ID. */
export const findFromId = {
  schema: {
    params: IdParam,
    response: { 200: person },
  },
};
/** Schema for retrieving all persons. */
export const getAll = {
  schema: {
    response: {
      200: persons,
    },
  },
};
/** Schema for updating a person. */
export const update = {
  schema: {
    body: {
      type: 'object',
      required: [],
      properties: { ...PersonType },
    },
    response: { 201: person },
  },
};
