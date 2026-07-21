/**
 * ESLint rule: no-unscoped-db-query
 *
 * Detects Kysely query chains that start with `selectFrom`, `updateTable`, or
 * `deleteFrom` but do NOT include a `.where('tenant_id', ...)` filter before
 * executing — a potential cross-tenant data leak.
 *
 * The rule only checks a single contiguous method chain. If you break a query
 * into intermediate variables the rule won't catch it, but that pattern is
 * uncommon in this codebase and immediately visible in review.
 *
 * ──────────────── What it detects ────────────────
 *
 *   // ❌ Flagged — no tenant_id filter
 *   db.selectFrom('persons').selectAll().execute()
 *
 *   // ✅ OK — tenant filter present
 *   db.selectFrom('persons').selectAll().where('tenant_id', '=', id).execute()
 *
 *   // ✅ OK — table on ignore list (cross-tenant auth lookups are intentional)
 *   db.selectFrom('authusers').where('email', '=', email).executeTakeFirst()
 *
 *   // ✅ OK — suppressed per line
 *   // eslint-disable-next-line local/no-unscoped-db-query
 *   db.selectFrom('sessions').where('session_id', '=', hash).executeTakeFirst()
 *
 * ──────────────── Options ────────────────
 *
 *   ignoreTables: string[]
 *     Tables where cross-tenant queries are intentional (e.g., auth tables
 *     queried by email or code, or the tenants table itself).
 *     Default: ['authusers', 'sessions', 'tenants', 'tags']
 *
 * ──────────────── Configuration example ────────────────
 *
 *   'local/no-unscoped-db-query': ['error', {
 *     ignoreTables: ['authusers', 'sessions', 'tenants', 'tags']
 *   }]
 */
'use strict';

/** Terminal methods that materialise a Kysely query. */
const EXECUTE_METHODS = new Set(['execute', 'executeTakeFirst', 'executeTakeFirstOrThrow', 'stream']);

/** Kysely builder methods that start a write/read chain we want to track. */
const SCOPE_METHODS = new Set(['selectFrom', 'updateTable', 'deleteFrom']);

/**
 * Walk a call-expression chain (right → left) and collect every method call.
 *
 * For `a.b(x).c(y).d(z)` (represented in AST as nested CallExpressions) this
 * returns:
 *   [ { name:'d', args:[z] }, { name:'c', args:[y] }, { name:'b', args:[x] } ]
 */
function collectChain(node) {
  const calls = [];
  let current = node;

  while (current && current.type === 'CallExpression') {
    const callee = current.callee;
    if (callee.type !== 'MemberExpression') break;
    const prop = callee.property;
    if (prop.type !== 'Identifier') break;

    calls.push({ name: prop.name, args: current.arguments, node: current });
    current = callee.object;
  }

  return calls;
}

/**
 * Return true if `arg` is a string literal (or template literal without
 * expressions) whose value includes `needle`.
 */
function stringArgIncludes(arg, needle) {
  if (!arg) return false;
  if (arg.type === 'Literal' && typeof arg.value === 'string') {
    return arg.value.includes(needle);
  }
  // Handle template literal: `tenant_id`
  if (arg.type === 'TemplateLiteral' && arg.expressions.length === 0) {
    return arg.quasis[0]?.value?.cooked?.includes(needle) ?? false;
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require a WHERE tenant_id filter on every Kysely selectFrom / updateTable / deleteFrom query.',
      category: 'Security',
      recommended: false,
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreTables: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingTenantFilter:
        "Kysely query on '{{table}}' has no .where('tenant_id', …) filter. " +
        'Add a tenant_id scope or add this table to the ignoreTables option ' +
        'if the cross-tenant query is intentional.',
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const ignoreTables = new Set(options.ignoreTables ?? ['authusers', 'sessions', 'tenants', 'tags']);

    return {
      CallExpression(node) {
        // We only care about terminal calls (.execute, .executeTakeFirst, …)
        if (node.callee.type !== 'MemberExpression') return;
        const terminal = node.callee.property;
        if (terminal.type !== 'Identifier') return;
        if (!EXECUTE_METHODS.has(terminal.name)) return;

        // Collect the full chain walking backwards from this terminal call
        const chain = collectChain(node);
        // chain[0] is the terminal itself; skip it and look at the rest.

        // Find the scope method (selectFrom / updateTable / deleteFrom)
        const scopeCall = chain.find((c) => SCOPE_METHODS.has(c.name));
        if (!scopeCall) return; // Not a query chain we track

        // Determine the table name from the first argument
        const tableArg = scopeCall.args[0];
        const tableName = tableArg?.type === 'Literal' && typeof tableArg.value === 'string' ? tableArg.value : null;

        // Skip ignored tables
        if (tableName && ignoreTables.has(tableName)) return;

        // Check if any .where() call in the chain references tenant_id
        const hasTenantFilter = chain.some(
          (c) => c.name === 'where' && c.args.length >= 1 && stringArgIncludes(c.args[0], 'tenant_id'),
        );

        if (!hasTenantFilter) {
          context.report({
            node: scopeCall.node,
            messageId: 'missingTenantFilter',
            data: { table: tableName ?? '<unknown>' },
          });
        }
      },
    };
  },
};
