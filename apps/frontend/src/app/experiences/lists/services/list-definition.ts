import type { QueryBuilderGroupNode, QueryBuilderNode } from '../../../../../../../libs/common/src';

/**
 * Render a list's stored rule `definition` as the human "DEFINITION" sentence
 * shown in the Lists table (§8) — e.g. "Tags is 'donor' and City contains
 * 'Ottawa'". Static lists with a hand-picked membership (no rules) read as
 * "Hand-picked members"; an empty rule set reads as "Everyone".
 */

const FIELD_LABELS: Record<string, string> = {
  tags: 'Tags',
  issues: 'Issues',
  first_name: 'First name',
  last_name: 'Last name',
  email: 'Email',
  mobile: 'Mobile',
  company_name: 'Company',
  city: 'City',
  state: 'State/Province',
  street1: 'Street 1',
  street2: 'Street 2',
  street_num: 'Street number',
  zip: 'Zip code',
  home_phone: 'Home phone',
};

const OP_LABELS: Record<string, string> = {
  eq: 'is',
  neq: 'is not',
  equals: 'equals',
  notEquals: 'does not equal',
  contains: 'contains',
  notContains: 'does not contain',
  startsWith: 'starts with',
  endsWith: 'ends with',
  isEmpty: 'is empty',
  isNotEmpty: 'is not empty',
  empty: 'is empty',
  notempty: 'is not empty',
};

const VALUELESS_OPS = new Set(['isEmpty', 'isNotEmpty', 'empty', 'notempty']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, ' ');
}

function opLabel(op: string): string {
  return OP_LABELS[op] ?? op;
}

function describeNode(node: QueryBuilderNode): string {
  if (node.kind === 'rule') {
    const label = fieldLabel(node.field);
    const op = opLabel(node.op);
    if (VALUELESS_OPS.has(node.op)) return `${label} ${op}`;
    const value = node.value == null || String(node.value).trim() === '' ? '…' : String(node.value);
    return `${label} ${op} '${value}'`;
  }
  return describeGroup(node);
}

function describeGroup(group: QueryBuilderGroupNode): string {
  if (!group.rules?.length) return 'Everyone';
  const joiner = group.conjunction === 'OR' ? ' or ' : ' and ';
  const parts = group.rules.map(describeNode);
  return parts.join(joiner);
}

function asGroup(value: unknown): QueryBuilderGroupNode | null {
  if (!isRecord(value)) return null;
  if (value['kind'] !== 'group' || !Array.isArray(value['rules'])) return null;
  const conjunction = value['conjunction'] === 'OR' ? 'OR' : 'AND';
  return { kind: 'group', id: String(value['id'] ?? 'root'), conjunction, rules: value['rules'] as QueryBuilderNode[] };
}

/** Human sentence for a list's rule definition; `null` inputs read as hand-picked. */
export function describeListDefinition(definition: unknown): string {
  if (!isRecord(definition)) return 'Hand-picked members';
  const group = asGroup(definition['advancedFilterModel']);
  if (!group) return 'Hand-picked members';
  if (!group.rules.length) return 'Everyone';
  return describeGroup(group);
}
