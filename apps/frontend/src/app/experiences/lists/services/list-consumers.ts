/**
 * Builds the delete-confirm body for a list. §8 requires that deleting a list
 * in use names its consumers (newsletters / forms / turfs) so the user knows
 * what the deletion touches before they commit.
 */

interface NamedConsumer {
  name: string;
}

interface ConsumersShape {
  newsletters: NamedConsumer[];
  forms: NamedConsumer[];
  teams: NamedConsumer[];
  total: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function namedList(value: unknown): NamedConsumer[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((r) => ({ name: typeof r['name'] === 'string' ? r['name'] : 'Untitled' }));
}

/** Narrow the tRPC consumers payload to the shape this helper needs. */
export function toConsumers(value: unknown): ConsumersShape {
  if (!isRecord(value)) return { newsletters: [], forms: [], teams: [], total: 0 };
  const newsletters = namedList(value['newsletters']);
  const forms = namedList(value['forms']);
  const teams = namedList(value['teams']);
  return { newsletters, forms, teams, total: newsletters.length + forms.length + teams.length };
}

function joinNames(items: NamedConsumer[]): string {
  return items.map((i) => i.name).join(', ');
}

/**
 * Confirm-dialog body for deleting a list. When the list is in use, each
 * consumer group is named; otherwise a short reassurance that records are safe.
 */
export function buildDeleteConfirmMessage(listName: string, value: unknown): string {
  const { newsletters, forms, teams, total } = toConsumers(value);
  const name = listName.trim() || 'this list';
  if (total === 0) {
    return `Delete ${name}? The people and households in it are not affected — only the list is removed.`;
  }
  const clauses: string[] = [];
  if (newsletters.length) clauses.push(`newsletters (${joinNames(newsletters)})`);
  if (forms.length) clauses.push(`forms (${joinNames(forms)})`);
  if (teams.length) clauses.push(`turfs (${joinNames(teams)})`);
  const used = clauses.join('; ');
  return `${name} is used by ${used}. Deleting it removes the list from those places; the people and households stay. This cannot be undone.`;
}
