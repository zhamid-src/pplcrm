/**
 * Route classification shared by both apps' rich-text renderers.
 *
 * `parseHelpInline` only emits links whose target starts with `/`, so every
 * route reaching `classifyHelpRoute` is an internal one. This splits those
 * into in-help article links versus any other in-app route, letting each app
 * route them through its own navigation (in-help router vs. cross-app link).
 */

export type HelpRouteTarget =
  | { kind: 'help'; id: string } // an in-help article link, e.g. /help/dashboard -> id 'dashboard'
  | { kind: 'app'; path: string }; // any other internal app route, e.g. /people

const HELP_ROUTE = /^\/help\/(.+)$/;

/**
 * Classifies an internal route (always starting with `/`): `/help/:id` links
 * become `{ kind: 'help', id }`, everything else `{ kind: 'app', path }`.
 */
export function classifyHelpRoute(route: string): HelpRouteTarget {
  const id = HELP_ROUTE.exec(route)?.[1];
  if (id !== undefined) {
    return { kind: 'help', id };
  }
  return { kind: 'app', path: route };
}
