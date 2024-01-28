import { ComponentFixture, TestBed } from "@angular/core/testing";
import { PeopleInHouseholdComponent } from "./peopleInHousehold.component";

describe("PeopleInHouseholdComponent", () => {
  let component: PeopleInHouseholdComponent;
  let fixture: ComponentFixture<PeopleInHouseholdComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeopleInHouseholdComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PeopleInHouseholdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
