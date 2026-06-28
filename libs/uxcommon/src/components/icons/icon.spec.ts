import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Icon } from './icon';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as IconsIndex from './icons.index';
import { By } from '@angular/platform-browser';

describe('Icon Component', () => {
  let component: Icon;
  let fixture: ComponentFixture<Icon>;

  beforeEach(async () => {
    vi.useFakeTimers();
    // Mock the loadIconSvg function
    vi.spyOn(IconsIndex, 'loadIconSvg').mockImplementation(async (name) => {
      if (name === 'none') return '';
      return `<svg viewBox="0 0 24 24"><path d="M12 2"/></svg>`;
      afterEach(() => {
        vi.useRealTimers();
      });
    });

    await TestBed.configureTestingModule({
      imports: [Icon],
    }).compileComponents();

    fixture = TestBed.createComponent(Icon);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    fixture.componentRef.setInput('name', 'home');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load and inject SVG with default size class', async () => {
    fixture.componentRef.setInput('name', 'home');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(1); // Wait for effect to process the promise
    fixture.detectChanges();

    expect(IconsIndex.loadIconSvg).toHaveBeenCalledWith('home');
    const svgStr = component.svgHtml();
    expect(svgStr).toContain('class="w-6 h-6"');

    // Verify it rendered in DOM
    const div = fixture.debugElement.query(By.css('div > div'));
    expect(div.nativeElement.innerHTML).toContain('class="w-6 h-6"');
  });

  it('should load and inject SVG with custom size class', async () => {
    fixture.componentRef.setInput('name', 'bell');
    fixture.componentRef.setInput('size', 10);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();

    expect(IconsIndex.loadIconSvg).toHaveBeenCalledWith('bell');
    expect(component.svgHtml()).toContain('class="w-10 h-10"');
  });

  it('should render hover icon when hovering', async () => {
    fixture.componentRef.setInput('name', 'bell');
    fixture.componentRef.setInput('hover', 'star');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();

    expect(IconsIndex.loadIconSvg).toHaveBeenCalledWith('star');

    // Trigger hover
    const wrapper = fixture.debugElement.query(By.css('div'));
    wrapper.triggerEventHandler('mouseenter', null);
    fixture.detectChanges();

    expect(component.hovering()).toBe(true);
  });

  it('should properly inject class into SVG tag that already has a class', () => {
    const rawSvg = '<svg class="text-blue-500" viewBox="0 0 24 24"></svg>';
    const result = component['injectClassOnSvg'](rawSvg, 'w-6 h-6');
    expect(result).toBe('<svg class="text-blue-500 w-6 h-6" viewBox="0 0 24 24"></svg>');
  });

  it('should properly inject class into SVG tag without a class', () => {
    const rawSvg = '<svg viewBox="0 0 24 24"></svg>';
    const result = component['injectClassOnSvg'](rawSvg, 'w-6 h-6');
    expect(result).toBe('<svg class="w-6 h-6" viewBox="0 0 24 24"></svg>');
  });

  it('should do nothing for invalid SVG text', () => {
    const rawSvg = '<div>Not an SVG</div>';
    const result = component['injectClassOnSvg'](rawSvg, 'w-6 h-6');
    expect(result).toBe(rawSvg);
  });
});
