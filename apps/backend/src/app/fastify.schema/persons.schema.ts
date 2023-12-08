// This generally matches the dB schema found in kysely.models, but it doesn't have to
const PersonType = {
  id: { type: "string" },
  tenant_id: { type: "string" },
  username: { type: "string" },
  role: { type: "string" },
  first_name: { type: "string" },
  middle_names: { type: "string" },
  last_name: { type: "string" },
  home_phone: { type: "string" },
  mobile: { type: "string" },
  work_phone: { type: "string" },
  email: { type: "string" },
  email2: { type: "string" },
  street1: { type: "string" },
  street2: { type: "string" },
  city: { type: "string" },
  state: { type: "string" },
  zip: { type: "string" },
  country: { type: "string" },
  json: { type: "string" },
  created_at: { type: "string" },
  updated_at: { type: "string" },
};

const person = {
  type: "object",
  properties: PersonType,
};

const persons = {
  type: "array",
  items: PersonType,
};

export const IdParam = {
  type: "object",
  properties: { id: { type: "string" } },
};

export const getAll = {
  schema: {
    response: {
      200: persons,
    },
  },
};

export const findFromId = {
  schema: {
    params: IdParam,
    response: { 200: person },
  },
};

export const count = {
  schema: {
    response: { 200: { type: "number" } },
  },
};

export const update = {
  schema: {
    body: {
      type: "object",
      required: [],
      properties: { ...PersonType },
    },
    response: { 201: person },
  },
};
