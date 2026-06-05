import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { GridActionComponent } from './tool-button';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';

describe('GridActionComponent', () => {
  let component: GridActionComponent;
  let fixture: ComponentFixture<GridActionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GridActionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GridActionComponent);
    component = fixture.componentInstance;

    // Provide required inputs
    fixture.componentRef.setInput('icon', 'add-home');
    fixture.componentRef.setInput('tip', 'Add Home');
  });

  it('should render with required inputs', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();

    const li = fixture.debugElement.query(By.css('li'));
    expect(li.nativeElement.getAttribute('data-tip')).toBe('Add Home');

    const icon = fixture.debugElement.query(By.css('pc-icon'));
    expect(icon.componentInstance.name()).toBe('add-home');
  });

  it('should emit action on click when enabled', () => {
    fixture.detectChanges();
    const actionSpy = vi.spyOn(component.action, 'emit');

    const li = fixture.debugElement.query(By.css('li'));
    li.triggerEventHandler('click', null);

    expect(actionSpy).toHaveBeenCalledOnce();
  });

  it('should NOT emit action on click when disabled', () => {
    fixture.componentRef.setInput('enabled', false);
    fixture.detectChanges();

    const actionSpy = vi.spyOn(component.action, 'emit');
    const li = fixture.debugElement.query(By.css('li'));
    li.triggerEventHandler('click', null);

    expect(actionSpy).not.toHaveBeenCalled();
    expect(li.classes['disabled']).toBeTruthy();
    expect(li.classes['cursor-not-allowed']).toBeTruthy();
  });

  it('should NOT emit action on click when spinning', () => {
    fixture.componentRef.setInput('spinning', true);
    fixture.detectChanges();

    const actionSpy = vi.spyOn(component.action, 'emit');
    const li = fixture.debugElement.query(By.css('li'));
    li.triggerEventHandler('click', null);

    expect(actionSpy).not.toHaveBeenCalled();
    expect(li.classes['disabled']).toBeTruthy();
    expect(li.classes['cursor-not-allowed']).toBeTruthy();
    expect(li.classes['opacity-50']).toBeTruthy();

    const icon = fixture.debugElement.query(By.css('pc-icon'));
    expect(icon.componentInstance.class()).toContain('animate-spin');
  });

  it('should apply active class when active', () => {
    fixture.componentRef.setInput('active', true);
    fixture.detectChanges();

    const li = fixture.debugElement.query(By.css('li'));
    expect(li.classes['text-primary']).toBeTruthy();
  });

  it('should hide component when hidden is true', () => {
    fixture.componentRef.setInput('hidden', true);
    fixture.detectChanges();

    const li = fixture.debugElement.query(By.css('li'));
    expect(li.classes['hidden']).toBeTruthy();
  });

  it('should apply correct placement class based on placement input', () => {
    fixture.detectChanges();
    const li = fixture.debugElement.query(By.css('li'));
    // Default placement should be bottom
    expect(li.classes['tooltip-bottom']).toBeTruthy();
    expect(li.classes['tooltip-left']).toBeFalsy();

    fixture.componentRef.setInput('placement', 'top');
    fixture.detectChanges();
    expect(li.classes['tooltip-top']).toBeTruthy();
    expect(li.classes['tooltip-bottom']).toBeFalsy();
  });
});
