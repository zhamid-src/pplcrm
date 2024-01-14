import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddBtnRowComponent } from './AddBtnRow.component';

describe('AddBtnRowComponent', () => {
  let component: AddBtnRowComponent;
  let fixture: ComponentFixture<AddBtnRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddBtnRowComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddBtnRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
