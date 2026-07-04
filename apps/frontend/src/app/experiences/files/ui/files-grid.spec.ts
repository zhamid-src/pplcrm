import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { TokenService } from '../../../services/api/token-service';
import { ConfirmDialogService } from '../../../services/shared-dialog.service';
import { FilesService } from '../services/files.service';
import { FilesGrid } from './files-grid';

const fileA = { id: 'f1', filename: 'report.pdf', mime_type: 'application/pdf', size_bytes: 2048 };
const fileB = { id: 'f2', filename: 'photo.png', mime_type: 'image/png', size_bytes: 4096 };

describe('FilesGrid', () => {
  let component: FilesGrid;
  let fixture: ComponentFixture<FilesGrid>;
  let mockFilesSvc: any;
  let mockAlertSvc: any;
  let mockTokenSvc: any;
  let mockDialogSvc: any;

  beforeEach(async () => {
    mockFilesSvc = {
      getAll: vi.fn().mockResolvedValue({ rows: [fileA, fileB] }),
      uploadFileDirectly: vi.fn().mockResolvedValue({ id: 'f3' }),
      delete: vi.fn().mockResolvedValue(true),
    };

    mockAlertSvc = { showSuccess: vi.fn(), showError: vi.fn() };
    mockTokenSvc = { getAuthToken: vi.fn().mockReturnValue('tok-123') };
    mockDialogSvc = { confirm: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [FilesGrid],
      providers: [
        { provide: FilesService, useValue: mockFilesSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: TokenService, useValue: mockTokenSvc },
        { provide: ConfirmDialogService, useValue: mockDialogSvc },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FilesGrid);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load files on init and render them in the table', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockFilesSvc.getAll).toHaveBeenCalled();
    expect(component['files']()).toEqual([fileA, fileB]);
    expect(component['filteredFiles']()).toEqual([fileA, fileB]);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('report.pdf');
    expect(text).toContain('photo.png');
  });

  it('should show an error alert when loading files fails', async () => {
    mockFilesSvc.getAll.mockRejectedValue(new Error('boom'));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Failed to load files');
    expect(component['isLoading']()).toBe(false);
  });

  it('should filter files by filename or mime type via onSearch', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component['onSearch']({ target: { value: 'png' } } as unknown as Event);
    expect(component['filteredFiles']()).toEqual([fileB]);

    component['onSearch']({ target: { value: 'application/pdf' } } as unknown as Event);
    expect(component['filteredFiles']()).toEqual([fileA]);

    component['onSearch']({ target: { value: '' } } as unknown as Event);
    expect(component['filteredFiles']()).toEqual([fileA, fileB]);
  });

  it('should format byte counts into human readable sizes', () => {
    expect(component['formatBytes'](0)).toBe('0 Bytes');
    expect(component['formatBytes'](2048)).toBe('2 KB');
    expect(component['formatBytes'](null)).toBe('—');
  });

  it('should pick the right icon per mime type', () => {
    expect(component['getFileIcon']('image/png')).toBe('file-image');
    expect(component['getFileIcon']('application/pdf')).toBe('file-pdf');
    expect(component['getFileIcon']('application/zip')).toBe('file-archive');
    expect(component['getFileIcon'](null)).toBe('document');
  });

  it('should upload a selected file and reload the list on success', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    mockFilesSvc.getAll.mockClear();

    const file = new File(['data'], 'new.txt', { type: 'text/plain' });
    const input = { files: [file], value: 'C:\\fakepath\\new.txt' } as unknown as HTMLInputElement;

    await component['onFileSelectedForUpload']({ target: input } as unknown as Event);

    expect(mockFilesSvc.uploadFileDirectly).toHaveBeenCalledWith(file);
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('File uploaded successfully via SAS URL');
    expect(mockFilesSvc.getAll).toHaveBeenCalled();
    expect(input.value).toBe('');
    expect(component['isUploading']()).toBe(false);
  });

  it('should show an error alert when upload fails', async () => {
    mockFilesSvc.uploadFileDirectly.mockRejectedValue(new Error('upload failed'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fixture.detectChanges();
    await fixture.whenStable();

    const file = new File(['data'], 'new.txt', { type: 'text/plain' });
    const input = { files: [file], value: '' } as unknown as HTMLInputElement;

    await component['onFileSelectedForUpload']({ target: input } as unknown as Event);

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Failed to upload file');
    expect(component['isUploading']()).toBe(false);
  });

  it('should confirm before deleting a file, then delete and reload', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    mockFilesSvc.getAll.mockClear();

    await component['deleteFile'](fileA);

    expect(mockDialogSvc.confirm).toHaveBeenCalledWith(expect.objectContaining({ variant: 'danger' }));
    expect(mockFilesSvc.delete).toHaveBeenCalledWith('f1');
    expect(mockAlertSvc.showSuccess).toHaveBeenCalledWith('File deleted successfully');
    expect(mockFilesSvc.getAll).toHaveBeenCalled();
  });

  it('should not delete a file when the confirmation dialog is rejected', async () => {
    mockDialogSvc.confirm.mockResolvedValue(false);
    fixture.detectChanges();
    await fixture.whenStable();

    await component['deleteFile'](fileA);

    expect(mockFilesSvc.delete).not.toHaveBeenCalled();
  });

  it('should download a file using an authenticated fetch request', async () => {
    const blob = new Blob(['data']);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:mock'), revokeObjectURL: vi.fn() });

    fixture.detectChanges();
    await fixture.whenStable();

    await component['downloadFile'](fileA);

    expect(mockTokenSvc.getAuthToken).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/files/download/f1'),
      expect.objectContaining({ headers: { Authorization: 'Bearer tok-123' } }),
    );
    expect(mockAlertSvc.showError).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('should show an error alert when the download request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal('fetch', fetchMock);

    fixture.detectChanges();
    await fixture.whenStable();

    await component['downloadFile'](fileA);

    expect(mockAlertSvc.showError).toHaveBeenCalledWith('Failed to download file');

    vi.unstubAllGlobals();
  });
});
