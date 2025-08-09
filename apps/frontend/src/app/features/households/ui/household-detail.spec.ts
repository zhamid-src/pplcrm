/**
 * @file Unit tests for the {@link HouseholdDetail} component.
 */
jest.mock('@uxcommon/formInput', () => ({ FormInput: class {} }), { virtual: true });
jest.mock('@uxcommon/input', () => ({ PPlCrmInput: class {} }), { virtual: true });
jest.mock('@uxcommon/tags/tags', () => ({ Tags: class {} }), { virtual: true });
jest.mock('@uxcommon/textarea', () => ({ TextArea: class {} }), { virtual: true });
jest.mock('@uxcommon/add-btn-row', () => ({ AddBtnRow: class {} }), { virtual: true });
jest.mock('../../persons/ui/people-in-household', () => ({ PeopleInHousehold: class {} }), { virtual: true });
jest.mock('./household-detail.html', () => '', { virtual: true });

import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HouseholdDetail } from './household-detail';
import { AlertService } from '@uxcommon/alerts/alert-service';
import { HouseholdsService } from '../services/households-service';
import { PersonsService } from '../../persons/services/persons-service';

describe('HouseholdDetail', () => {
  let component: HouseholdDetail;
  let alertSvc: AlertService;
  let householdsSvc: HouseholdsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AlertService, useValue: { showError: jest.fn(), showSuccess: jest.fn() } },
        { provide: HouseholdsService, useValue: { attachTag: jest.fn(), detachTag: jest.fn() } },
        { provide: PersonsService, useValue: { getPeopleInHousehold: jest.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: FormBuilder, useValue: new FormBuilder() },
      ],
    });
    alertSvc = TestBed.inject(AlertService);
    householdsSvc = TestBed.inject(HouseholdsService);
    component = TestBed.runInInjectionContext(() => new HouseholdDetail());
  });

  it('should show error when address lacks components', () => {
    component.handleAddressChange({} as any);
    expect(alertSvc.showError).toHaveBeenCalled();
    expect(component['addressVerified']).toBe(false);
  });

  it('should attach tag when tag added', () => {
    component['id'] = 'h1';
    (component as any).tagAdded('vip');
    expect(householdsSvc.attachTag).toHaveBeenCalledWith('h1', 'vip');
  });
});

