function norm(text?: string | null): string {
  const v = (text ?? '').toString().trim().toLowerCase();
  if (!v) return '';
  // Basic punctuation removal, keep letters/numbers/spaces
  let t = v.replace(/[^a-z0-9\s]/g, ' ');

  // Expand common street abbreviations
  const reps: Array<[RegExp, string]> = [
    [/\bst\.?\b/g, 'street'],
    [/\brd\.?\b/g, 'road'],
    [/\bave\.?\b/g, 'avenue'],
    [/\bav\.?\b/g, 'avenue'],
    [/\bblvd\.?\b/g, 'boulevard'],
    [/\bdr\.?\b/g, 'drive'],
    [/\bhwy\.?\b/g, 'highway'],
    [/\bwy\.?\b/g, 'way'],
    [/\bln\.?\b/g, 'lane'],
    [/\bct\.?\b/g, 'court'],
    [/\bcir\.?\b/g, 'circle'],
    [/\bpl\.?\b/g, 'place'],
    [/\bter\.?\b/g, 'terrace'],
    [/\bpkwy\.?\b/g, 'parkway'],
    // Directions
    [/\bn\b/g, 'north'],
    [/\bs\b/g, 'south'],
    [/\be\b/g, 'east'],
    [/\bw\b/g, 'west'],
  ];
  for (const [re, to] of reps) t = t.replace(re, to);

  // Collapse whitespace
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t;
}

export function fingerprintStreet(input: {
  street_num?: string | null;
  street1?: string | null;
  street2?: string | null;
}): string | null {
  const parts = [norm(input.street_num), norm(input.street1), norm(input.street2)].filter(Boolean);
  if (!parts.length) return null;
  return parts.join(' ');
}

export function fingerprintFull(input: {
  apt?: string | null;
  street_num?: string | null;
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
}): string | null {
  const parts = [
    norm(input.apt),
    norm(input.street_num),
    norm(input.street1),
    norm(input.street2),
    norm(input.city),
    norm(input.state),
    norm(input.zip),
    norm(input.country),
  ].filter(Boolean);
  if (!parts.length) return null;
  return parts.join(' ');
}

export function isBlankAddress(input: {
  home_phone?: string | null;
  street_num?: string | null;
  street1?: string | null;
  street2?: string | null;
  apt?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
}): boolean {
  const fields = [
    input.home_phone,
    input.street_num,
    input.street1,
    input.street2,
    input.apt,
    input.city,
    input.state,
    input.zip,
    input.country,
  ];
  return fields.every((v) => !v || (v + '').trim().length === 0);
}

export function isIncompleteAddress(input: {
  street1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): boolean {
  const street1 = (input.street1 ?? '').trim();
  const city = (input.city ?? '').trim();
  const zip = (input.zip ?? '').trim();

  return !street1 || (!city && !zip);
}
