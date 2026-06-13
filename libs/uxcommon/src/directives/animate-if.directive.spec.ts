import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AnimateIfDirective } from './animate-if.directive';

@Component({
  standalone: true,
  imports: [AnimateIfDirective],
  template: `
    <div *pcAnimateIf="isVisible; enter: enterClass(); exit: exitClass(); duration: duration()">
      Test Content
    </div>
  `,
})
class TestHostComponent {
  isVisible = signal(true);
  enterClass = signal('animate-left');
  exitClass = signal('animate-exit-right');
  duration = signal(300);
}

describe('AnimateIfDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render the element when isVisible is true', () => {
    const el = fixture.debugElement.query(By.css('div'));
    expect(el).toBeTruthy();
    expect(el.nativeElement.textContent.trim()).toBe('Test Content');
  });

  it('should remove the element after duration on exit animation', fakeAsync(() => {
    // Flush any initial requestAnimationFrame from entry animation
    tick(50);
    fixture.detectChanges();

    component.isVisible.set(false);
    fixture.detectChanges();

    // View container should still have the element during exit animation
    let el = fixture.debugElement.query(By.css('div'));
    expect(el).toBeTruthy();
    expect(el.nativeElement.classList.contains('animate-exit-right')).toBe(true);

    // Wait for the duration plus buffer
    tick(350);
    fixture.detectChanges();

    el = fixture.debugElement.query(By.css('div'));
    expect(el).toBeNull();
  }));

  it('should remove the element immediately when exit class is "animate-none"', () => {
    component.exitClass.set('animate-none');
    fixture.detectChanges();

    component.isVisible.set(false);
    fixture.detectChanges();

    // The element should be removed immediately without waiting for duration/timeout
    const el = fixture.debugElement.query(By.css('div'));
    expect(el).toBeNull();
  });
});

