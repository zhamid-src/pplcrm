import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { loginGuard } from './login-guard';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('LoginGuard', () => {
  let mockAuthSvc: any;
  let mockRouter: any;

  beforeEach(() => {
    mockAuthSvc = {
      getUser: vi.fn()
    };

    mockRouter = {
      navigateByUrl: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthSvc },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  it('should allow access if user is NOT authenticated', () => {
    mockAuthSvc.getUser.mockReturnValue(null);
    
    TestBed.runInInjectionContext(() => {
      const result = loginGuard({} as any, {} as any);
      expect(result).toBe(true);
      expect(mockRouter.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  it('should redirect to summary if user IS authenticated', () => {
    mockAuthSvc.getUser.mockReturnValue({ id: 'user-123' });
    
    TestBed.runInInjectionContext(() => {
      loginGuard({} as any, {} as any);
      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/summary');
    });
  });
});
