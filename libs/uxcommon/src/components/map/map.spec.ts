import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { PcMap } from './map';

/**
 * `<pc-map>` is deliberately built to render a deterministic placeholder when no
 * `Loader` is provided (as here) — so component tests never touch the network
 * and never depend on the Google Maps SDK. See `docs/spec/pc-map-usage.md`.
 */
describe('PcMap', () => {
  let fixture: ComponentFixture<PcMap>;

  beforeEach(async () => {
    // No Loader provider on purpose → optional injection is null → placeholder.
    await TestBed.configureTestingModule({ imports: [PcMap] }).compileComponents();
    fixture = TestBed.createComponent(PcMap);
  });

  it('renders the placeholder (no network) when no Loader is provided', () => {
    fixture.detectChanges();
    const host = fixture.debugElement.query(By.css('[role="img"]'));
    expect(host).toBeTruthy();
    // A real Google map <div> is never created without a Loader.
    expect(fixture.debugElement.query(By.css('#mapHost'))).toBeNull();
  });

  it('uses the ariaLabel on the placeholder when there is no content', () => {
    fixture.componentRef.setInput('ariaLabel', 'Household location');
    fixture.detectChanges();
    const host = fixture.debugElement.query(By.css('[role="img"]'));
    expect(host.nativeElement.getAttribute('aria-label')).toBe('Household location');
  });

  it('captions the placeholder with the marker/polygon count', () => {
    fixture.componentRef.setInput('markers', [
      { position: { lat: 41.9, lng: -87.6 } },
      { position: { lat: 41.8, lng: -87.7 } },
    ]);
    fixture.componentRef.setInput('polygons', [{ path: [{ lat: 41.9, lng: -87.6 }] }]);
    fixture.detectChanges();
    const caption = fixture.debugElement.query(By.css('[role="img"] span'));
    expect(caption.nativeElement.textContent.trim()).toBe('2 locations · 1 area');
  });
});
