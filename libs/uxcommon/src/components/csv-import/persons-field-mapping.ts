/**
 * Shared header-to-field auto-mapping heuristic for importing people from a
 * CSV/TSV file. Originally lived inline in `persons-grid.ts` (the legacy
 * modal importer); the CSV import wizard (spec §17, `/imports/new`) reuses it
 * verbatim rather than re-deriving a second mapping table.
 */
export const PERSONS_MAPPABLE_FIELDS: string[] = [
  'first_name',
  'middle_names',
  'last_name',
  'email',
  'email2',
  'mobile',
  'home_phone',
  'street_num',
  'street1',
  'street2',
  'apt',
  'city',
  'state',
  'zip',
  'country',
  'notes',
];

const HEADER_TO_FIELD: Record<string, string> = {
  firstname: 'first_name',
  fname: 'first_name',
  middlename: 'middle_names',
  lastname: 'last_name',
  lname: 'last_name',
  name: 'first_name',
  email: 'email',
  emailaddress: 'email',
  email1address: 'email',
  email2: 'email2',
  email2address: 'email2',
  mobile: 'mobile',
  mobilephone: 'mobile',
  cellphone: 'mobile',
  primaryphone: 'mobile',
  businessphone: 'mobile',
  homephone: 'home_phone',
  streetnum: 'street_num',
  streetnumber: 'street_num',
  homestreet: 'street1',
  homestreet1: 'street1',
  homestreet2: 'street2',
  homestreet3: 'street2',
  homeaddress: 'street1',
  homeaddresspobox: 'street2',
  homecity: 'city',
  homestate: 'state',
  homepostalcode: 'zip',
  homecountry: 'country',
  businessstreet: 'street1',
  businessstreet1: 'street1',
  businessstreet2: 'street2',
  businessstreet3: 'street2',
  businessaddress: 'street1',
  businessaddresspobox: 'street2',
  businesscity: 'city',
  businessstate: 'state',
  businesspostalcode: 'zip',
  businesscountry: 'country',
  address1: 'street1',
  address2: 'street2',
  street1: 'street1',
  street2: 'street2',
  apt: 'apt',
  apartment: 'apt',
  city: 'city',
  state: 'state',
  province: 'state',
  zip: 'zip',
  postal: 'zip',
  country: 'country',
  notes: 'notes',
  note: 'notes',
};

/** Best-effort guess of which persons field a CSV header maps to, or '' (skip) if unknown. */
export function autoMapPersonsHeader(header: string): string {
  const raw = (header || '').toLowerCase().trim();
  const key = raw.replace(/[^a-z0-9]/g, '');
  return HEADER_TO_FIELD[key] || '';
}
