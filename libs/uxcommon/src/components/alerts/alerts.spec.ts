import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Alerts } from './alerts';
import { AlertMessage, AlertService } from './alert-service';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Alerts Component', () => {
  let component: Alerts;
  let fixture: ComponentFixture<Alerts>;
  let mockAlertSvc: any;

  beforeEach(async () => {
    mockAlertSvc = {
      // Newest-first, matching AlertService's internal ordering
      alertList: vi
        .fn()
        .mockReturnValue([
          new AlertMessage({ id: '1', type: 'success', text: 'Success!' }),
          new AlertMessage({ id: '2', type: 'error', text: 'Error!' }),
        ]),
      dismiss: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Alerts],
      providers: [{ provide: AlertService, useValue: mockAlertSvc }],
    }).compileComponents();

    fixture = TestBed.createComponent(Alerts);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render newest nearest the pinned edge', () => {
    // Default position is bottom: newest-first list is reversed so the newest
    // toast sits at the bottom of the stack (spec §2).
    fixture.detectChanges();
    let alerts = component['alerts']();
    expect(alerts.map((a: AlertMessage) => a.id)).toEqual(['2', '1']);

    // Top: newest-first order is kept so the newest stays nearest the top edge.
    fixture.componentRef.setInput('position', 'top');
    fixture.detectChanges();
    alerts = component['alerts']();
    expect(alerts.map((a: AlertMessage) => a.id)).toEqual(['1', '2']);
  });

  it('should dismiss via the alert service on card click', () => {
    component['dismiss']('1');
    expect(mockAlertSvc.dismiss).toHaveBeenCalledWith('1');
  });

  it('should return correct enter animation based on position', () => {
    fixture.componentRef.setInput('position', 'bottom');
    expect(component['getEnterAnim']()).toBe('animate-up');

    fixture.componentRef.setInput('position', 'top');
    expect(component['getEnterAnim']()).toBe('animate-down');

    fixture.componentRef.setInput('position', 'relative');
    expect(component['getEnterAnim']()).toBe('animate-down');
  });

  it('should return correct exit animation based on position', () => {
    fixture.componentRef.setInput('position', 'bottom');
    expect(component['getExitAnim']()).toBe('animate-exit-down');

    fixture.componentRef.setInput('position', 'top');
    expect(component['getExitAnim']()).toBe('animate-exit-up');
  });

  it('should return correct icon for alert type', () => {
    expect(component['icon']('success')).toBe('check-circle');
    expect(component['icon']('warning')).toBe('exclamation-triangle');
    expect(component['icon']('error')).toBe('exclamation-circle');
    expect(component['icon']('info')).toBe('information-circle');
    expect(component['icon'](undefined)).toBe('information-circle');
  });

  it('should color the icon by tone', () => {
    expect(component['toneClass']('success')).toBe('text-success');
    expect(component['toneClass']('warning')).toBe('text-warning');
    expect(component['toneClass']('error')).toBe('text-error');
    expect(component['toneClass']('info')).toBe('text-info');
    expect(component['toneClass'](undefined)).toBe('text-info');
  });

  it('should color the left accent bar by tone', () => {
    expect(component['barToneClass']('success')).toBe('bg-success');
    expect(component['barToneClass']('warning')).toBe('bg-warning');
    expect(component['barToneClass']('error')).toBe('bg-error');
    expect(component['barToneClass']('info')).toBe('bg-info');
    expect(component['barToneClass'](undefined)).toBe('bg-info');
  });
});
