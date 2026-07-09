import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageSettingsComponent } from './storage-settings';
import { FilesService } from '../../files/services/files.service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';

const mockSummary = {
  usedBytes: 3_435_973_836,
  quotaBytes: 5 * 1024 * 1024 * 1024,
  planLabel: 'grassroots',
  largestFiles: [
    {
      id: '1',
      filename: 'gala-photos.zip',
      size_bytes: 1_400_000_000,
      attachedToLabel: '"Spring gala follow-up" newsletter',
    },
    { id: '2', filename: 'kickoff-signups.csv', size_bytes: 48_000_000, attachedToLabel: null },
  ],
};

describe('StorageSettingsComponent', () => {
  let component: StorageSettingsComponent;
  let fixture: ComponentFixture<StorageSettingsComponent>;
  let mockFilesSvc: any;
  let mockAlertSvc: any;
  let mockDialogSvc: any;

  beforeEach(async () => {
    mockFilesSvc = {
      getUsageSummary: vi.fn().mockResolvedValue(mockSummary),
      delete: vi.fn().mockResolvedValue(true),
    };
    mockAlertSvc = { showSuccess: vi.fn(), showError: vi.fn() };
    mockDialogSvc = { confirm: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [StorageSettingsComponent],
      providers: [
        { provide: FilesService, useValue: mockFilesSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: ConfirmDialogService, useValue: mockDialogSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StorageSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('loads usage summary on init', () => {
    expect(mockFilesSvc.getUsageSummary).toHaveBeenCalled();
    expect(component['usedBytes']()).toBe(mockSummary.usedBytes);
    expect(component['quotaBytes']()).toBe(mockSummary.quotaBytes);
    expect(component['largestFiles']()).toEqual(mockSummary.largestFiles);
  });

  it('formats the plan label with capitalization and a trailing "plan"', () => {
    expect(component['planLabel']()).toBe('Grassroots plan');
  });

  it('computes used percentage and escalates the bar color near quota', () => {
    expect(component['usedPct']()).toBe(64);
    expect(component['barColorClass']()).toBe('bg-primary');
  });

  it('shows the error bar color at or over 100% usage', async () => {
    mockFilesSvc.getUsageSummary.mockResolvedValue({ ...mockSummary, usedBytes: mockSummary.quotaBytes });
    fixture = TestBed.createComponent(StorageSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component['usedPct']()).toBe(100);
    expect(component['barColorClass']()).toBe('bg-error');
  });

  it('deletes a file after confirmation and reloads usage', async () => {
    await component['deleteFile'](mockSummary.largestFiles[0] as any);

    expect(mockDialogSvc.confirm).toHaveBeenCalled();
    expect(mockFilesSvc.delete).toHaveBeenCalledWith('1');
    expect(mockAlertSvc.showSuccess).toHaveBeenCalled();
    expect(mockFilesSvc.getUsageSummary).toHaveBeenCalledTimes(2);
  });

  it('does not delete when the confirmation is declined', async () => {
    mockDialogSvc.confirm.mockResolvedValue(false);

    await component['deleteFile'](mockSummary.largestFiles[0] as any);

    expect(mockFilesSvc.delete).not.toHaveBeenCalled();
  });
});
