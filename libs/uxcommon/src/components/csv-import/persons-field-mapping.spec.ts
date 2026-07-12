import { describe, expect, it } from 'vitest';

import { PERSONS_MAPPABLE_FIELDS, autoMapPersonsHeader } from './persons-field-mapping';

describe('autoMapPersonsHeader', () => {
  it('maps common name/email/phone header spellings regardless of case and punctuation', () => {
    expect(autoMapPersonsHeader('First Name')).toBe('first_name');
    expect(autoMapPersonsHeader('SURNAME')).toBe('last_name');
    expect(autoMapPersonsHeader('Middle Name(s)')).toBe('middle_names');
    expect(autoMapPersonsHeader('E-mail Address')).toBe('email');
    expect(autoMapPersonsHeader('Secondary Email')).toBe('email2');
    expect(autoMapPersonsHeader('Phone')).toBe('mobile');
    expect(autoMapPersonsHeader('Cell Phone')).toBe('mobile');
  });

  it('maps address header variants onto the household address fields', () => {
    expect(autoMapPersonsHeader('Street Address')).toBe('street1');
    expect(autoMapPersonsHeader('Address Line 2')).toBe('street2');
    expect(autoMapPersonsHeader('Postal Code')).toBe('zip');
    expect(autoMapPersonsHeader('Zip Code')).toBe('zip');
    expect(autoMapPersonsHeader('Province')).toBe('state');
  });

  it('maps company and tags columns', () => {
    expect(autoMapPersonsHeader('Company')).toBe('company');
    expect(autoMapPersonsHeader('Organization')).toBe('company');
    expect(autoMapPersonsHeader('Employer')).toBe('company');
    expect(autoMapPersonsHeader('Tags')).toBe('tags');
    expect(autoMapPersonsHeader('Tag')).toBe('tags');
  });

  it('returns "" (skip) for unknown headers', () => {
    expect(autoMapPersonsHeader('Favourite colour')).toBe('');
    expect(autoMapPersonsHeader('')).toBe('');
  });

  it('only ever maps onto fields the wizard offers in its dropdown', () => {
    const targets = ['First Name', 'Phone', 'Company', 'Tags', 'Postal Code', 'Notes'].map(autoMapPersonsHeader);
    for (const t of targets) {
      expect(PERSONS_MAPPABLE_FIELDS).toContain(t);
    }
  });
});
