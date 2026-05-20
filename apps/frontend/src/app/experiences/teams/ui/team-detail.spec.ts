import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { PersonsService } from '../../persons/services/persons-service';
import { TeamsService } from '../services/teams-service';
import { TeamDetailComponent } from './team-detail';

describe('TeamDetailComponent', () => {
  let component: TeamDetailComponent;
  let fixture: ComponentFixture<TeamDetailComponent>;
  let mockTeamsSvc: any;
  let mockPersonsSvc: any;
  let mockAlertSvc: any;
  let mockRouter: any;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockTeamsSvc = {
      getById: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      triggerRefresh: vi.fn()
    };

    mockPersonsSvc = {
      getAll: vi.fn().mockResolvedValue({
        rows: [
          { id: 'p1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
          { id: 'p2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' }
        ],
        count: 2
      })
    };

    mockAlertSvc = {
      showError: vi.fn(),
      showSuccess: vi.fn()
    };

    mockRouter = {
      navigate: vi.fn()
    };

    mockActivatedRoute = {
      snapshot: {
        data: { mode: 'edit' },
        paramMap: {
          get: vi.fn().mockReturnValue('team-123')
        }
      }
    };
  });

  async function createComponent() {
    await TestBed.configureTestingModule({
      imports: [TeamDetailComponent],
      providers: [
        { provide: TeamsService, useValue: mockTeamsSvc },
        { provide: PersonsService, useValue: mockPersonsSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TeamDetailComponent);
    component = fixture.componentInstance;
  }

  it('should initialize and load a team in edit mode', async () => {
    const mockTeam = {
      id: 'team-123',
      name: 'Outreach Team',
      description: 'Community Outreach',
      team_captain_id: 'p1',
      volunteers: [
        { id: 'p1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
      ]
    };
    mockTeamsSvc.getById.mockResolvedValue(mockTeam);

    await createComponent();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['isNew']()).toBe(false);
    expect(mockTeamsSvc.getById).toHaveBeenCalledWith('team-123');
    expect(component['payload']()).toEqual({
      name: 'Outreach Team',
      description: 'Community Outreach',
      team_captain_id: 'p1',
      volunteer_ids: ['p1']
    });
    expect(component['volunteers']()).toEqual(mockTeam.volunteers);
  });

  it('should initialize empty form in new mode', async () => {
    mockActivatedRoute.snapshot.data.mode = 'new';

    await createComponent();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['isNew']()).toBe(true);
    expect(mockTeamsSvc.getById).not.toHaveBeenCalled();
    expect(component['payload']()).toEqual({
      name: '',
      description: '',
      team_captain_id: '',
      volunteer_ids: []
    });
  });

  it('should validate form and prevent saving if invalid', async () => {
    mockActivatedRoute.snapshot.data.mode = 'new';
    await createComponent();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['form']().invalid()).toBe(true);

    await component['save']();
    expect(mockTeamsSvc.add).not.toHaveBeenCalled();
  });

  it('should call add and navigate on successful save in new mode', async () => {
    mockActivatedRoute.snapshot.data.mode = 'new';
    mockTeamsSvc.add.mockResolvedValue({ id: 'new-team-id' });

    await createComponent();
    fixture.detectChanges();
    await fixture.whenStable();

    component['payload'].set({
      name: 'New Team',
      description: 'Brand new focus',
      team_captain_id: 'p2',
      volunteer_ids: ['p1', 'p2']
    });

    await component['save']();

    expect(mockTeamsSvc.add).toHaveBeenCalledWith({
      name: 'New Team',
      description: 'Brand new focus',
      team_captain_id: 'p2',
      volunteer_ids: ['p1', 'p2']
    });
    expect(mockTeamsSvc.triggerRefresh).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: mockActivatedRoute });
  });

  it('should call update and show success alert on successful save in edit mode', async () => {
    const mockTeam = {
      id: 'team-123',
      name: 'Outreach Team',
      description: 'Community Outreach',
      team_captain_id: 'p1',
      volunteers: []
    };
    mockTeamsSvc.getById.mockResolvedValue(mockTeam);
    mockTeamsSvc.update.mockResolvedValue({
      ...mockTeam,
      name: 'Updated Outreach Team'
    });

    await createComponent();
    fixture.detectChanges();
    await fixture.whenStable();

    component['payload'].set({
      name: 'Updated Outreach Team',
      description: 'Community Outreach',
      team_captain_id: 'p1',
      volunteer_ids: []
    });

    await component['save']();

    expect(mockTeamsSvc.update).toHaveBeenCalledWith('team-123', {
      name: 'Updated Outreach Team',
      description: 'Community Outreach',
      team_captain_id: 'p1',
      volunteer_ids: []
    });
    expect(mockTeamsSvc.triggerRefresh).toHaveBeenCalled();
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Team updated');
  });

  it('should trigger deletion, refresh, and navigate back on deleteTeam', async () => {
    const mockTeam = {
      id: 'team-123',
      name: 'Outreach Team',
      description: 'Community Outreach',
      team_captain_id: '',
      volunteers: []
    };
    mockTeamsSvc.getById.mockResolvedValue(mockTeam);
    mockTeamsSvc.delete.mockResolvedValue(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await createComponent();
    fixture.detectChanges();
    await fixture.whenStable();

    await component['deleteTeam']();

    expect(window.confirm).toHaveBeenCalledWith('Delete this team?');
    expect(mockTeamsSvc.delete).toHaveBeenCalledWith('team-123');
    expect(mockTeamsSvc.triggerRefresh).toHaveBeenCalled();
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Team deleted');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: mockActivatedRoute });
  });

  it('should clean up invalid captain/volunteers when people options change', async () => {
    mockActivatedRoute.snapshot.data.mode = 'new';
    await createComponent();
    fixture.detectChanges();
    await fixture.whenStable();

    // Set valid selections
    component['payload'].set({
      name: 'Team with options',
      description: '',
      team_captain_id: 'p1',
      volunteer_ids: ['p1', 'p2']
    });

    // Verify selections are correct initially
    expect(component['payload']().team_captain_id).toBe('p1');
    expect(component['payload']().volunteer_ids).toEqual(['p1', 'p2']);

    // Change people options: remove p1, keep only p2
    component['signalPeople'].set([
      { id: 'p2', label: 'Jane Smith', email: 'jane@example.com' }
    ]);

    fixture.detectChanges();

    // The effect should trigger and update the payload to clean invalid choices
    expect(component['payload']().team_captain_id).toBe('');
    expect(component['payload']().volunteer_ids).toEqual(['p2']);
  });
});
