import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DonorsGridComponent } from './donors-grid.component';

describe('DonorsGridComponent', () => {
  let component: DonorsGridComponent;
  let fixture: ComponentFixture<DonorsGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DonorsGridComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DonorsGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
