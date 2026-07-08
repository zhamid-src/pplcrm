import { Component } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DetailLayout } from './detail-layout';

@Component({
  template: `
    <pc-detail-layout [title]="'Jane Doe'" [isLoading]="false">
      <p>Projected body</p>
    </pc-detail-layout>
  `,
  imports: [DetailLayout],
})
class HostComponent {}

describe('DetailLayout', () => {
  let fixture: ComponentFixture<DetailLayout>;
  let component: DetailLayout;
  const appendedElements: HTMLElement[] = [];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailLayout],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DetailLayout);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Jane Doe');
    fixture.componentRef.setInput('isLoading', false);
  });

  afterEach(() => {
    for (const el of appendedElements.splice(0)) {
      el.remove();
    }
  });

  describe('body states', () => {
    it('shows a loading spinner when isLoading is true', () => {
      fixture.componentRef.setInput('isLoading', true);
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('progress'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('.alert-error'))).toBeNull();
    });

    it('shows the error alert when error is set and not loading', () => {
      fixture.componentRef.setInput('error', 'Something went wrong');
      fixture.detectChanges();

      const alert = fixture.debugElement.query(By.css('.alert-error'));
      expect(alert).not.toBeNull();
      expect(alert.nativeElement.textContent).toContain('Something went wrong');
      expect(fixture.debugElement.query(By.css('progress'))).toBeNull();
    });

    it('shows the not-found alert when hasRecord is false and there is no error', () => {
      fixture.componentRef.setInput('hasRecord', false);
      fixture.componentRef.setInput('notFoundText', 'No such person');
      fixture.detectChanges();

      const alert = fixture.debugElement.query(By.css('.alert-error'));
      expect(alert).not.toBeNull();
      expect(alert.nativeElement.textContent).toContain('No such person');
    });

    it('prioritizes the loading state over an error', () => {
      fixture.componentRef.setInput('isLoading', true);
      fixture.componentRef.setInput('error', 'boom');
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('progress'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('.alert-error'))).toBeNull();
    });

    it('prioritizes the error state over not-found', () => {
      fixture.componentRef.setInput('error', 'boom');
      fixture.componentRef.setInput('hasRecord', false);
      fixture.componentRef.setInput('notFoundText', 'No such person');
      fixture.detectChanges();

      const alert = fixture.debugElement.query(By.css('.alert-error'));
      expect(alert.nativeElement.textContent).toContain('boom');
      expect(alert.nativeElement.textContent).not.toContain('No such person');
    });

    it('projects main content when not loading, no error, and record is present', async () => {
      const hostFixture = TestBed.createComponent(HostComponent);
      hostFixture.detectChanges();
      await hostFixture.whenStable();
      hostFixture.detectChanges();

      expect(hostFixture.debugElement.query(By.css('progress'))).toBeNull();
      expect(hostFixture.debugElement.query(By.css('.alert-error'))).toBeNull();
      const projected = hostFixture.debugElement.query(By.css('p'));
      expect(projected.nativeElement.textContent.trim()).toBe('Projected body');
    });
  });

  describe('keyboard navigation (document:keydown)', () => {
    function dispatchKey(key: string, opts: Partial<KeyboardEventInit> = {}, target?: EventTarget): void {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts });
      (target ?? document).dispatchEvent(event);
    }

    beforeEach(() => {
      fixture.componentRef.setInput('positionLabel', '2 of 5 filtered');
    });

    it('does nothing when there is no positionLabel', () => {
      fixture.componentRef.setInput('positionLabel', null);
      fixture.componentRef.setInput('hasNext', true);
      fixture.componentRef.setInput('hasPrev', true);
      fixture.detectChanges();

      const nextSpy = vi.fn();
      const prevSpy = vi.fn();
      component.nextRecord.subscribe(nextSpy);
      component.prevRecord.subscribe(prevSpy);

      dispatchKey('j');
      dispatchKey('k');

      expect(nextSpy).not.toHaveBeenCalled();
      expect(prevSpy).not.toHaveBeenCalled();
    });

    it('emits nextRecord on "j" when hasNext is true, and prevents default', () => {
      fixture.componentRef.setInput('hasNext', true);
      fixture.detectChanges();

      const nextSpy = vi.fn();
      component.nextRecord.subscribe(nextSpy);

      const event = new KeyboardEvent('keydown', { key: 'j', bubbles: true, cancelable: true });
      document.dispatchEvent(event);

      expect(nextSpy).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it('does not emit nextRecord on "j" when hasNext is false', () => {
      fixture.componentRef.setInput('hasNext', false);
      fixture.detectChanges();

      const nextSpy = vi.fn();
      component.nextRecord.subscribe(nextSpy);

      dispatchKey('j');

      expect(nextSpy).not.toHaveBeenCalled();
    });

    it('emits prevRecord on "K" (case-insensitive) when hasPrev is true', () => {
      fixture.componentRef.setInput('hasPrev', true);
      fixture.detectChanges();

      const prevSpy = vi.fn();
      component.prevRecord.subscribe(prevSpy);

      dispatchKey('K');

      expect(prevSpy).toHaveBeenCalledTimes(1);
    });

    it('does not emit prevRecord on "k" when hasPrev is false', () => {
      fixture.componentRef.setInput('hasPrev', false);
      fixture.detectChanges();

      const prevSpy = vi.fn();
      component.prevRecord.subscribe(prevSpy);

      dispatchKey('k');

      expect(prevSpy).not.toHaveBeenCalled();
    });

    it('ignores the key when a modifier key is held', () => {
      fixture.componentRef.setInput('hasNext', true);
      fixture.detectChanges();

      const nextSpy = vi.fn();
      component.nextRecord.subscribe(nextSpy);

      dispatchKey('j', { ctrlKey: true });
      dispatchKey('j', { metaKey: true });
      dispatchKey('j', { altKey: true });

      expect(nextSpy).not.toHaveBeenCalled();
    });

    it('ignores the key when the event target is an editable input', () => {
      fixture.componentRef.setInput('hasNext', true);
      fixture.detectChanges();

      const input = document.createElement('input');
      document.body.appendChild(input);
      appendedElements.push(input);

      const nextSpy = vi.fn();
      component.nextRecord.subscribe(nextSpy);

      dispatchKey('j', {}, input);

      expect(nextSpy).not.toHaveBeenCalled();
    });
  });
});
