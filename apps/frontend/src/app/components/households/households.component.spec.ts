import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HouseholdsComponent } from "./households.component";

describe("HouseholdsComponent", () => {
  let component: HouseholdsComponent;
  let fixture: ComponentFixture<HouseholdsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HouseholdsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HouseholdsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
