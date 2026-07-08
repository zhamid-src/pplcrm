import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersonsService } from '@experiences/persons/services/persons-service';
import { DuplicateSelectionComponent } from './duplicate-selection';

describe('DuplicateSelectionComponent', () => {
  let component: DuplicateSelectionComponent;
  let fixture: ComponentFixture<DuplicateSelectionComponent>;
  let mockPersonsSvc: any;

  beforeEach(async () => {
    mockPersonsSvc = {
      getDuplicateCounts: vi.fn().mockResolvedValue({ people: 4, households: 0, companies: 2 }),
    };

    await TestBed.configureTestingModule({
      imports: [DuplicateSelectionComponent],
      providers: [provideRouter([]), { provide: PersonsService, useValue: mockPersonsSvc }],
    }).compileComponents();

    fixture = TestBed.createComponent(DuplicateSelectionComponent);
    component = fixture.componentInstance;
  });

  it('should load duplicate counts on init and render found badges for non-zero counts', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockPersonsSvc.getDuplicateCounts).toHaveBeenCalled();
    expect(component.counts()).toEqual({ people: 4, households: 0, companies: 2 });
    expect(component.isLoading()).toBe(false);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('4 found');
    expect(text).toContain('2 found');
    expect(text).toContain('Clean');
  });

  it('should default counts to zero and not throw when the count fetch fails', async () => {
    mockPersonsSvc.getDuplicateCounts.mockRejectedValue(new Error('boom'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.counts()).toEqual({ people: 0, households: 0, companies: 0 });
    expect(component.isLoading()).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
