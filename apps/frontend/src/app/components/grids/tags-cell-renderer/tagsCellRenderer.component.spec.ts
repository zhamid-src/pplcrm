import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TagsCellRendererComponent } from './tagsCellRenderer.component';

describe('TagsCellRendererComponent', () => {
  let component: TagsCellRendererComponent;
  let fixture: ComponentFixture<TagsCellRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagsCellRendererComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TagsCellRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
