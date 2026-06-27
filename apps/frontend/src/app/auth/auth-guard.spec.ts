import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth-guard';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('AuthGuard', () => {
  let mockAuthSvc: any;
  let mockRouter: any;

  beforeEach(() => {
    mockAuthSvc = {
      getUser: vi.fn(),
    };

    mockRouter = {
      navigateByUrl: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthSvc },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('should allow access if user is authenticated', () => {
    mockAuthSvc.getUser.mockReturnValue({ id: 'user-123', email_verified: true });

    TestBed.runInInjectionContext(() => {
      const result = authGuard({} as any, {} as any);
      expect(result).toBe(true);
      expect(mockRouter.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  it('should redirect to signin if user is NOT authenticated', () => {
    mockAuthSvc.getUser.mockReturnValue(null);

    TestBed.runInInjectionContext(() => {
      authGuard({} as any, {} as any);
      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/signin');
    });
  });
});
