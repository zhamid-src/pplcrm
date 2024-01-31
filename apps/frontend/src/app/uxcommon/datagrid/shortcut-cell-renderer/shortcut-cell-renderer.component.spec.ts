import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShortcutCellRendererComponent } from './shortcut-cell-renderer.component';

describe('DeleteCellRendererComponent', () => {
  let component: ShortcutCellRendererComponent;
  let fixture: ComponentFixture<ShortcutCellRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShortcutCellRendererComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ShortcutCellRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
