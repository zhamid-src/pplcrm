import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PersonView } from './person-view';
import { UserService } from '../../../services/user.service';
import { PersonsService } from '../services/persons-service';
import { HouseholdsService } from '../../households/services/households-service';
import { VolunteerService } from '../../../services/api/volunteer-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityService } from '@experiences/activity/services/activity.service';

describe('PersonView', () => {
  let component: PersonView;
  let fixture: ComponentFixture<PersonView>;

  let mockAlertSvc: any;
  let mockUserService: any;
  let mockHouseholdsSvc: any;
  let mockPersonsSvc: any;
  let mockVolunteerSvc: any;
  let mockRoute: any;
  let mockRouter: any;
  let mockActivitySvc: any;

  beforeEach(async () => {
    mockAlertSvc = {
      showError: vi.fn(),
      showSuccess: vi.fn(),
      showInfo: vi.fn(),
    };

    mockUserService = {
      getUsers: vi.fn().mockResolvedValue([{ id: 'u1', first_name: 'Admin' }]),
    };

    mockHouseholdsSvc = {
      getById: vi.fn().mockResolvedValue({ street_num: '123', street1: 'Main St', city: 'City', state: 'NY' }),
    };

    mockActivitySvc = {
      getActivities: vi.fn().mockResolvedValue({ rows: [], totalCount: 0 }),
    };

    mockPersonsSvc = {
      getById: vi.fn().mockResolvedValue({
        id: 'p1',
        first_name: 'John',
        middle_names: 'A',
        last_name: 'Doe',
        company_name: 'Acme Corp',
        linkedin: 'https://linkedin.com/in/johndoe',
      }),
      getTags: vi.fn().mockImplementation((id, type) => {
        if (type === 'tag') return Promise.resolve(['volunteer', 'donor']);
        return Promise.resolve(['environment']);
      }),
      getActivity: vi.fn().mockResolvedValue({
        emails: [{ id: 'e1', subject: 'Hello', from_email: 'john@example.com', to_email: 'admin@pplcrm.com' }],
        newsletters: [{ id: 'ne1', event_type: 'open', newsletter_subject: 'Newsletter #1' }],
      }),
    };

    mockVolunteerSvc = {
      getVolunteerStats: vi.fn().mockResolvedValue({ shifts_count: 5, total_hours: 15.5 }),
      getHistoryForPerson: vi.fn().mockResolvedValue([{ id: 's1', event_name: 'Cleanup', status: 'attended' }]),
    };

    mockRoute = {
      snapshot: {
        paramMap: {
          get: vi.fn((key: string) => (key === 'id' ? 'p1' : null)),
        },
      },
    };

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    await TestBed.configureTestingModule({
      imports: [PersonView],
      providers: [
        provideRouter([]),
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: UserService, useValue: mockUserService },
        { provide: HouseholdsService, useValue: mockHouseholdsSvc },
        { provide: PersonsService, useValue: mockPersonsSvc },
        { provide: VolunteerService, useValue: mockVolunteerSvc },
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: ActivityService, useValue: mockActivitySvc },
      ],
    }).compileComponents();

    mockRouter = TestBed.inject(Router);
    vi.spyOn(mockRouter, 'navigate').mockResolvedValue(true as any);

    fixture = TestBed.createComponent(PersonView);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'p1');
    fixture.detectChanges();
  });

  it('should load all details and activities on init', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component['id']()).toBe('p1');
    expect(mockPersonsSvc.getById).toHaveBeenCalledWith('p1');
    expect(mockPersonsSvc.getTags).toHaveBeenCalledWith('p1', 'tag');
    expect(mockPersonsSvc.getTags).toHaveBeenCalledWith('p1', 'issue');
    expect(mockPersonsSvc.getActivity).toHaveBeenCalledWith('p1');
    expect(mockVolunteerSvc.getVolunteerStats).toHaveBeenCalledWith('p1');

    expect(component['fullName']()).toBe('John A Doe');
    expect(component['initials']()).toBe('JD');
    expect(component['tags']()).toContain('volunteer');
    expect(component['issues']()).toContain('environment');
    expect(component['activityData']().emails).toHaveLength(1);
    expect(component['activityData']().newsletters).toHaveLength(1);
  });

  it('should copy text to clipboard and show success alert', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    component['copyToClipboard']('john@example.com', 'Email');
    await new Promise((r) => setTimeout(r, 10));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('john@example.com');
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Email copied to clipboard');
  });
});
