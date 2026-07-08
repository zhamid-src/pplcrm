import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamsGridComponent } from './teams-grid';
import { TeamsService } from '../services/teams-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';

class MockTeamsService {
  getAll = vi.fn().mockResolvedValue({ rows: [], count: 0 });
  abort = vi.fn();
  refreshCount = signal(0);
}

class MockAlertService {
  showError = vi.fn();
  showSuccess = vi.fn();
}

describe('TeamsGridComponent', () => {
  let component: TeamsGridComponent;
  let fixture: ComponentFixture<TeamsGridComponent>;
  let teamsSvc: MockTeamsService;

  beforeEach(async () => {
    teamsSvc = new MockTeamsService();
    await TestBed.configureTestingModule({
      imports: [TeamsGridComponent],
      providers: [
        provideRouter([]),
        { provide: TeamsService, useValue: teamsSvc },
        { provide: AlertService, useValue: new MockAlertService() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamsGridComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map getAll rows into typed team cards on init', async () => {
    teamsSvc.getAll.mockResolvedValueOnce({
      rows: [
        { id: 7, name: 'Door knockers', description: 'Ward 3', team_captain_name: 'Jane Smith', volunteer_count: 12 },
      ],
      count: 1,
    });

    fixture.detectChanges();
    await fixture.whenStable();

    const cards = component['teams']();
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: '7',
      name: 'Door knockers',
      description: 'Ward 3',
      leadName: 'Jane Smith',
      volunteerCount: 12,
    });
  });

  it('should surface a null lead when the team has no captain', async () => {
    teamsSvc.getAll.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Phone bank', description: null, team_captain_name: '', volunteer_count: 0 }],
      count: 1,
    });

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['teams']()[0]?.leadName).toBeNull();
  });

  it('should compute initials from a lead name', () => {
    expect(component['initialsOf']('Jane Smith')).toBe('JS');
    expect(component['initialsOf']('Cher')).toBe('C');
    expect(component['initialsOf']('')).toBe('?');
  });

  it('should mark the feed loaded even when the request fails', async () => {
    teamsSvc.getAll.mockRejectedValueOnce(new Error('boom'));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['loaded']()).toBe(true);
    expect(component['teams']()).toEqual([]);
  });
});
