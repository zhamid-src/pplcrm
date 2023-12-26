import { ComponentFixture, TestBed } from "@angular/core/testing";
import { EditCellRendererComponent } from "./edit-cell-renderer.component";

describe("EditCellRendererComponent", () => {
  let component: EditCellRendererComponent;
  let fixture: ComponentFixture<EditCellRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditCellRendererComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditCellRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
