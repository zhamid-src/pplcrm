import { RenderMode, type ServerRoute } from '@angular/ssr';

import { HELP_ARTICLES } from '@common';

/**
 * Every marketing route is static, so prerender them all to plain HTML at build
 * time (SSG). No Node server runs in production — the output is a static bundle
 * for Cloudflare Pages.
 *
 * The `**` wildcard prerenders every fixed path but cannot enumerate the
 * parameterized `/docs/:id`, so that route is listed explicitly with a
 * `getPrerenderParams` that yields one entry per help article — every article
 * is emitted to static HTML at build.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'docs/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: (): Promise<Record<string, string>[]> =>
      Promise.resolve(HELP_ARTICLES.map((article) => ({ id: article.id }))),
  },
  { path: '**', renderMode: RenderMode.Prerender },
];
