import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddTag } from './add-tag';
import { TagsService } from '@experiences/tags/services/tags-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ActivatedRoute, Router } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('AddTag', () => {
  let component: AddTag;
  let fixture: ComponentFixture<AddTag>;

  let mockTagsSvc: any;
  let mockAlertSvc: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockTagsSvc = {
      add: vi.fn().mockResolvedValue(undefined),
      triggerRefresh: vi.fn()
    };

    mockAlertSvc = {
      showError: vi.fn(),
      showSuccess: vi.fn(),
      alertList: vi.fn().mockReturnValue([])
    };

    mockRouter = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [AddTag],
      providers: [
        { provide: TagsService, useValue: mockTagsSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddTag);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be invalid initially', () => {
    expect(component.form().invalid()).toBe(true);
  });

  it('should block submit and show invalid validation state if name is empty', async () => {
    await component['add']();
    expect(component.form().invalid()).toBe(true);
    expect(mockTagsSvc.add).not.toHaveBeenCalled();
  });

  it('should submit form when valid, and then reset payload', async () => {
    component.form.name().value.set('Test Tag');
    component.form.description().value.set('Test Description');
    component.form.color().value.set('#ff0000');

    await component['add']();

    expect(mockTagsSvc.add).toHaveBeenCalledWith({
      name: 'Test Tag',
      description: 'Test Description',
      color: '#ff0000'
    });
    expect(mockTagsSvc.triggerRefresh).toHaveBeenCalled();
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Tag added successfully.');

    // Backing payload should reset to default
    expect(component['payload']()).toEqual({
      name: '',
      description: '',
      color: '#0ea5e9'
    });
  });

  it('should handle service errors gracefully', async () => {
    mockTagsSvc.add.mockRejectedValue(new Error('Tag name already exists'));
    component.form.name().value.set('Duplicate Tag');

    await component['add']();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Tag name already exists');
  });
});
