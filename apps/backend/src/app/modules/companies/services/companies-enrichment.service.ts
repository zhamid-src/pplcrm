import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Models } from '../../../../../../../libs/common/src/lib/kysely.models';
import { env } from '../../../../env';

export class CompaniesEnrichmentService {
  constructor(private readonly db: Kysely<Models>) {}

  public async enrichCompany(companyId: string, tenantId: string): Promise<void> {
    const company = await this.db
      .selectFrom('companies')
      .selectAll()
      .where('id', '=', companyId as any)
      .where('tenant_id', '=', tenantId as any)
      .executeTakeFirst();

    if (!company) {
      console.warn(`Company enrichment skipped: Company ${companyId} not found.`);
      return;
    }

    // Check if already enriched
    let currentJson: any = {};
    if (company.json) {
      currentJson = typeof company.json === 'string' ? JSON.parse(company.json) : company.json;
    }
    if (currentJson?.google_enriched) {
      console.log(`Company ${companyId} is already enriched from Google. Skipping.`);
      return;
    }

    const apiKey = env.googleMapsApiKey;
    const isMockOrTest = !apiKey || apiKey.includes('mock') || process.env['NODE_ENV'] === 'test';

    let description: string | null = null;
    let website: string | null = null;
    let phone: string | null = null;
    let industry: string | null = null;
    let rawResult: any = null;

    if (!isMockOrTest) {
      try {
        // Step 1: Text Search to find the Place ID
        const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(company.name)}&key=${apiKey}`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) {
          throw new Error(`Google Places Text Search returned status ${searchRes.status}`);
        }
        const searchData: any = await searchRes.json();

        if (searchData.status === 'OK' && searchData.results && searchData.results.length > 0) {
          const firstResult = searchData.results[0];
          const placeId = firstResult.place_id;

          // Step 2: Fetch Place Details for that Place ID
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,website,international_phone_number,formatted_phone_number,editorial_summary,types&key=${apiKey}`;
          const detailsRes = await fetch(detailsUrl);
          if (!detailsRes.ok) {
            throw new Error(`Google Places Details returned status ${detailsRes.status}`);
          }
          const detailsData: any = await detailsRes.json();

          if (detailsData.status === 'OK' && detailsData.result) {
            const res = detailsData.result;
            rawResult = res;
            website = res.website || null;
            phone = res.formatted_phone_number || res.international_phone_number || null;
            description = res.editorial_summary?.overview || null;

            if (res.types && res.types.length > 0) {
              const rawType = res.types[0];
              industry = rawType
                .replace(/_/g, ' ')
                .split(' ')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            }
          }
        }
      } catch (err) {
        console.error(`Google Places API enrichment failed for company ${companyId}:`, err);
        throw err;
      }
    } else {
      // Mock enrichment for testing/dev
      const cleanName = company.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      website = `https://www.${cleanName || 'company'}.com`;
      phone = '+1 555-0199';
      description = `Mock description for ${company.name} from Google Places.`;
      industry = company.industry || 'Technology';
      rawResult = { mock: true };
      console.log(`Mock Google enrichment completed for company ${companyId}`);
    }

    const updatedJson = {
      ...currentJson,
      google_enriched: true,
      place_details: rawResult,
    };

    const updatePayload: any = {
      json: JSON.stringify(updatedJson),
      updated_at: new Date(),
    };

    if (!company.website || company.website.trim() === '') {
      updatePayload.website = website;
    }
    if (!company.phone || company.phone.trim() === '') {
      updatePayload.phone = phone;
    }
    if (!company.description || company.description.trim() === '') {
      updatePayload.description = description;
    }
    if (!company.industry || company.industry.trim() === '') {
      updatePayload.industry = industry;
    }

    await this.db
      .updateTable('companies')
      .set(updatePayload)
      .where('id', '=', companyId as any)
      .where('tenant_id', '=', tenantId as any)
      .execute();
  }

  public async queueUnenrichedCompanies(tenantId?: string): Promise<number> {
    let query = this.db
      .selectFrom('companies')
      .select(['id', 'tenant_id'])
      .where((eb) => eb.or([eb('json', 'is', null), sql<boolean>`json->>'google_enriched' is null`]));

    if (tenantId) {
      query = query.where('tenant_id', '=', tenantId as any);
    }

    const unenriched = await query.execute();
    if (unenriched.length === 0) return 0;

    const values = unenriched.map((c) => ({
      tenant_id: c.tenant_id,
      queue: 'default',
      status: 'pending',
      payload: JSON.stringify({
        type: 'enrich_company_google',
        company_id: String(c.id),
        tenant_id: String(c.tenant_id),
      }),
      run_at: new Date(),
      max_attempts: 3,
    }));

    await this.db
      .insertInto('background_jobs' as any)
      .values(values as any)
      .execute();

    return unenriched.length;
  }
}
