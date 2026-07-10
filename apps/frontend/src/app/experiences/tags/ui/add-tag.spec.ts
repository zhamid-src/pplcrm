import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AddTagDialog } from './add-tag';
import { TagsService } from '@experiences/tags/services/tags-service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { TagOptionsService } from '@frontend/shared/components/datagrid/services/tag-options.service';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('AddTagDialog', () => {
  let component: AddTagDialog;
  let fixture: ComponentFixture<AddTagDialog>;

  let mockTagsSvc: any;
  let mockAlertSvc: any;
  let mockTagOptionsSvc: any;

  beforeEach(async () => {
    mockTagsSvc = {
      add: vi.fn().mockResolvedValue(undefined),
      triggerRefresh: vi.fn(),
    };

    mockAlertSvc = {
      showError: vi.fn(),
      showSuccess: vi.fn(),
      alertList: vi.fn().mockReturnValue([]),
    };

    mockTagOptionsSvc = {
      invalidate: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [AddTagDialog],
      providers: [
        { provide: TagsService, useValue: mockTagsSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: TagOptionsService, useValue: mockTagOptionsSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddTagDialog);
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

  it('should submit form when valid, emit saved, and close', async () => {
    const savedSpy = vi.spyOn(component.saved, 'emit');
    const closeSpy = vi.spyOn(component, 'close').mockImplementation(() => undefined);

    component.form.name().value.set('Test Tag');
    component.form.description().value.set('Test Description');
    component.form.color().value.set('#ff0000');

    await component['add']();

    expect(mockTagsSvc.add).toHaveBeenCalledWith({
      name: 'Test Tag',
      description: 'Test Description',
      color: '#ff0000',
    });
    expect(mockTagsSvc.triggerRefresh).toHaveBeenCalled();
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('Tag added successfully.');
    expect(savedSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should handle service errors gracefully', async () => {
    mockTagsSvc.add.mockRejectedValue(new Error('Tag name already exists'));
    component.form.name().value.set('Duplicate Tag');

    await component['add']();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Tag name already exists');
  });
});
