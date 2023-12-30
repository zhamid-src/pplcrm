import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HouseholdsGridComponent } from "./households-grid.component";

describe("HouseholdsGridComponent", () => {
  let component: HouseholdsGridComponent;
  let fixture: ComponentFixture<HouseholdsGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HouseholdsGridComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HouseholdsGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
