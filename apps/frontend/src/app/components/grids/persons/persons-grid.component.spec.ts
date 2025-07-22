import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PersonsGridComponent } from './persons-grid.component';

describe('PersonsGridComponent', () => {
  let component: PersonsGridComponent;
  let fixture: ComponentFixture<PersonsGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonsGridComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PersonsGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
