import { ChangeDetectionStrategy, Component, OnInit, effect, inject, input, output, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { debounce, getAllOptionsType } from '@common';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';
import { AlertService } from '@uxcommon/alerts/alert-service';
import { ConfirmDialogService } from '@uxcommon/shared-dialog-service';

import { AgGridModule } from 'ag-grid-angular';
import {
  CellDoubleClickedEvent,
  CellMouseOverEvent,
  CellValueChangedEvent,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridOptions,
  GridReadyEvent,
  colorSchemeDarkBlue,
  themeQuartz,
} from 'ag-grid-community';

import { AbstractAPIService } from '../../abstract-api.service';
import { confirmDeleteAndRun, doExportCsv } from './datagrid.actions';
import { buildGridCallbacks } from './datagrid.callbacks';
import { createServerSideDatasource } from './datagrid.datasource';
import { navigateIfValid, viewIfAllowed } from './datagrid.nav';
import { DATA_GRID_CONFIG, DEFAULT_DATA_GRID_CONFIG, type DataGridConfig } from './datagrid.tokens';
import { createPayload } from './datagrid.utils';
import { SELECTION_COLUMN, defaultGridOptions } from './grid-defaults';
import { ClientSideStrategy, RowModelStrategy, ServerSideStrategy } from './row-model.strategy';
import { GridActionComponent } from './tool-button';
import { UndoManager } from './undo-redo-mgr';
import { SearchService } from 'apps/frontend/src/app/backend-svc/search-service';
import { ThemeService } from 'apps/frontend/src/app/layout/theme-service';
import { Models } from 'common/src/lib/kysely.models';

@Component({
  selector: 'pc-datagrid',
  imports: [AgGridModule, Icon, GridActionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './datagrid.html',
})
export class DataGrid<T extends keyof Models, U> implements OnInit {
  private readonly config = inject<DataGridConfig>(DATA_GRID_CONFIG, { optional: true }) ?? DEFAULT_DATA_GRID_CONFIG;
  private readonly dialogs = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly searchSvc = inject(SearchService);
  private readonly themeSvc = inject(ThemeService);

  private debouncedFilter = debounce(() => this.api?.onFilterChanged());

  // Other State
  private lastRowHovered: string | undefined;
  private rowModelType = signal<'clientSide' | 'serverSide'>('clientSide');

  // Row model strategy
  private strategy!: RowModelStrategy;

  // Injected Services
  protected readonly alertSvc = inject(AlertService);
  protected readonly distinctTags: string[] = [];
  protected readonly gridSvc = inject<AbstractAPIService<T, U>>(AbstractAPIService);

  // State & UI Signals
  protected readonly isRowSelected = signal(false);
  protected readonly router = inject(Router);
  protected readonly undoMgr = new UndoManager();

  // AG Grid
  protected api: GridApi<Partial<T>> | undefined;
  protected colDefsWithEdit: ColDef[] = [SELECTION_COLUMN];
  protected gridVisible = signal(false);
  protected mergedGridOptions: Partial<GridOptions> = {};

  public readonly importCSV = output<string>();
  public readonly updateUndoSizes = this.undoMgr.updateSizes.bind(this.undoMgr);

  // Inputs & Outputs
  public addRoute = input<string | null>(null);
  public colDefs = input<ColDef[]>([]);
  public disableDelete = input<boolean>(true);
  public disableExport = input<boolean>(false);
  public disableImport = input<boolean>(true);
  public disableRefresh = input<boolean>(false);
  public disableView = input<boolean>(true);
  public gridOptions = input<GridOptions<Partial<T>>>({});
  public limitToTags = input<string[]>([]);
  public plusIcon = input<PcIconNameType>('plus');

  constructor() {
    // React to global search
    effect(() => {
      const quickFilterText = this.searchSvc.getFilterText();
      if (this.rowModelType() === 'clientSide') {
        this.api?.updateGridOptions({ quickFilterText });
      } else {
        this.debouncedFilter();
      }
    });
  }

  /** Confirm and then delete selected rows */
  public async confirmDelete(): Promise<void> {
    if (this.disableDelete()) {
      this.alertSvc.showError(this.config.messages.noDeletePermission);
      return;
    }

    await confirmDeleteAndRun({
      dialogs: this.dialogs,
      alertSvc: this.alertSvc,
      api: this.api,
      getSelectedRows: () => this.getSelectedRows(),
      gridSvc: this.gridSvc,
      rowModelType: this.rowModelType(),
      mergedGridOptions: this.mergedGridOptions,
      config: this.config,
    });
  }

  public async ngOnInit() {
    const rowCount = await this.gridSvc.count();
    this.rowModelType.set(rowCount < this.config.clientServerThreshold ? 'clientSide' : 'serverSide');

    // Choose strategy
    this.strategy = this.rowModelType() === 'clientSide' ? new ClientSideStrategy() : new ServerSideStrategy();

    // Ensure getRowId is available (stringify to avoid number/string mismatches)
    const incoming = this.gridOptions();
    const getRowIdFn = incoming.getRowId ?? ((p: GetRowIdParams) => String((p.data as any)?.id));

    // Merge defaults → incoming → callbacks → strategy-specific
    this.mergedGridOptions = this.strategy.configureGridOptions({
      rowModelType: this.rowModelType(),
      ...defaultGridOptions,
      defaultColDef: {
        ...defaultGridOptions.defaultColDef,
        filter: this.rowModelType() === 'clientSide' ? 'agMultiColumnFilter' : null,
      },
      getRowId: getRowIdFn,
      ...incoming,
      ...buildGridCallbacks(this),
    });

    // Render grid after model type is chosen
    this.gridVisible.set(true);
  }

  /** Called when a row is hovered. Used to track row ID. */
  public onCellMouseOver(event: CellMouseOverEvent) {
    this.lastRowHovered = event?.data?.id;
  }

  /** Called when a cell changes. Persists changes via backend and manages undo. */
  public async onCellValueChanged(event: CellValueChangedEvent<Partial<T>>) {
    const key = event.colDef.field as keyof T;
    const row = event.data as Partial<T> & { id: string };

    if (this.shouldBlockEdit(row, key)) {
      this.undoMgr.undo();
      return this.alertSvc.showError(this.config.messages.editBlocked);
    }

    const payload = createPayload(row, key);
    const edited = await this.applyEdit(row.id, payload);

    if (!edited) {
      this.undoMgr.undo();
      return this.alertSvc.showError(this.config.messages.editFailed);
    }

    this.api?.flashCells({ rowNodes: [event.node], columns: [event.column] });
    this.undoMgr.updateSizes();
  }

  /** Called by AG Grid when ready. Sets up API, columns, and triggers refresh. */
  public onGridReady(params: GridReadyEvent) {
    this.colDefsWithEdit = [...this.colDefsWithEdit, ...this.colDefs()];
    this.api = params.api;

    if (this.rowModelType() === 'serverSide') {
      const ds = createServerSideDatasource({
        api: this.api!,
        gridSvc: this.gridSvc,
        searchSvc: this.searchSvc,
        limitToTags: () => this.limitToTags(),
        pageSize: this.config.pageSize,
      });
      this.api.setGridOption('serverSideDatasource', ds);
    }

    this.undoMgr.initialize(this.api);
    this.refresh();
  }

  /** Called when selection changes. Updates selected state. */
  public onSelectionChanged() {
    this.isRowSelected.set(this.getSelectedRows().length > 0);
  }

  /** Opens edit form for row. */
  public openEdit(id: string) {
    return this.view(id);
  }

  /** Cancels the fetch call and hides loader. */
  public sendAbort() {
    this.gridSvc.abort();
    this.api?.hideOverlay();
  }

  /** Navigates to view route for given ID or last hovered ID. */
  public view(id?: string) {
    return viewIfAllowed({
      id,
      lastRowHovered: this.lastRowHovered,
      disableView: this.disableView(),
      navigate: (path) => navigateIfValid(this.router, this.route, path),
    });
  }

  /** Navigates to add route. */
  protected add() {
    navigateIfValid(this.router, this.route, this.addRoute());
  }

  /** Warn about export scope, then export */
  protected async confirmExport(): Promise<void> {
    await doExportCsv({
      dialogs: this.dialogs,
      api: this.api,
      alertSvc: this.alertSvc,
      config: this.config,
    });
  }

  /** Triggers the import CSV flow (placeholder only). */
  protected doImportCSV() {}

  /** Actually performs export via AG Grid. */
  protected exportToCSV() {
    this.api?.exportDataAsCsv();
  }

  protected filter() {
    if (this.api?.isSideBarVisible()) {
      this.api?.setSideBarVisible(false);
    } else {
      this.api?.setSideBarVisible(true);
      this.api?.openToolPanel(this.config.filterToolPanelId);
    }
  }

  /** Utility: sets ID for each row (keep it stringy for stability) */
  protected getRowId(row: GetRowIdParams) {
    return String(row.data.id);
  }

  /** Utility: returns selected rows from grid */
  protected getSelectedRows() {
    return this.api?.getSelectedRows() as (Partial<T> & { id: string })[];
  }

  /** Utility: returns AG Grid theme class */
  protected getTheme() {
    return this.themeSvc.getTheme() === 'light' ? themeQuartz : themeQuartz.withPart(colorSchemeDarkBlue);
  }

  /** Called when row is double-clicked. */
  protected openEditOnDoubleClick(event: CellDoubleClickedEvent) {
    this.openEdit(event.data.id);
  }

  /** Triggers a full grid refresh via backend. */
  protected async refresh(): Promise<void> {
    try {
      this.api?.setGridOption('loading', true);
      if (this.rowModelType() === 'clientSide') {
        const rowData = await this.gridSvc.getAll({ tags: this.limitToTags() } as Partial<getAllOptionsType>);
        this.api?.setGridOption('rowData', rowData.rows as Partial<T>[]);
      } else {
        (this.api as any).refreshServerSide?.({ purge: true });
      }
    } catch (error) {
      this.alertSvc.showError(this.config.messages.loadFailed);
    } finally {
      this.api?.setGridOption('loading', false);
    }
  }

  /** Helper: applies single-field patch */
  private async applyEdit(id: string, data: Partial<T>): Promise<boolean> {
    return this.gridSvc
      .update(id, data as U)
      .then(() => true)
      .catch(() => false);
  }

  /** Helper: prevents editing specific fields */
  private shouldBlockEdit(row: Partial<T>, key: keyof T): boolean {
    return 'deletable' in row && (row as any).deletable === false && (key as string) === 'name';
  }
}
