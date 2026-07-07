import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { GeocodeChip, geocodeChipSpec } from './geocode-chip';

describe('geocodeChipSpec (binding §6 contract)', () => {
  it('maps success → Located', () => {
    expect(geocodeChipSpec('success')).toEqual({ label: 'Located', type: 'success' });
  });
  it('maps failed → Address problem', () => {
    expect(geocodeChipSpec('failed')).toEqual({ label: 'Address problem', type: 'warning' });
  });
  it('maps pending → Locating…', () => {
    expect(geocodeChipSpec('pending')).toEqual({ label: 'Locating…', type: 'info' });
  });
  it('maps null/undefined → Locating…', () => {
    expect(geocodeChipSpec(null)).toEqual({ label: 'Locating…', type: 'info' });
    expect(geocodeChipSpec(undefined)).toEqual({ label: 'Locating…', type: 'info' });
  });
});

describe('GeocodeChip', () => {
  let fixture: ComponentFixture<GeocodeChip>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GeocodeChip] }).compileComponents();
    fixture = TestBed.createComponent(GeocodeChip);
  });

  it('renders the Located label for success', () => {
    fixture.componentRef.setInput('status', 'success');
    fixture.detectChanges();
    const badge = fixture.debugElement.query(By.css('.badge'));
    expect(badge.nativeElement.textContent.trim()).toBe('Located');
    expect(badge.nativeElement.className).toContain('badge-success');
  });

  it('never hides the row — renders Locating… for a null status', () => {
    fixture.componentRef.setInput('status', null);
    fixture.detectChanges();
    const badge = fixture.debugElement.query(By.css('.badge'));
    expect(badge.nativeElement.textContent.trim()).toBe('Locating…');
    expect(badge.nativeElement.className).toContain('badge-info');
  });
});
