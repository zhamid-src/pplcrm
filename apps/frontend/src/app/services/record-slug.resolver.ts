import { inject } from '@angular/core';
import type { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { RedirectCommand, Router } from '@angular/router';
import { CompaniesService } from '@experiences/companies/services/companies-service';
import { HouseholdsService } from '@experiences/households/services/households-service';
import { PersonsService } from '@experiences/persons/services/persons-service';

/**
 * Slug-aware `:id` resolvers for the record routes (spec §1: URLs carry record
 * slugs — /people/amira-hassan — never internal IDs).
 *
 * Each resolver is registered as `resolve: { id: … }` on the entity's `:id`
 * routes. With `withComponentInputBinding()`, route *data* wins over path
 * params (`{ ...queryParams, ...params, ...data }`), so the routed component's
 * `id` input always receives the **numeric record id**, whatever the URL says:
 *
 * - numeric param (old /people/123 deep link or an in-app id navigation): the
 *   param passes straight through — zero extra requests; the view then swaps
 *   the address bar to the slug URL via Location.replaceState.
 * - slug param (/people/amira-hassan): one tenant-scoped getBySlug lookup
 *   resolves the id; an unknown slug redirects to the entity's grid instead of
 *   rendering a broken detail page.
 *
 * RecordNavigationService is untouched: grids keep handing off numeric ids and
 * the pager walks them; every hop lands on the slug URL via the view's
 * replaceState. Later waves: reuse `recordSlugResolver` with the entity's
 * service + list route (see docs/RECORD-SLUGS.md).
 */

const NUMERIC_ID = /^\d+$/;

interface SlugLookup {
  getBySlug(slug: string): Promise<unknown>;
}

function recordSlugResolver(
  serviceType: new (...args: never[]) => SlugLookup,
  listUrl: string,
): ResolveFn<string | RedirectCommand> {
  return async (route: ActivatedRouteSnapshot) => {
    const param = route.paramMap.get('id') ?? '';
    if (NUMERIC_ID.test(param)) return param;

    // inject() must run synchronously, before the first await.
    const service = inject(serviceType);
    const router = inject(Router);

    const record: unknown = await service.getBySlug(param).catch(() => undefined);
    if (record != null && typeof record === 'object' && 'id' in record) {
      return String((record as { id: unknown }).id);
    }
    return new RedirectCommand(router.parseUrl(listUrl));
  };
}

export const personRecordIdResolver = recordSlugResolver(PersonsService, '/people');
export const householdRecordIdResolver = recordSlugResolver(HouseholdsService, '/households');
export const companyRecordIdResolver = recordSlugResolver(CompaniesService, '/companies');
