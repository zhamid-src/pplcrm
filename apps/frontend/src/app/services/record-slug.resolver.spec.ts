import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { RedirectCommand, convertToParamMap, provideRouter } from '@angular/router';
import { CompaniesService } from '@experiences/companies/services/companies-service';
import { HouseholdsService } from '@experiences/households/services/households-service';
import { PersonsService } from '@experiences/persons/services/persons-service';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { companyRecordIdResolver, householdRecordIdResolver, personRecordIdResolver } from './record-slug.resolver';

describe('record slug resolvers', () => {
  let householdsSvc: { getBySlug: ReturnType<typeof vi.fn> };
  let companiesSvc: { getBySlug: ReturnType<typeof vi.fn> };
  let personsSvc: { getByPublicId: ReturnType<typeof vi.fn> };

  const routeWithId = (id: string) => ({ paramMap: convertToParamMap({ id }) }) as ActivatedRouteSnapshot;

  const run = (resolver: any, id: string) =>
    TestBed.runInInjectionContext(() => resolver(routeWithId(id), {} as any)) as Promise<string | RedirectCommand>;

  beforeEach(() => {
    householdsSvc = { getBySlug: vi.fn() };
    companiesSvc = { getBySlug: vi.fn() };
    personsSvc = { getByPublicId: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: HouseholdsService, useValue: householdsSvc },
        { provide: CompaniesService, useValue: companiesSvc },
        { provide: PersonsService, useValue: personsSvc },
      ],
    });
  });

  describe('households / companies (name-slug lookup)', () => {
    it('passes a numeric id straight through with zero requests', async () => {
      await expect(run(householdRecordIdResolver, '123')).resolves.toBe('123');
      expect(householdsSvc.getBySlug).not.toHaveBeenCalled();
    });

    it('resolves a slug to the numeric record id', async () => {
      householdsSvc.getBySlug.mockResolvedValue({ id: 42 });

      await expect(run(householdRecordIdResolver, 'the-simpsons')).resolves.toBe('42');
      expect(householdsSvc.getBySlug).toHaveBeenCalledWith('the-simpsons');
    });

    it('redirects to the list page when the slug lookup fails', async () => {
      householdsSvc.getBySlug.mockRejectedValue(new Error('not found'));

      const result = await run(householdRecordIdResolver, 'unknown-slug');

      expect(result).toBeInstanceOf(RedirectCommand);
      expect(String((result as RedirectCommand).redirectTo)).toBe('/households');
    });

    it('redirects when the lookup resolves to a record without an id', async () => {
      companiesSvc.getBySlug.mockResolvedValue({});

      const result = await run(companyRecordIdResolver, 'acme');

      expect(result).toBeInstanceOf(RedirectCommand);
      expect(String((result as RedirectCommand).redirectTo)).toBe('/companies');
    });
  });

  describe('persons (opaque public_id lookup)', () => {
    it('passes a numeric id straight through', async () => {
      await expect(run(personRecordIdResolver, '77')).resolves.toBe('77');
      expect(personsSvc.getByPublicId).not.toHaveBeenCalled();
    });

    it('decodes the slug tail into a normalized public id and resolves it', async () => {
      personsSvc.getByPublicId.mockResolvedValue({ id: 9 });

      await expect(run(personRecordIdResolver, 'jordan-4t9k-2xpm')).resolves.toBe('9');
      // decorative name and hyphens stripped, tail normalized to uppercase Crockford
      expect(personsSvc.getByPublicId).toHaveBeenCalledWith('4T9K2XPM');
    });

    it('redirects to the grid for an undecodable segment without any request', async () => {
      const result = await run(personRecordIdResolver, 'julia');

      expect(result).toBeInstanceOf(RedirectCommand);
      expect(String((result as RedirectCommand).redirectTo)).toBe('/people');
      expect(personsSvc.getByPublicId).not.toHaveBeenCalled();
    });

    it('redirects when the public id resolves to nothing', async () => {
      personsSvc.getByPublicId.mockResolvedValue(undefined);

      const result = await run(personRecordIdResolver, 'jordan-4t9k-2xpm');

      expect(result).toBeInstanceOf(RedirectCommand);
      expect(String((result as RedirectCommand).redirectTo)).toBe('/people');
    });
  });
});
