import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { environment } from '../../environments/environment';

/** Site-wide fallback description for any route that doesn't declare its own. */
export const SITE_DESCRIPTION =
  'One shared list for constituents, voters, donors and volunteers — a shared inbox, ' +
  'canvassing, donations, newsletters and field apps on one people-first CRM. Free to start, no card.';

/** The social share card served from the marketing origin (see index.html). */
const OG_IMAGE = `${environment.siteUrl}/assets/og-card.png`;

interface SeoInput {
  /** Full document title; when omitted the current title is kept. */
  readonly title?: string;
  /** Meta description; falls back to {@link SITE_DESCRIPTION}. */
  readonly description?: string;
  /** Absolute path beginning with '/', e.g. '/pricing'. Drives canonical + og:url. */
  readonly path: string;
}

/**
 * Central place that keeps a page's SEO tags in sync: title, meta description,
 * canonical link, and the per-page Open Graph / Twitter title-description-url.
 * Works under prerendering (SSG) because it only touches `Meta`, `Title` and the
 * injected `DOCUMENT` — all of which Angular provides a server DOM for.
 *
 * Most pages are driven automatically by {@link SeoTitleStrategy} from route
 * data; components with dynamic content (e.g. a docs article) can call
 * {@link applyRoute} themselves.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  public applyRoute(input: SeoInput): void {
    const description = input.description ?? SITE_DESCRIPTION;
    const url = this.absoluteUrl(input.path);
    if (input.title) this.title.setTitle(input.title);
    const title = this.title.getTitle();

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ property: 'og:image', content: OG_IMAGE });
    this.meta.updateTag({ name: 'twitter:image', content: OG_IMAGE });
    this.setCanonical(url);
  }

  /**
   * Add or replace a keyed JSON-LD (`application/ld+json`) block in `<head>`.
   * Keyed by `data-seo` so re-running on the same page updates in place instead
   * of appending duplicates (matters for client-side hydration after SSG).
   */
  public setJsonLd(key: string, data: Record<string, unknown>): void {
    const head = this.doc.head;
    if (!head) return;
    const selector = `script[type="application/ld+json"][data-seo="${key}"]`;
    let script = head.querySelector(selector);
    if (!script) {
      script = this.doc.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-seo', key);
      head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }

  private absoluteUrl(path: string): string {
    const clean = path.split(/[?#]/)[0];
    return `${environment.siteUrl}${clean === '' ? '/' : clean}`;
  }

  private setCanonical(url: string): void {
    const head = this.doc.head;
    if (!head) return;
    let link = head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}

/**
 * Router `TitleStrategy` that, on every navigation, applies the route's title
 * and its `data.description` through {@link SeoService}. Registered in
 * `app.config.ts`. Routes with dynamic content still override afterwards from
 * their component (the strategy runs first, the component's effect runs during
 * render), so the most specific value wins.
 */
@Injectable({ providedIn: 'root' })
export class SeoTitleStrategy extends TitleStrategy {
  private readonly seo = inject(SeoService);

  public override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);

    let route = snapshot.root;
    while (route.firstChild) route = route.firstChild;
    const raw: unknown = route.data['description'];
    const description = typeof raw === 'string' ? raw : undefined;

    this.seo.applyRoute({ title, description, path: snapshot.url });
  }
}
