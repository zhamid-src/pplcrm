import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Sidebar } from './sidebar';
import { SidebarService } from './sidebar-service';
import { AuthService } from '../../auth/auth-service';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

describe('Sidebar Component', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;
  let mockSidebarSvc: any;
  let mockAuthService: any;

  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    mockSidebarSvc = {
      getItems: vi.fn().mockReturnValue(signal([{ label: 'Test Item' }])),
      closeMobile: vi.fn(),
      isCollapsed: vi.fn().mockReturnValue(false),
      isFull: vi.fn().mockReturnValue(true),
      isHalf: vi.fn().mockReturnValue(false),
      isMobileOpen: vi.fn().mockReturnValue(true),
      toggleCollapsed: vi.fn(),
      toggleDrawer: vi.fn(),
    };

    mockAuthService = {
      getUser: vi.fn().mockReturnValue({ role: 'admin' }),
      getUserSignal: vi.fn().mockReturnValue(signal({ role: 'admin' })),
    };

    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        { provide: SidebarService, useValue: mockSidebarSvc },
        { provide: AuthService, useValue: mockAuthService },
        provideRouter([]), // needed for RouterLink
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should retrieve items from SidebarService', () => {
    fixture.detectChanges();
    expect(component['items']()).toEqual([{ label: 'Test Item' }]);
    expect(mockSidebarSvc.getItems).toHaveBeenCalled();
  });

  it('should call closeMobile on service when triggered', () => {
    component['closeMobile']();
    expect(mockSidebarSvc.closeMobile).toHaveBeenCalled();
  });

  it('should check if section is collapsed', () => {
    expect(component['isCollapsed']('section1')).toBe(false);
    expect(mockSidebarSvc.isCollapsed).toHaveBeenCalledWith('section1');
  });

  it('should accurately return drawer state', () => {
    expect(component['isDrawerFull']()).toBe(true);
    expect(component['isDrawerHalf']()).toBe(false);
    expect(component['isMobileOpen']()).toBe(true);
  });

  it('should toggle collapse state of a section', () => {
    component['toggleCollapse']('section1');
    expect(mockSidebarSvc.toggleCollapsed).toHaveBeenCalledWith('section1');
  });

  it('should toggle the drawer state', () => {
    component['toggleDrawer']();
    expect(mockSidebarSvc.toggleDrawer).toHaveBeenCalled();
  });
});
