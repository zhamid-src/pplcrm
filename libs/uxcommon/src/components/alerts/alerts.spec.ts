import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Alerts } from './alerts';
import { AlertService } from './alert-service';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Alerts Component', () => {
  let component: Alerts;
  let fixture: ComponentFixture<Alerts>;
  let mockAlertSvc: any;

  beforeEach(async () => {
    mockAlertSvc = {
      alertList: vi.fn().mockReturnValue([
        { id: '1', type: 'success', text: 'Success!', btn1Text: 'OK', btn2Text: 'Cancel' },
        { id: '2', type: 'error', text: 'Error!' },
      ]),
      OKBtnCallback: vi.fn(),
      btn2Callback: vi.fn(),
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

  it('should return alerts based on position', () => {
    // Default position is bottom (normal order)
    fixture.detectChanges();
    let alerts = component['alerts']();
    expect(alerts.length).toBe(2);
    expect(alerts[0].id).toBe('1');
    expect(alerts[1].id).toBe('2');

    // Change to top (reversed order)
    fixture.componentRef.setInput('position', 'top');
    fixture.detectChanges();
    alerts = component['alerts']();
    expect(alerts.length).toBe(2);
    expect(alerts[0].id).toBe('2');
    expect(alerts[1].id).toBe('1');
  });

  it('should call alert service on OK button click', () => {
    component['OKBtnClick']('1');
    expect(mockAlertSvc.OKBtnCallback).toHaveBeenCalledWith('1');
    expect(mockAlertSvc.dismiss).toHaveBeenCalledWith('1');
  });

  it('should call alert service on Btn2 click', () => {
    component['btn2Click']('2');
    expect(mockAlertSvc.btn2Callback).toHaveBeenCalledWith('2');
    expect(mockAlertSvc.dismiss).toHaveBeenCalledWith('2');
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
    expect(component['icon']('error')).toBe('x-circle');
    expect(component['icon']('info')).toBe('exclamation-circle');
  });
});
