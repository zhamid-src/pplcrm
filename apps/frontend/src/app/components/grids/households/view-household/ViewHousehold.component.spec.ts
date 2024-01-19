import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewHouseholdComponent } from './ViewHousehold.component';

describe('ViewHouseholdComponent', () => {
  let component: ViewHouseholdComponent;
  let fixture: ComponentFixture<ViewHouseholdComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewHouseholdComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewHouseholdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
