import { describe, it, expect } from 'vitest';
import {
  FORM_EMAIL_FIELD,
  FORM_STANDARD_CATALOG,
  FORM_TEMPLATES,
  FORM_TYPES,
  fieldsForTemplate,
  normForm,
  type FormField,
} from './web-forms.schema';

const CATALOG_KEYS = FORM_STANDARD_CATALOG.map((f) => f.key);

function field(overrides: Partial<FormField> & { key: string }): FormField {
  return { label: overrides.key, type: 'text', on: true, required: false, ...overrides };
}

describe('normForm', () => {
  describe('malformed input', () => {
    it.each([undefined, null, 'not-an-array', 42, {}])('coerces %s into name + email + catalog', (raw) => {
      const fields = normForm(raw);

      expect(fields[0]?.key).toBe('full_name');
      expect(fields[1]?.key).toBe('email');
      expect(fields.slice(2).map((f) => f.key)).toEqual(CATALOG_KEYS);
    });

    it('silently drops legacy string entries and non-conforming objects', () => {
      const fields = normForm([
        'first_name', // legacy donation-form string entry
        { key: 'no_flags', label: 'Missing on/required', type: 'text' }, // fails FormFieldObj
        { key: '', label: 'Empty key', type: 'text', on: true, required: false }, // min(1) violation
        field({ key: 'full_name', label: 'Full name' }),
        field({ key: 'email' }),
        field({ key: 'notes', type: 'area' }),
      ]);

      const keys = fields.map((f) => f.key);
      expect(keys).toEqual(['full_name', 'email', 'notes', ...CATALOG_KEYS]);
    });
  });

  describe('the email identity invariant', () => {
    it('forces an existing email field to on + required without moving it', () => {
      const fields = normForm([
        field({ key: 'full_name' }),
        field({ key: 'notes', type: 'area' }),
        field({ key: 'email', on: false, required: false, help: 'kept' }),
      ]);

      const emailIndex = fields.findIndex((f) => f.key === 'email');
      expect(emailIndex).toBe(2); // position preserved, not re-slotted
      expect(fields[emailIndex]).toMatchObject({ on: true, required: true, help: 'kept' });
    });

    it('splices a missing email field in right after the name field', () => {
      const fields = normForm([field({ key: 'full_name' }), field({ key: 'notes', type: 'area' })]);

      expect(fields[0]?.key).toBe('full_name');
      expect(fields[1]).toEqual(FORM_EMAIL_FIELD);
    });

    it('guarantees a name field at the front when the form lacks one', () => {
      const fields = normForm([field({ key: 'email' })]);

      expect(fields[0]?.key).toBe('full_name');
      expect(fields[0]?.on).toBe(true);
      expect(fields[1]?.key).toBe('email');
    });
  });

  describe('the standard catalog', () => {
    it('appends undefined catalog fields switched off', () => {
      const fields = normForm([field({ key: 'full_name' }), field({ key: 'email' })]);

      for (const key of CATALOG_KEYS) {
        const appended = fields.find((f) => f.key === key);
        expect(appended, key).toBeDefined();
        expect(appended?.on, key).toBe(false);
        expect(appended?.required, key).toBe(false);
      }
    });

    it("keeps a form's own definition of a catalog key instead of duplicating it", () => {
      const fields = normForm([
        field({ key: 'full_name' }),
        field({ key: 'email' }),
        field({ key: 'mobile', label: 'Cell', on: true, required: true }),
      ]);

      const mobiles = fields.filter((f) => f.key === 'mobile');
      expect(mobiles).toHaveLength(1);
      expect(mobiles[0]).toMatchObject({ label: 'Cell', on: true, required: true });
    });
  });
});

describe('fieldsForTemplate', () => {
  it.each(FORM_TYPES)('%s: upholds the email invariant and includes the full catalog', (type) => {
    const fields = fieldsForTemplate(type);

    const email = fields.find((f) => f.key === 'email');
    expect(email).toMatchObject({ on: true, required: true });
    expect(fields[0]?.key).toBe('full_name');
    for (const key of CATALOG_KEYS) {
      expect(
        fields.some((f) => f.key === key),
        key,
      ).toBe(true);
    }
  });

  it('never mutates FORM_TEMPLATES (fresh copies every call)', () => {
    const before = JSON.parse(JSON.stringify(FORM_TEMPLATES));

    for (const type of FORM_TYPES) {
      const fields = fieldsForTemplate(type);
      // mutate the returned copies aggressively
      for (const f of fields) {
        f.on = !f.on;
        f.label = 'clobbered';
      }
    }

    expect(FORM_TEMPLATES).toEqual(before);
  });

  it('returns independent arrays on successive calls', () => {
    const a = fieldsForTemplate('signup');
    const b = fieldsForTemplate('signup');

    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
    expect(a).toEqual(b);
  });
});
