import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VolunteersGridComponent } from './volunteers-grid.component';

describe('VolunteersGridComponent', () => {
  let component: VolunteersGridComponent;
  let fixture: ComponentFixture<VolunteersGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolunteersGridComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VolunteersGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
