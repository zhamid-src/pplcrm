import { ComponentFixture, TestBed } from "@angular/core/testing";
import { AddTagComponent } from "./addTag.component";

describe("AddTagComponent", () => {
  let component: AddTagComponent;
  let fixture: ComponentFixture<AddTagComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddTagComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddTagComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
