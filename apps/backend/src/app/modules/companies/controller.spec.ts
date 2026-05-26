import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompaniesController } from './controller';

describe('CompaniesController', () => {
  let controller: CompaniesController;

  beforeEach(() => {
    controller = new CompaniesController();
    vi.restoreAllMocks();
  });

  it('should call addCompany and add record to repository', async () => {
    const auth = { tenant_id: 'tenant-1', user_id: 'user-1' } as any;
    const payload = {
      name: 'Acme Corp',
      description: 'An Acme company',
      website: 'acme.corp',
      email: 'info@acme.corp',
      phone: '123-456-7890',
      industry: 'Manufacturing',
      notes: 'Some notes',
    };

    const mockCompany = { id: '123', ...payload, tenant_id: 'tenant-1' };
    const spy = vi.spyOn(controller, 'add').mockResolvedValue(mockCompany as any);

    const result = await controller.addCompany(payload, auth);

    expect(spy).toHaveBeenCalledWith({
      name: 'Acme Corp',
      description: 'An Acme company',
      website: 'acme.corp',
      email: 'info@acme.corp',
      phone: '123-456-7890',
      industry: 'Manufacturing',
      notes: 'Some notes',
      tenant_id: 'tenant-1',
      createdby_id: 'user-1',
      updatedby_id: 'user-1',
    });
    expect(result).toEqual(mockCompany);
  });

  it('should call updateCompany and update record in repository', async () => {
    const auth = { tenant_id: 'tenant-1', user_id: 'user-1' } as any;
    const updatePayload = {
      name: 'Acme Corp Updated',
    };

    const mockUpdatedCompany = { id: '123', name: 'Acme Corp Updated', tenant_id: 'tenant-1' };
    const spy = vi.spyOn(controller, 'update').mockResolvedValue(mockUpdatedCompany as any);

    const result = await controller.updateCompany('123', updatePayload, auth);

    expect(spy).toHaveBeenCalledWith({
      tenant_id: 'tenant-1',
      id: '123',
      row: {
        name: 'Acme Corp Updated',
        updatedby_id: 'user-1',
      },
    });
    expect(result).toEqual(mockUpdatedCompany);
  });

  it('should call getAllCompanies and list records from repository', async () => {
    const auth = { tenant_id: 'tenant-1', user_id: 'user-1' } as any;
    const mockCompanies = [{ id: '123', name: 'Acme Corp' }];
    const spy = vi.spyOn(controller, 'getAllWithCounts').mockResolvedValue({ rows: mockCompanies, count: mockCompanies.length } as any);

    const result = await controller.getAllCompanies(auth, { limit: 10 });

    expect(spy).toHaveBeenCalledWith('tenant-1', { limit: 10 });
    expect(result).toEqual({ rows: mockCompanies, count: mockCompanies.length });
  });
});
