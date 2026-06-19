import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { UserAdminService } from '../services/useradmin-service';
import { AuthService } from '@frontend/auth/auth-service';
import { UserViewComponent } from './user-view';

describe('UserViewComponent', () => {
  let component: UserViewComponent;
  let fixture: ComponentFixture<UserViewComponent>;
  let mockUsersSvc: any;
  let mockAlertSvc: any;
  let mockRouter: any;
  let mockActivatedRoute: any;
  let mockDialogSvc: any;

  beforeEach(async () => {
    mockUsersSvc = {
      getById: vi.fn(),
      delete: vi.fn(),
    };

    mockAlertSvc = {
      showError: vi.fn(),
      showSuccess: vi.fn(),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue('user-123'),
        },
      },
    };

    mockDialogSvc = {
      confirm: vi.fn().mockResolvedValue(true),
    };

    const mockAuthSvc = {
      getUser: vi.fn().mockReturnValue({ id: 'current-user-id', role: 'admin' }),
      resolveAvatarUrl: vi.fn().mockImplementation((url: string | null) => (url ? `resolved-${url}` : null)),
    };

    mockUsersSvc.getById.mockResolvedValue({
      id: 'user-123',
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'editor',
      verified: true,
      stats: {
        emails_assigned: { total: 5, open: 2, closed: 3 },
        contacts_added: { total: 10, last_created_at: new Date('2026-05-19T20:00:00Z') },
        files_imported: { count: 1, total_rows: 50, last_activity_at: new Date('2026-05-19T20:00:00Z') },
        files_exported: { count: 2, total_rows: 100, last_activity_at: new Date('2026-05-19T20:00:00Z') },
      },
    });

    await TestBed.configureTestingModule({
      imports: [UserViewComponent],
      providers: [
        { provide: UserAdminService, useValue: mockUsersSvc },
        { provide: AuthService, useValue: mockAuthSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ConfirmDialogService, useValue: mockDialogSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create and load user details', async () => {
    expect(component).toBeTruthy();
    expect(component['loading']()).toBe(false);
    expect(component['detail']()?.id).toBe('user-123');
    expect(component['displayName']()).toBe('John Doe');
  });

  it('should compute resolved avatarUrl when user has avatar', () => {
    component['detail'].set({
      id: 'user-123',
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'editor',
      verified: true,
      avatar_url: '/uploads/avatar-123.png',
      stats: {} as any,
      created_at: new Date(),
      updated_at: new Date(),
    });
    expect(component['avatarUrl']()).toBe('resolved-/uploads/avatar-123.png');
  });

  it('should return null for avatarUrl when user has no avatar', () => {
    component['detail'].set({
      id: 'user-123',
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'editor',
      verified: true,
      avatar_url: null,
      stats: {} as any,
      created_at: new Date(),
      updated_at: new Date(),
    });
    expect(component['avatarUrl']()).toBeNull();
  });

  it('should navigate to edit view on editUser', () => {
    component['editUser']();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['edit'], { relativeTo: mockActivatedRoute });
  });

  it('should prompt confirm dialog and delete user', async () => {
    mockUsersSvc.delete.mockResolvedValue(true);
    await component['deleteUser']();
    expect(mockDialogSvc.confirm).toHaveBeenCalled();
    expect(mockUsersSvc.delete).toHaveBeenCalledWith('user-123');
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('User deleted');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/users']);
  });
});
