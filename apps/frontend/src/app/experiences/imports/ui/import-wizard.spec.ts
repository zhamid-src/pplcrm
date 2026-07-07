import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { ImportWizard } from './import-wizard';
import { ImportsService } from '../services/imports-service';
import { ListsService } from '../../lists/services/lists-service';
import { PersonsService } from '../../persons/services/persons-service';

/** Minimal CSV splitter mirroring libs/uxcommon's csv.worker.ts header/row shape, used to stub `parseCsv`. */
function splitCsv(text: string): { headers: string[]; rows: Array<Record<string, string>> } {
  const [headerLine, ...dataLines] = text.trim().split('\n');
  const headers = headerLine.split(',');
  const rows = dataLines
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const cells = line.split(',');
      const row: Record<string, string> = {};
      headers.forEach((h, i) => (row[h] = cells[i] ?? ''));
      return row;
    });
  return { headers, rows };
}

function makeCsvFile(text: string, name = 'canvass-signups.csv'): File {
  return new File([text], name, { type: 'text/csv' });
}

describe('ImportWizard', () => {
  let component: ImportWizard;
  let fixture: ComponentFixture<ImportWizard>;
  let mockPersonsSvc: any;
  let mockImportsSvc: any;
  let mockListsSvc: any;
  let mockAlertSvc: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockPersonsSvc = {
      checkDuplicateEmails: vi.fn().mockResolvedValue([]),
      import: vi.fn().mockResolvedValue({ import_id: 'imp-1', status: 'pending' }),
    };
    mockImportsSvc = {
      list: vi.fn().mockResolvedValue([
        {
          id: 'imp-1',
          status: 'completed',
          insertedCount: 2,
          mergedCount: 0,
          skippedCount: 0,
          errorCount: 0,
          tagName: 'Imported-20260101-0000',
          errorMessage: null,
        },
      ]),
    };
    mockListsSvc = {
      getAll: vi.fn().mockResolvedValue({ rows: [], count: 0 }),
    };
    mockAlertSvc = { showError: vi.fn(), showSuccess: vi.fn() };
    mockRouter = { navigate: vi.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [ImportWizard],
      providers: [
        { provide: PersonsService, useValue: mockPersonsSvc },
        { provide: ImportsService, useValue: mockImportsSvc },
        { provide: ListsService, useValue: mockListsSvc },
        { provide: AlertService, useValue: mockAlertSvc },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportWizard);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  /** Stub the private parseCsv (the shared uxcommon Worker isn't available in jsdom) then upload a file through the real handler. */
  async function uploadFile(text: string): Promise<void> {
    (component as any).parseCsv = vi.fn().mockResolvedValue(splitCsv(text));
    const file = makeCsvFile(text);
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    component['onFileSelected']({ target: input } as unknown as Event);
    await flushAsync();
  }

  async function uploadSampleFile(): Promise<void> {
    await uploadFile('First Name,Email\nAmira,amira@example.com\nZee,zee@example.com\n');
  }

  async function flushAsync(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  it('starts on the upload step with an empty parse state', () => {
    expect(component['step']()).toBe('upload');
    expect(component['rowCount']()).toBe(0);
  });

  it('parses an uploaded CSV into headers/rows and auto-maps recognizable columns', async () => {
    await uploadSampleFile();

    expect(component['headers']()).toEqual(['First Name', 'Email']);
    expect(component['rowCount']()).toBe(2);
    expect(component['mapping']()).toEqual(['first_name', 'email']);
  });

  it('computes mapped rows using only the mapped, non-blank fields', async () => {
    await uploadSampleFile();

    expect(component['mappedRows']()).toEqual([
      { first_name: 'Amira', email: 'amira@example.com' },
      { first_name: 'Zee', email: 'zee@example.com' },
    ]);
  });

  it('flags malformed emails as bad-email rows for the Review step', async () => {
    await uploadFile('First Name,Email\nAmira,amira@example.com\nBad,not-an-email\n');

    expect(component['badEmailRows']().map((r) => r.email)).toEqual(['not-an-email']);
    expect(component['validEmailRows']().map((r) => r.email)).toEqual(['amira@example.com']);
  });

  it('resets all wizard state and returns to the upload step on "Import another file"', async () => {
    await uploadSampleFile();
    component['step'].set('confirm');
    component['tagsText'].set('donor');

    component['startOver']();

    expect(component['step']()).toBe('upload');
    expect(component['rowCount']()).toBe(0);
    expect(component['tagsText']()).toBe('');
  });

  it('runs the import, polls until completion, and reports the done state', async () => {
    await uploadSampleFile();
    component['step'].set('confirm');

    await component['runImport']();

    expect(mockPersonsSvc.import).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: [
          { first_name: 'Amira', email: 'amira@example.com' },
          { first_name: 'Zee', email: 'zee@example.com' },
        ],
        duplicate_decision: 'merge',
      }),
    );
    expect(mockImportsSvc.list).toHaveBeenCalled();
    expect(component['run']()).toEqual({
      status: 'done',
      inserted: 2,
      merged: 0,
      skipped: 0,
      errors: 0,
      tag: 'Imported-20260101-0000',
      importId: 'imp-1',
    });
  });

  it('reports an error state when the import mutation rejects', async () => {
    await uploadSampleFile();
    mockPersonsSvc.import.mockRejectedValue(new Error('Server exploded'));

    await component['runImport']();

    expect(component['run']()).toEqual({ status: 'error', message: 'Server exploded' });
  });

  it('navigates to People and to the import history page from the done actions', () => {
    component['viewImportedPeople']();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/people']);

    component['backToHistory']();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/imports']);
  });
});
