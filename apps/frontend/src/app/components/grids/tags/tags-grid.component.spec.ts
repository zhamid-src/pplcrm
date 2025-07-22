import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TagsGridComponent } from './tags-grid.component';

describe('TagsGridComponent', () => {
  let component: TagsGridComponent;
  let fixture: ComponentFixture<TagsGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagsGridComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TagsGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
