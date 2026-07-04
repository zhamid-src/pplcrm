import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ThemeService } from 'apps/frontend/src/app/layout/theme/theme-service';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppComponent } from './app';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let mockThemeSvc: { getTheme: () => string };

  beforeEach(async () => {
    mockThemeSvc = { getTheme: () => 'dark' };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), { provide: ThemeService, useValue: mockThemeSvc }],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  it('creates the root component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('applies the current theme as a data-theme attribute', () => {
    const themedDiv = fixture.nativeElement.querySelector('div[data-theme]');
    expect(themedDiv.getAttribute('data-theme')).toBe('dark');
  });

  it('renders a router outlet', () => {
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });

  it('renders the dialog host', () => {
    expect(fixture.nativeElement.querySelector('pc-dialog-host')).toBeTruthy();
  });
});
