import { ComponentFixture, TestBed, } from '@angular/core/testing';
import { Navbar } from './navbar';
import { AuthService } from 'apps/frontend/src/app/auth/auth-service';
import { FullScreenService } from '../../services/fullscreen.service';
import { SearchService } from '../../services/api/search-service';
import { SidebarService } from 'apps/frontend/src/app/layout/sidebar/sidebar-service';
import { ThemeService } from 'apps/frontend/src/app/layout/theme/theme-service';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { provideRouter } from '@angular/router';

describe('Navbar Component', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  let mockAuthSvc: any;
  let mockFullScreenSvc: any;
  let mockSearchSvc: any;
  let mockSidebarSvc: any;
  let mockThemeSvc: any;

  beforeEach(async () => {
    
    mockAuthSvc = {
      signOut: vi.fn(),
      currentUser: vi.fn().mockReturnValue({ name: 'Test User' })
    };
    
    mockFullScreenSvc = {
      isFullScreenMode: vi.fn().mockReturnValue(false),
      toggleFullScreen: vi.fn()
    };
    
    mockSearchSvc = {
      clearSearch: vi.fn(),
      doSearchImmediate: vi.fn(),
      doSearch: vi.fn()
    };
    
    mockSidebarSvc = {
      isMobileOpen: vi.fn().mockReturnValue(false),
      toggleMobile: vi.fn()
    };
    
    mockThemeSvc = {
      theme: vi.fn().mockReturnValue('light'),
      getTheme: vi.fn().mockReturnValue('light'),
      toggleTheme: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthSvc },
        { provide: FullScreenService, useValue: mockFullScreenSvc },
        { provide: SearchService, useValue: mockSearchSvc },
        { provide: SidebarService, useValue: mockSidebarSvc },
        { provide: ThemeService, useValue: mockThemeSvc }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle mobile sidebar', () => {
    component['toggleMobile']();
    expect(mockSidebarSvc.toggleMobile).toHaveBeenCalled();
  });

  it('should check if mobile sidebar is open', () => {
    expect(component['isMobileOpen']()).toBe(false);
    expect(mockSidebarSvc.isMobileOpen).toHaveBeenCalled();
  });

  it('should sign out user', () => {
    component['signOut']();
    expect(mockAuthSvc.signOut).toHaveBeenCalled();
  });

  it('should toggle theme', () => {
    component['toggleTheme']();
    expect(mockThemeSvc.toggleTheme).toHaveBeenCalled();
  });

  it('should toggle fullscreen', () => {
    component['toggleFullScreen']();
    expect(mockFullScreenSvc.toggleFullScreen).toHaveBeenCalled();
  });

  it('should check if fullscreen mode is active', () => {
    expect(component['isFullScreenMode']()).toBe(false);
    expect(mockFullScreenSvc.isFullScreenMode).toHaveBeenCalled();
  });

  it('should show search bar and set focus', async () => {
    component['showSearchBar']();
    expect(component['searchBarVisible']()).toBe(true);
    
    fixture.detectChanges();
    await new Promise(r => setTimeout(r, 1 + 20)); // wait for queueMicrotask to execute
    // Checking focus is difficult without mounting to real DOM, but we can verify the signal.
  });

  it('should hide search bar', () => {
    component['showSearchBar']();
    component['hideSearchBar']();
    expect(component['searchBarVisible']()).toBe(false);
  });

  it('should toggle search bar visibility', () => {
    component['toggleSearch']();
    expect(component['searchBarVisible']()).toBe(true);
    component['toggleSearch']();
    expect(component['searchBarVisible']()).toBe(false);
  });

  it('should clear search and call search service', () => {
    component['searchStr'].set('test');
    component['clearSearch']();
    expect(component['searchStr']()).toBe('');
    expect(mockSearchSvc.clearSearch).toHaveBeenCalled();
  });

  it('should update search string and call search on input', () => {
    const mockEvent = { target: { value: 'query' } } as unknown as Event;
    component['onSearchInput'](mockEvent);
    
    expect(component['searchStr']()).toBe('query');
    expect(mockSearchSvc.doSearch).toHaveBeenCalledWith('query');
  });

  it('should perform immediate search on enter', () => {
    component['searchStr'].set('urgent');
    component['onSearchEnter']();
    expect(mockSearchSvc.doSearchImmediate).toHaveBeenCalledWith('urgent');
  });

  it('should hide search bar on blur if empty', () => {
    component['showSearchBar']();
    component['searchStr'].set('');
    component['onBlurSearchBar']();
    expect(component['searchBarVisible']()).toBe(false);
  });

  it('should NOT hide search bar on blur if not empty', () => {
    component['showSearchBar']();
    component['searchStr'].set('test');
    component['onBlurSearchBar']();
    expect(component['searchBarVisible']()).toBe(true);
  });

  it('should handle Ctrl+K to open search bar', () => {
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    vi.spyOn(event, 'preventDefault');
    
    component.handleKeyDown(event);
    
    expect(event.preventDefault).toHaveBeenCalled();
    expect(component['searchBarVisible']()).toBe(true);
  });

  it('should handle Escape to close search bar', () => {
    component['showSearchBar']();
    component['searchStr'].set('test');
    
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    component.handleKeyDown(event);
    
    expect(component['searchBarVisible']()).toBe(false);
    expect(component['searchStr']()).toBe('');
  });
});
