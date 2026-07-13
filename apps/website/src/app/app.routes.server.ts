import { RenderMode, type ServerRoute } from '@angular/ssr';

/**
 * Every marketing route is static, so prerender them all to plain HTML at build
 * time (SSG). No Node server runs in production — the output is a static bundle
 * for Cloudflare Pages.
 */
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Prerender }];
