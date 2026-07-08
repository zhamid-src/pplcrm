import { signal } from '@angular/core';
import { vi } from 'vitest';
import { TeamsService } from './teams-service';

describe('TeamsService', () => {
  let service: TeamsService;
  let mockApi: any;

  const mockTeam = {
    id: 'team-1',
    name: 'Outreach Team',
    description: 'Community Outreach',
    team_captain_id: 'p1',
    team_lead_user_id: 'u1',
    volunteers: [],
    lists: [],
  };

  beforeEach(() => {
    mockApi = {
      teams: {
        add: { mutate: vi.fn() },
        update: { mutate: vi.fn() },
        getAll: { query: vi.fn() },
        getById: { query: vi.fn() },
        getForVolunteer: { query: vi.fn() },
        delete: { mutate: vi.fn() },
      },
    };

    // Create a bare instance without invoking Angular inject()s, matching the
    // house pattern used for other TRPCService-backed services.
    service = Object.create(TeamsService.prototype) as TeamsService;
    (service as any).api = mockApi;
    (service as any).ac = new AbortController();
    (service as any).refreshCount = signal(0);
    (service as any).endpointName = 'teams';
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('CRUD operations', () => {
    it('should add a team', async () => {
      mockApi.teams.add.mutate.mockResolvedValue(mockTeam);

      const result = await service.add({ name: 'Outreach Team' } as any);

      expect(mockApi.teams.add.mutate).toHaveBeenCalledWith({ name: 'Outreach Team' });
      expect(result).toEqual(mockTeam);
    });

    it('should resolve addMany with an empty array without calling the API', async () => {
      const result = await service.addMany([{ name: 'Outreach Team' } as any]);

      expect(result).toEqual([]);
    });

    it('should get a team by id', async () => {
      mockApi.teams.getById.query.mockResolvedValue(mockTeam);

      const result = await service.getById('team-1');

      expect(mockApi.teams.getById.query).toHaveBeenCalledWith('team-1');
      expect(result).toEqual(mockTeam);
    });

    it('should get all teams scoped by the abort signal', async () => {
      const mockResult = { rows: [mockTeam], count: 1 };
      mockApi.teams.getAll.query.mockResolvedValue(mockResult);

      const result = await service.getAll({ startRow: 0, endRow: 25 } as any);

      expect(mockApi.teams.getAll.query).toHaveBeenCalledWith(
        { startRow: 0, endRow: 25 },
        { signal: (service as any).ac.signal },
      );
      expect(result).toEqual(mockResult);
    });

    it('should get the teams a volunteer belongs to, scoped by the abort signal', async () => {
      const mockAssignments = [{ id: 'team-1', name: 'Outreach Team' }];
      mockApi.teams.getForVolunteer.query.mockResolvedValue(mockAssignments);

      const result = await service.getTeamsForVolunteer('p1');

      expect(mockApi.teams.getForVolunteer.query).toHaveBeenCalledWith('p1', {
        signal: (service as any).ac.signal,
      });
      expect(result).toEqual(mockAssignments);
    });

    it('should update a team', async () => {
      const updated = { ...mockTeam, name: 'Updated Outreach Team' };
      mockApi.teams.update.mutate.mockResolvedValue(updated);

      const result = await service.update('team-1', { name: 'Updated Outreach Team' } as any);

      expect(mockApi.teams.update.mutate).toHaveBeenCalledWith({
        id: 'team-1',
        data: { name: 'Updated Outreach Team' },
      });
      expect(result).toEqual(updated);
    });

    it('should delete a team via the inherited AbstractAPIService.delete', async () => {
      mockApi.teams.delete.mutate.mockResolvedValue(true);

      const result = await service.delete('team-1');

      expect(mockApi.teams.delete.mutate).toHaveBeenCalledWith('team-1');
      expect(result).toBe(true);
    });
  });

  describe('Placeholder endpoints', () => {
    it('should count using the returned rowset when it has a count', async () => {
      mockApi.teams.getAll.query.mockResolvedValue({ rows: [], count: 7 });

      await expect(service.count()).resolves.toBe(7);
      expect(mockApi.teams.getAll.query).toHaveBeenCalledWith({ startRow: 0, endRow: 1 });
    });

    it('should count as 0 when the rowset has no count', async () => {
      mockApi.teams.getAll.query.mockResolvedValue({ rows: [], count: undefined });

      await expect(service.count()).resolves.toBe(0);
    });

    it('should resolve getTags with an empty array', async () => {
      await expect(service.getTags('team-1')).resolves.toEqual([]);
    });

    it('should resolve getAllArchived with an empty result set', async () => {
      await expect(service.getAllArchived()).resolves.toEqual({ rows: [], count: 0 });
    });

    it('should resolve attachTag without error', async () => {
      await expect(service.attachTag('team-1', 'donor')).resolves.toBeUndefined();
    });

    it('should resolve detachTag with false', async () => {
      await expect(service.detachTag('team-1', 'donor')).resolves.toBe(false);
    });

    it('should reject exportCsv since team export is unavailable', async () => {
      await expect(service.exportCsv({ scope: 'all' } as any)).rejects.toThrow('Team export is not available');
    });
  });

  describe('Shared refresh signal', () => {
    it('should increment refreshCount when triggerRefresh is called', () => {
      expect(service.refreshCount()).toBe(0);

      service.triggerRefresh();

      expect(service.refreshCount()).toBe(1);
    });
  });

  describe('Error handling', () => {
    it('should propagate errors from getAll', async () => {
      mockApi.teams.getAll.query.mockRejectedValue(new Error('Network error'));

      await expect(service.getAll()).rejects.toThrow('Network error');
    });

    it('should propagate errors from getById', async () => {
      mockApi.teams.getById.query.mockRejectedValue(new Error('Not found'));

      await expect(service.getById('missing')).rejects.toThrow('Not found');
    });
  });
});
