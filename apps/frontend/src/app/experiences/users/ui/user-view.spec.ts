import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { UserAdminService } from '../services/useradmin-service';
import { AuthService } from '@frontend/auth/auth-service';
import { UserViewComponent } from './user-view';

const STATS = {
  emails_assigned: { total: 5, open: 2, closed: 3 },
  contacts_added: { total: 10, last_created_at: new Date('2026-05-19T20:00:00Z') },
  files_imported: { count: 1, total_rows: 50, last_activity_at: new Date('2026-05-19T20:00:00Z') },
  files_exported: { count: 2, total_rows: 100, last_activity_at: new Date('2026-05-19T20:00:00Z') },
};

function userDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-123',
    email: 'john@example.com',
    first_name: 'John',
    last_name: 'Doe',
    role: 'user',
    verified: true,
    two_factor_enabled: false,
    deletion_scheduled_at: null,
    deactivated_at: null,
    created_at: new Date('2026-06-25T12:00:00Z'),
    updated_at: new Date('2026-07-04T12:00:00Z'),
    stats: STATS,
    ...overrides,
  };
}

describe('UserViewComponent (merged view + edit)', () => {
  let component: UserViewComponent;
  let fixture: ComponentFixture<UserViewComponent>;
  let mockUsersSvc: any;
  let mockAlertSvc: any;
  let mockRouter: any;
  let mockDialogSvc: any;
  let mockAuthSvc: any;

  async function setup(detail = userDetail(), currentUser = { id: 'current-user-id', role: 'owner' }) {
    // Some tests re-run setup with a different user/viewer; the module must be reset first.
    TestBed.resetTestingModule();
    mockUsersSvc = {
      getById: vi.fn().mockResolvedValue(detail),
      update: vi.fn().mockResolvedValue(detail),
      delete: vi.fn(),
      deactivate: vi.fn().mockResolvedValue({ success: true }),
      reactivate: vi.fn().mockResolvedValue({ success: true }),
      resendInvite: vi.fn().mockResolvedValue({ success: true }),
      adminTriggerPasswordReset: vi.fn().mockResolvedValue({ success: true }),
      triggerRefresh: vi.fn(),
    };
    mockAlertSvc = { showError: vi.fn(), showSuccess: vi.fn() };
    mockRouter = { navigate: vi.fn() };
    mockDialogSvc = { confirm: vi.fn().mockResolvedValue(true) };
    mockAuthSvc = { getUser: vi.fn().mockReturnValue(currentUser) };

    await TestBed.configureTestingModule({
      imports: [UserViewComponent],
      providers: [
        { provide: UserAdminService, useValue: mockUsersSvc },
        { provide: AuthService, useValue: mockAuthSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: vi.fn().mockReturnValue('user-123') } } } },
        { provide: ConfirmDialogService, useValue: mockDialogSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserViewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'user-123');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await setup();
  });

  it('should load the user and seed the identity form', () => {
    expect(component['detail']()?.id).toBe('user-123');
    expect(component['displayName']()).toBe('John Doe');
    expect(component['payload']()).toEqual({ email: 'john@example.com', first_name: 'John', last_name: 'Doe' });
    expect(component['status']()?.label).toBe('Active');
  });

  it('should save identity fields in place and reload', async () => {
    component['payload'].set({ email: 'john@example.com', first_name: 'Johnny', last_name: ' Doe ' });
    await component['save']();
    expect(mockUsersSvc.update).toHaveBeenCalledWith('user-123', {
      email: 'john@example.com',
      first_name: 'Johnny',
      last_name: 'Doe',
    });
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('User updated');
    expect(mockUsersSvc.triggerRefresh).toHaveBeenCalled();
  });

  it('should apply a role change instantly without touching the identity form', async () => {
    const select = { value: 'admin' };
    await component['changeRole']({ target: select } as unknown as Event);
    expect(mockUsersSvc.update).toHaveBeenCalledWith('user-123', { role: 'admin' });
    expect(component['detail']()?.role).toBe('admin');
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Role updated. John Doe is now Admin');
    // Only one getById: the initial load. A role change must not clobber in-progress edits.
    expect(mockUsersSvc.getById).toHaveBeenCalledTimes(1);
  });

  it('should lock the role with a reason when viewing yourself', async () => {
    await setup(userDetail(), { id: 'user-123', role: 'owner' });
    expect(component['isSelf']()).toBe(true);
    expect(component['roleLock']()).toBe("You can't change your own role");
    expect(component['canDelete']()).toBe(false);
  });

  it('should offer resend invite for invited users and reactivate for deactivated ones', async () => {
    await setup(userDetail({ verified: false }));
    expect(component['lifecycleStrip']()?.action).toBe('resend');
    await component['resendInvite']();
    expect(mockUsersSvc.resendInvite).toHaveBeenCalledWith('user-123');
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Invitation email sent to john@example.com');

    await setup(userDetail({ deactivated_at: new Date('2026-07-02T12:00:00Z') }));
    expect(component['status']()?.label).toBe('Deactivated');
    expect(component['roleLock']()).toBe('Deactivated accounts keep their role');
    expect(component['lifecycleStrip']()?.action).toBe('reactivate');
    await component['reactivateUser']();
    expect(mockUsersSvc.reactivate).toHaveBeenCalledWith('user-123');
    expect(component['detail']()?.deactivated_at).toBeNull();
  });

  it('should deactivate behind a confirm and patch state in place', async () => {
    await component['deactivateUser']();
    expect(mockDialogSvc.confirm).toHaveBeenCalled();
    expect(mockUsersSvc.deactivate).toHaveBeenCalledWith('user-123');
    expect(component['detail']()?.deactivated_at).not.toBeNull();
    expect(component['status']()?.label).toBe('Deactivated');
  });

  it('should delete behind a danger confirm and return to the list', async () => {
    mockUsersSvc.delete.mockResolvedValue(true);
    await component['deleteUser']();
    expect(mockDialogSvc.confirm).toHaveBeenCalled();
    expect(mockUsersSvc.delete).toHaveBeenCalledWith('user-123');
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('User deleted');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/users']);
  });

  it('should hide destructive actions when an admin views an owner', async () => {
    await setup(userDetail({ role: 'owner' }), { id: 'current-user-id', role: 'admin' });
    expect(component['canDelete']()).toBe(false);
    expect(component['showDeactivateAction']()).toBe(false);
    expect(component['roleLock']()).toBe("Only an owner can change an owner's role");
  });
});
