import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PeopleInHousehold } from './people-in-household';
import { PersonsService } from '../services/persons-service';

function person(id: string, first: string, last: string) {
  return { id, first_name: first, middle_names: '', last_name: last, full_name: `${first} ${last}` };
}

describe('PeopleInHousehold', () => {
  let fixture: ComponentFixture<PeopleInHousehold>;
  let mockPersonsSvc: { getPeopleInHousehold: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockPersonsSvc = { getPeopleInHousehold: vi.fn().mockResolvedValue([]) };

    await TestBed.configureTestingModule({
      imports: [PeopleInHousehold],
      providers: [provideRouter([]), { provide: PersonsService, useValue: mockPersonsSvc }],
    }).compileComponents();

    fixture = TestBed.createComponent(PeopleInHousehold);
  });

  it('shows "No one else" when the household has no other members', async () => {
    fixture.componentRef.setInput('householdId', 'h1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No one else');
  });

  it('renders each returned person as a link to their record', async () => {
    mockPersonsSvc.getPeopleInHousehold.mockResolvedValue([person('1', 'Jane', 'Doe'), person('2', 'Jon', 'Doe')]);

    fixture.componentRef.setInput('householdId', 'h1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const links = fixture.debugElement.queryAll(By.css('a'));
    expect(links).toHaveLength(2);
    expect(links[0].nativeElement.textContent).toContain('Jane Doe');
    expect(links[0].nativeElement.getAttribute('href')).toBe('/people/1');
  });

  it('excludes the given excludePersonId from the fetched list', async () => {
    mockPersonsSvc.getPeopleInHousehold.mockResolvedValue([person('1', 'Jane', 'Doe'), person('2', 'Jon', 'Doe')]);

    fixture.componentRef.setInput('householdId', 'h1');
    fixture.componentRef.setInput('excludePersonId', '2');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const links = fixture.debugElement.queryAll(By.css('a'));
    expect(links).toHaveLength(1);
    expect(links[0].nativeElement.textContent).toContain('Jane Doe');
  });

  it('shows a "- More -" button only when a full page was returned, and loadMore appends the next page', async () => {
    const firstPage = Array.from({ length: 25 }, (_, i) => person(String(i), 'First', `Last${i}`));
    const secondPage = [person('25', 'Extra', 'Person')];
    mockPersonsSvc.getPeopleInHousehold.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage);

    fixture.componentRef.setInput('householdId', 'h1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    let moreButton = fixture.debugElement.query(By.css('button'));
    expect(moreButton).toBeTruthy();

    moreButton.nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockPersonsSvc.getPeopleInHousehold).toHaveBeenLastCalledWith('h1', {
      limit: 25,
      offset: 25,
    });
    const links = fixture.debugElement.queryAll(By.css('a'));
    expect(links).toHaveLength(26);

    moreButton = fixture.debugElement.query(By.css('button'));
    expect(moreButton).toBeFalsy();
  });

  it('resets and refetches when householdId changes', async () => {
    mockPersonsSvc.getPeopleInHousehold.mockResolvedValueOnce([person('1', 'Jane', 'Doe')]);

    fixture.componentRef.setInput('householdId', 'h1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('a'))).toHaveLength(1);

    mockPersonsSvc.getPeopleInHousehold.mockResolvedValueOnce([person('2', 'Sam', 'Smith')]);
    fixture.componentRef.setInput('householdId', 'h2');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const links = fixture.debugElement.queryAll(By.css('a'));
    expect(links).toHaveLength(1);
    expect(links[0].nativeElement.textContent).toContain('Sam Smith');
    expect(mockPersonsSvc.getPeopleInHousehold).toHaveBeenLastCalledWith('h2', { limit: 25, offset: 0 });
  });
});
