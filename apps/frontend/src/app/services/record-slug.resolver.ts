import { inject } from '@angular/core';
import type { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { RedirectCommand, Router } from '@angular/router';
import { extractPublicIdFromSlug } from '@common';
import { CompaniesService } from '@experiences/companies/services/companies-service';
import { HouseholdsService } from '@experiences/households/services/households-service';
import { PersonsService } from '@experiences/persons/services/persons-service';

/**
 * Slug-aware `:id` resolvers for the record routes (spec §1: URLs carry record
 * slugs — never internal IDs).
 *
 * Each resolver is registered as `resolve: { id: … }` on the entity's `:id`
 * routes. With `withComponentInputBinding()`, route *data* wins over path
 * params (`{ ...queryParams, ...params, ...data }`), so the routed component's
 * `id` input always receives the **numeric record id**, whatever the URL says.
 * A numeric param (old /people/123 deep link or an in-app id navigation) passes
 * straight through — zero extra requests; the view then swaps the address bar
 * to the slug URL via Location.replaceState. RecordNavigationService is
 * untouched: grids keep handing off numeric ids and the pager walks them.
 *
 * Persons and households/companies differ in how a non-numeric segment is
 * resolved (see below), because persons use an opaque public_id while
 * households/companies use a name slug — docs/RECORD-SLUGS.md.
 */

const NUMERIC_ID = /^\d+$/;

interface SlugLookup {
  getBySlug(slug: string): Promise<unknown>;
}

function idOf(record: unknown): string | null {
  if (record != null && typeof record === 'object' && 'id' in record) {
    return String((record as { id: unknown }).id);
  }
  return null;
}

/** Households/companies: one tenant-scoped getBySlug lookup by name slug. */
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
    return idOf(record) ?? new RedirectCommand(router.parseUrl(listUrl));
  };
}

/**
 * Persons resolve by opaque public_id (spec §1). The URL segment is
 * `{name}-{xxxx}-{xxxx}`; decode strips the decorative name and hyphens, takes
 * the last 8 Crockford chars, and resolves tenant-scoped. A bare id or a
 * hyphen-split id both resolve; an undecodable segment redirects to the grid.
 */
export const personRecordIdResolver: ResolveFn<string | RedirectCommand> = async (route: ActivatedRouteSnapshot) => {
  const param = route.paramMap.get('id') ?? '';
  if (NUMERIC_ID.test(param)) return param;

  // inject() must run synchronously, before the first await.
  const service = inject(PersonsService);
  const router = inject(Router);

  const publicId = extractPublicIdFromSlug(param);
  if (publicId == null) return new RedirectCommand(router.parseUrl('/people'));

  const record: unknown = await service.getByPublicId(publicId).catch(() => undefined);
  return idOf(record) ?? new RedirectCommand(router.parseUrl('/people'));
};

export const householdRecordIdResolver = recordSlugResolver(HouseholdsService, '/households');
export const companyRecordIdResolver = recordSlugResolver(CompaniesService, '/companies');
