import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Swap } from './swap';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';

describe('Swap Component', () => {
  let component: Swap;
  let fixture: ComponentFixture<Swap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Swap],
    }).compileComponents();

    fixture = TestBed.createComponent(Swap);
    component = fixture.componentInstance;

    // Provide required inputs
    fixture.componentRef.setInput('swapOnIcon', 'check-circle');
    fixture.componentRef.setInput('swapOffIcon', 'x-circle');
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render correct icons', () => {
    fixture.detectChanges();
    const icons = fixture.debugElement.queryAll(By.css('pc-icon'));
    expect(icons.length).toBe(2);

    // swap-on icon
    expect(icons[0].componentInstance.name()).toBe('check-circle');
    // swap-off icon
    expect(icons[1].componentInstance.name()).toBe('x-circle');
  });

  it('should apply rotate animation class by default', () => {
    fixture.detectChanges();
    const label = fixture.debugElement.query(By.css('label'));
    expect(label.classes['swap-rotate']).toBeTruthy();
    expect(label.classes['swap-flip']).toBeFalsy();
  });

  it('should apply flip animation class when set', () => {
    fixture.componentRef.setInput('animation', 'flip');
    fixture.detectChanges();
    const label = fixture.debugElement.query(By.css('label'));
    expect(label.classes['swap-flip']).toBeTruthy();
    expect(label.classes['swap-rotate']).toBeFalsy();
  });

  it('should apply active class when checked is true', () => {
    fixture.componentRef.setInput('checked', true);
    fixture.detectChanges();
    const label = fixture.debugElement.query(By.css('label'));
    expect(label.classes['swap-active']).toBeTruthy();
  });

  it('should NOT apply active class when checked is false', () => {
    fixture.componentRef.setInput('checked', false);
    fixture.detectChanges();
    const label = fixture.debugElement.query(By.css('label'));
    expect(label.classes['swap-active']).toBeFalsy();
  });

  it('should emit click event and stop propagation', () => {
    const emitSpy = vi.spyOn(component.click, 'emit');
    const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;

    component.emitClick(mockEvent);

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledOnce();
  });

  it('should trigger emitClick on label click', () => {
    fixture.detectChanges();
    const emitSpy = vi.spyOn(component, 'emitClick');

    const label = fixture.debugElement.query(By.css('label'));
    label.triggerEventHandler('click', new Event('click'));

    expect(emitSpy).toHaveBeenCalled();
  });
});
