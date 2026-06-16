//tsco: ignore

import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { cloneQueryBuilderNode, getAllOptionsType, QueryBuilderGroupNode, QueueExportInputType } from '@common';
import { Icon } from '@icons/icon';
import { PcIconNameType } from '@icons/icons.index';
import { Tags } from '@uxcommon/components/tags/tags';
import { AbstractAPIService } from '@frontend/services/api/abstract-api.service';
import { SearchService } from '@frontend/services/api/search-service';
import { ConfirmDialogService } from '@frontend/services/shared-dialog.service';
import { type SortingState, ColumnDef as TSColumnDef, type Updater } from '@tanstack/table-core';
// Virtualizer handled via controller
// Context available for future slices/controllers (not yet used here)
// import { GridContextService } from './state/grid-context.service';
import { AlertService } from '@uxcommon/components/alerts/alert-service';
import { createLoadingGate } from '@uxcommon/loading-gate';

import { DataGridColumnsService } from './services/columns.service';
import { PinningController } from './controllers/pinning.controller';
import { DataGridDataService } from './services/data.service';
import { DataGridFiltersService, type SelectEditorOptions } from './services/filters.service';
import { DataGridSelectionService } from './services/selection.service';
import { DataGridTableService } from './services/table.service';
import { DataGridActionsService } from './services/actions.service';
import { DataGridNavService } from './services/nav.service';
import { DATA_GRID_CONFIG, DEFAULT_DATA_GRID_CONFIG, type DataGridConfig } from './datagrid.tokens';
import { DataGridUtilsService } from './services/utils.service';
import { type ColumnDef as ColDef, SELECTION_COLUMN } from './grid-defaults';
import { TagOptionsService } from './services/tag-options.service';
import { DataGridToolbarComponent } from './ui/datagrid-toolbar';
import { DataGridFilterPanelComponent } from './ui/datagrid-filter-panel';
import { GridTagFilterService } from './services/grid-tag-filter.service';
import { GridAdvancedFilterService } from './services/grid-advanced-filter.service';
import { TagsService } from '@experiences/tags/services/tags-service';
import { ListsService } from '@experiences/lists/services/lists-service';
import { QueryBuilderField, QueryBuilderComponent } from '@uxcommon/components/query-builder/query-builder';
// Header and inline filters rendered inline in template now
import { EditableCellDirective } from './directives/editable-cell.directive';
import { HeaderResizeDirective } from './directives/header-resize.directive';
import { GridStoreService } from './services/grid-store.service';
import { ResizingController } from './controllers/resizing.controller';
import { ReorderController } from './controllers/reorder.controller';
import { KeyboardController } from './controllers/keyboard.controller';
import { EditingController } from './controllers/editing.controller';
import { FetchController } from './controllers/fetch.controller';
import { UndoManager } from './undo-redo-mgr';
import { Models } from 'common/src/lib/kysely.models';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { GridHeaderComponent } from '../grid-header/grid-header';

@Component({
  selector: 'pc-datagrid',
  imports: [
    Icon,
    FormsModule,
    DataGridToolbarComponent,
    DataGridFilterPanelComponent,
    Tags,
    EditableCellDirective,
    HeaderResizeDirective,
    QueryBuilderComponent,
    GridHeaderComponent,
  ],
  templateUrl: './datagrid.html',
  styleUrl: './datagrid.css',
  providers: [
    GridStoreService,
    PinningController,
    ResizingController,
    ReorderController,
    KeyboardController,
    EditingController,
    FetchController,
  ],
})
export class DataGrid<T extends keyof Models, U> implements OnInit, AfterViewInit, OnDestroy {
  public readonly config = inject<DataGridConfig>(DATA_GRID_CONFIG, { optional: true }) ?? DEFAULT_DATA_GRID_CONFIG;
  protected readonly dialogs = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly searchSvc = inject(SearchService);

  // Header resize handled by ResizingController

  //private readonly themeSvc = inject(ThemeService);
  public readonly _loading = createLoadingGate();

  // Persistence
  private _persistKey = 'pcdg';
  // selection width tracked in store
  // Selection resize handled by ResizingController
  // dragColId handled in ReorderController
  // Infinite append state handled by controller
  private readonly gridTable = viewChild<ElementRef<HTMLTableElement>>('gridTable');

  // Sticky pin offsets
  // header widths tracked by PinningController

  // Other State
  private lastRowHovered: string | undefined;
  private oldFilterText = '';
  // pin offsets tracked by PinningController

  // Optional cache placeholder removed (unused in current implementation)
  private readonly scrollerRef = viewChild<ElementRef<HTMLDivElement>>('scroller');
  private readonly childGrid = viewChild(DataGrid);
  private tsColumns: TSColumnDef<any, any>[] = [];
  private tsTable: any;
  private readonly pctrl = inject(PinningController, { optional: true })!;
  private updateHeaderWidths = () => {
    const table = this.gridTable()?.nativeElement;
    if (!table) return;
    requestAnimationFrame(() => {
      if (!this.pctrl) return;
      this.pctrl.measureHeaderWidths(table);
      const minMap = this.computeHeaderMinWidths(table);
      if (Object.keys(minMap).length > 0) {
        this.headerMinWidths.set(minMap);
        this.enforceWidthMinimums(minMap);
      }
    });
  };
  // Virtualizer disabled for paginated grid

  // Injected Services
  protected readonly alertSvc = inject(AlertService);
  private readonly columnsSvc = inject(DataGridColumnsService);
  private readonly dataSvc = inject(DataGridDataService);
  private readonly filtersSvc = inject(DataGridFiltersService);
  private readonly selSvc = inject(DataGridSelectionService);
  private readonly tableSvc = inject(DataGridTableService);
  private readonly actionsSvc = inject(DataGridActionsService);
  private readonly navSvc = inject(DataGridNavService);
  private readonly utilsSvc = inject(DataGridUtilsService);
  private readonly store = inject(GridStoreService, { optional: true })!;
  private readonly rctrl = inject(ResizingController, { optional: true })!;
  private readonly kctrl = inject(KeyboardController, { optional: true })!;
  private readonly editingCtrl = inject(EditingController, { optional: true })!;
  private readonly fetchCtrl = inject(FetchController, { optional: true })!;
  private readonly reorder = inject(ReorderController, { optional: true })!;
  public readonly searchTerm = this.searchSvc.searchSignal;
  private readonly hasEditableColumns = signal(false);
  private readonly headerMinWidths = signal<Record<string, number>>({});
  private readonly dgListsSvc = inject(ListsService, { optional: true });
  /** Set of cell keys (rowId:field) currently showing the green "saved" flash animation */
  public readonly flashedCells = signal<Set<string>>(new Set());
  protected readonly countRowSelected = computed(() =>
    this.allSelected() ? this.allSelectedCount() : this.selectedIdSet().size,
  );

  private readonly selectionColumnWidthPx = 72;
  private readonly headerAutoSizeBufferPx = 8;

  protected columnWidthPx(colId: string | null | undefined): number {
    if (!colId) return this.columnMinWidthPx(colId);
    return this.getColWidth(colId) ?? this.columnMinWidthPx(colId);
  }

  protected columnMinWidthPx(colId: string | null | undefined): number {
    if (!colId) return 40;
    const colDef = this.getColDefById(colId);
    const configuredMin = colDef?.minWidth;
    if (typeof configuredMin === 'number' && configuredMin > 0) {
      return configuredMin;
    }
    const minMap = this.headerMinWidths();
    const measured = minMap[colId];
    if (typeof measured === 'number' && measured > 0) {
      return Math.max(40, Math.ceil(measured));
    }
    return 40;
  }

  private clampColumnWidth(id: string, px: number): number {
    const base = Math.max(40, Math.floor(px));
    return Math.max(this.columnMinWidthPx(id), base);
  }

  // Computed derivations
  // Page size selection (persisted via GridStoreService)
  protected readonly pageSize = this.store?.pageSize ?? signal(25);
  protected readonly pageSizeChoices = computed(() => {
    const base = [25, 50, 100];
    const current = this.pageSize();
    return base.includes(current) ? base : [current, ...base];
  });
  protected readonly totalPages = computed(() => this.dataSvc.computeTotalPages(this.totalCountAll(), this.pageSize()));
  protected readonly canNext = computed(() => this.pageIndex() + 1 < this.totalPages());
  protected readonly canPrev = computed(() => this.pageIndex() > 0);
  protected readonly displayedCount = computed(() => this.rows().length);
  protected readonly isEmptyState = computed(
    () => this.hasInitiatedLoad() && !this.isLoading() && this.totalCountAll() === 0,
  );
  /** True when the grid has data but active filters reduced the visible count to zero */
  protected readonly isFilteredEmpty = computed(() => {
    if (!this.hasInitiatedLoad() || this.isLoading() || this.totalCountAll() > 0) return false;
    const pf = this.panelFilters();
    const fv = this.filterValues();
    return Object.keys(pf).length > 0 || Object.keys(fv).length > 0;
  });
  public readonly hasActiveFilters = computed(() => {
    const pf = this.panelFilters();
    if (Object.keys(pf).length > 0) return true;

    const fv = this.filterValues();
    for (const key of Object.keys(fv)) {
      const val = fv[key];
      if (Array.isArray(val)) {
        if (val.length > 0) return true;
      } else if (val !== undefined && val !== null && val !== '') {
        return true;
      }
    }
    return false;
  });

  public isColFiltered(field: string): boolean {
    const fv = this.filterValues();
    const val = fv[field];
    if (Array.isArray(val)) {
      return val.length > 0;
    }
    return val !== undefined && val !== null && val !== '';
  }
  /** Becomes true the moment loading first starts — prevents empty-state flash on init */
  protected readonly hasInitiatedLoad = signal(false);
  protected readonly gridSvc = inject<AbstractAPIService<T, U>>(AbstractAPIService);
  protected readonly hasSelection = computed(() =>
    this.allSelected() ? this.allSelectedCount() > 0 : this.selectedIdSet().size > 0,
  );
  public readonly hasSingleSelection = computed(() =>
    this.allSelected() ? this.allSelectedCount() === 1 : this.selectedIdSet().size === 1,
  );

  // Display range helpers (1-based)
  protected readonly displayStartIndex = computed(() => {
    const total = this.totalCountAll();
    if (!total) return 0;
    return this.pageIndex() * this.pageSize() + 1;
  });
  protected readonly displayEndIndex = computed(() => {
    const total = this.totalCountAll();
    if (!total) return 0;
    const end = (this.pageIndex() + 1) * this.pageSize();
    return Math.min(end, total);
  });

  // Hidden columns list for header menu as a computed
  protected readonly hiddenColumns = computed(() => {
    const v = this.colVisibility();
    return this.colDefsWithEdit.map((c) => c.field as string).filter((f) => !!f && v[f] === false) as string[];
  });
  protected readonly selectedOnPageCount = computed(() => {
    if (this.allSelected()) return 0;
    const set = this.selectedIdSet();
    let cnt = 0;
    for (const r of this.rows()) {
      const id = this.toId(r);
      if (id && set.has(id)) cnt++;
    }
    return cnt;
  });
  public readonly rowNavigatesToDetail = computed(() => !this.disableView() && !this.hasEditableColumns());
  protected readonly isPageFullySelected = computed(() =>
    this.selSvc.isPageFullySelected(this.allSelected(), this.displayedCount(), this.selectedOnPageCount()),
  );

  // State & UI Signals
  // Removed isRowSelected in favor of hasSelection computed
  protected readonly router = inject(Router);
  public readonly undoMgr = new UndoManager();

  // Select-all-across-results state
  protected readonly allSelected = this.store?.allSelected ?? signal(false);
  protected readonly allSelectedCount = this.store?.allSelectedCount ?? signal(0);
  protected readonly allSelectedIdSet = this.store?.allSelectedIdSet ?? signal(new Set());
  protected readonly allSelectedIds = this.store?.allSelectedIds ?? signal([]);
  public archiveMode = signal(false);
  protected colDefsWithEdit: ColDef[] = [SELECTION_COLUMN];
  protected colVisibility = this.store?.colVisibility ?? signal({});
  public readonly colWidths = this.store?.colWidths ?? signal({});

  // Inline edit state
  protected editingCell = signal<{ id: string; field: string } | null>(null);
  protected editingValue = signal<any>('');
  /** Search text used to filter the tag checkbox panel. Cleared when a new cell opens. */
  protected tagSearch = signal('');
  protected filterValues = this.store?.filterValues ?? signal({});
  protected isLoading = this._loading.visible;
  public readonly isRefreshing = signal(false);
  protected pageIndex = this.store?.pageIndex ?? signal(0);
  protected panelFilters = this.store?.panelFilters ?? signal({});
  protected rowHeight = 36;

  // Table state (TanStack-like minimal state)
  protected rows = this.store?.rows ?? signal([]);
  protected selectedIdSet = this.store?.selectedIdSet ?? signal(new Set());
  protected selectionStickyWidth = this.store?.selectionStickyWidth ?? signal(48);
  protected showFilterPanel = signal(false);
  protected showFilters = signal(false);
  public sortCol = signal<string | null>(null);
  public sortDir = signal<'asc' | 'desc' | null>(null);
  protected sorting = signal<SortingState>([]);
  protected suppressHeaderDrag = false;
  public totalCountAll = signal(0);
  // viewport handled by controller

  public readonly importCSV = output<string>();
  public readonly showArchiveIcon = input<boolean>(false);
  public readonly archiveIcon = input<PcIconNameType>('archive-box');
  public readonly archiveTip = input<string>('See archived tasks');
  public readonly updateUndoSizes = this.undoMgr.updateSizes.bind(this.undoMgr);
  public readonly labelForFn = (f: string) => this.panelLabelFor(f);
  public readonly optionsForFn = (f: string) => this.panelOptionsFor(f);
  // Header handlers now called directly by pc-dg-header via injection
  // header resize handled by pcHeaderResize directive

  // Inline filters row injects DataGrid directly; no adapters needed

  // Row/cell adapters used by directives/templates
  public readonly toIdFn = (row: any) => this.toId(row);
  public readonly inputTypeForFn = (col: any) => this.inputTypeFor(col);
  public readonly createPayloadFn = (row: any, key: string) => this.utilsSvc.createPayload(row, key);
  public readonly updateEditedRowInCachesFn = (id: string, f: string | undefined, v: any, prev?: any) =>
    this.updateEditedRowInCaches(id, f, v, prev);
  public readonly updateTableWindowFn = (s: number, e: number) => this.updateTableWindow(s, e);
  // Expose a simple persist method for header/directives
  public requestPersist() {
    this.store?.requestPersist();
  }
  public readonly coerceFn = (c: any, raw: any) => this.coerceEditingValue(c, raw);

  public readonly editableCfg = (row: any, col: any) => ({
    row,
    col,
    toId: this.toIdFn,
    coerce: this.coerceFn,
    value: () => {
      const current = this.editingValue();
      return Array.isArray(current) ? [...current] : current;
    },
    setEditingCell: (v: { id: string; field: string } | null) => this.editingCell.set(v),
    setEditingValue: (v: any) => this.editingValue.set(v),
    getCellValue: (r: any, c: any) => this.getCellValue(r, c),
    getEditingDisplayValue: (r: any, c: any) => this.getEditingDisplayValue(r, c),
    createPayload: this.createPayloadFn,
    applyEdit: (id: string, data: any) =>
      this.gridSvc
        .update(id, data)
        .then(() => true)
        .catch(() => false),
    updateEditedRow: this.updateEditedRowInCachesFn,
    updateWindow: this.updateTableWindowFn,
    startIndex: () => this.startIndex(),
    endIndex: () => this.endIndex(),
    showSuccess: (m: string) => this.alertSvc.showSuccess(m),
    showError: (m: string) => this.alertSvc.showError(m),
    undo: () => this.undoMgr.undo(),
    customCommit: this.isTagColumn(col)
      ? async () => {
          await this.commitTagColumn(row, col);
        }
      : undefined,
    isEditable: () => this.isCellEditable(row, col),
    isEditingCell: () => {
      const ec = this.editingCell();
      return ec !== null && ec.id === this.toIdFn(row) && ec.field === col.field;
    },
  });

  // Inputs & Outputs
  public addRoute = input<string | null>(null);
  public viewRoute = input<string | null>(null);
  public allowFilter = input<boolean>(true);
  public colDefs = input<ColDef[]>([]);
  public disableDelete = input<boolean>(true);
  public disableMerge = input<boolean>(true);
  public disableExport = input<boolean>(false);
  public confirmDeleteOverride = input<((selected: any[]) => Promise<boolean | void>) | null>(null);
  public disableImport = input<boolean>(false);
  public disableRefresh = input<boolean>(false);
  public disableView = input<boolean>(true);
  public enableSelection = input<boolean>(true);
  public rowCanSelect = input<(row: any) => boolean>(() => true);
  public limitToTags = input<string[]>([]);
  public limitToIssues = input<string[]>([]);
  public plusIcon = input<PcIconNameType>('plus');

  public showToolbar = input<boolean>(true);

  public readonly externalAdvancedFilterModel = input<QueryBuilderGroupNode | null>(null);
  public listId = input<string | null>(null);
  public title = input<string | null>(null);
  public description = input<string | null>(null);

  protected readonly dgTagOptionsSvc = inject(TagOptionsService);

  // ── Tag / Issue filter — delegated to GridTagFilterService ───────────────
  private readonly tagFilter = new GridTagFilterService();

  // Proxy aliases — same public names the toolbar template accesses via grid.*
  public readonly allAvailableTags = this.tagFilter.allAvailableTags;
  public readonly selectedTags = this.tagFilter.selectedTags;
  public readonly tagSearchQuery = this.tagFilter.tagSearchQuery;
  public readonly allAvailableIssues = this.tagFilter.allAvailableIssues;
  public readonly selectedIssues = this.tagFilter.selectedIssues;
  public readonly issueSearchQuery = this.tagFilter.issueSearchQuery;
  public readonly filteredAvailableTags = this.tagFilter.filteredAvailableTags;
  public readonly filteredAvailableIssues = this.tagFilter.filteredAvailableIssues;

  // showTagFilter / showIssueFilter must stay here — they depend on the colDefs input signal
  public readonly showTagFilter = computed(() => {
    const defs = this.colDefs();
    return defs.some((col) => col.field === 'tags' || col.tagColumn === true);
  });

  public readonly showIssueFilter = computed(() => {
    const defs = this.colDefs();
    return defs.some((col) => col.field === 'issues' || col.field === 'issue');
  });

  public toggleTagFilter(tag: string, checked: boolean) {
    this.tagFilter.toggleTagFilter(tag, checked);
  }
  public clearTagsFilter() {
    this.tagFilter.clearTagsFilter();
  }
  public selectAllTags() {
    this.tagFilter.selectAllTags();
  }
  public clearAllTagsVisible() {
    this.tagFilter.clearAllTagsVisible();
  }
  public toggleIssueFilter(issue: string, checked: boolean) {
    this.tagFilter.toggleIssueFilter(issue, checked);
  }
  public clearIssuesFilter() {
    this.tagFilter.clearIssuesFilter();
  }
  public selectAllIssues() {
    this.tagFilter.selectAllIssues();
  }
  public clearAllIssuesVisible() {
    this.tagFilter.clearAllIssuesVisible();
  }

  public selectedListId = signal<string | null>(null);
  public availableLists = signal<any[]>([]);
  public activeListId = computed(() => this.listId() || this.selectedListId());
  public readonly showListFilter = computed(() => {
    const entity = this.config.messages.exportEntity;
    return (entity === 'persons' || entity === 'households') && !!this.dgListsSvc;
  });

  public selectListFilter(id: string) {
    this.selectedListId.set(id);
    this.loadPage(0);
  }

  public clearListFilter() {
    this.selectedListId.set(null);
    this.loadPage(0);
  }

  // ── Advanced Filter Builder — delegated to GridAdvancedFilterService ──────
  public readonly advFilter = new GridAdvancedFilterService();
  protected readonly tagsSvc = inject(TagsService, { optional: true });

  // Proxy aliases — same public names used by the toolbar and datagrid.html
  public readonly showAdvancedFilterBuilder = this.advFilter.showAdvancedFilterBuilder;
  public readonly advFilterRoot = this.advFilter.advFilterRoot;
  public readonly hasActiveAdvancedFilters = this.advFilter.hasActiveAdvancedFilters;

  protected readonly advancedFilterFields = computed<QueryBuilderField[]>(() => {
    return this.colDefsWithEdit
      .filter((c) => c.field && c.field !== 'actions' && c.field !== SELECTION_COLUMN.field)
      .map((c) => {
        const fieldName = c.field!;
        const isTagCol = fieldName === 'tags' || fieldName === 'issues' || c.tagColumn === true;
        const operators = [
          { value: 'contains', label: 'contains' },
          { value: 'notContains', label: 'does not contain' },
          { value: 'equals', label: 'equals' },
          { value: 'notEquals', label: 'does not equal' },
          { value: 'startsWith', label: 'starts with' },
          { value: 'endsWith', label: 'ends with' },
          { value: 'isEmpty', label: 'is empty' },
          { value: 'isNotEmpty', label: 'is not empty' },
        ];
        return {
          name: fieldName,
          label: c.headerName || fieldName,
          operators,
          inputType: isTagCol ? ('autocomplete' as const) : ('text' as const),
        };
      });
  });

  public openAdvancedFilterBuilder() {
    this.advFilter.openAdvancedFilterBuilder(() => this.colDefsWithEdit);
  }
  public switchToAdvancedFilter() {
    this.advFilter.switchToAdvancedFilter(
      () => this.showFilterPanel.set(false),
      () => this.colDefsWithEdit,
    );
  }
  public applyAdvancedFilter() {
    this.advFilter.apply(() => this.doRefresh());
  }
  public clearAdvancedFilter() {
    this.advFilter.clear(() => this.doRefresh());
  }
  public onAdvancedFilterChanged() {
    this.advFilterRoot.update((root) => cloneQueryBuilderNode(root) as QueryBuilderGroupNode);
  }

  private _squelch = false;
  private _initialized = false;
  private _lastPageSize: number | null = null;

  constructor() {
    if (this.store) {
      this.store.grid = this;
    }
    effect(() => {
      const count = this.gridSvc.refreshCount();
      if (count > 0) {
        untracked(() => {
          void this.refresh();
        });
      }
    });

    // Mark that a load has started — prevents empty-state flash before first fetch
    effect(() => {
      if (this.isLoading()) this.hasInitiatedLoad.set(true);
    });

    // Clear the tag search box whenever a different cell enters edit mode
    effect(() => {
      this.editingCell();
      this.tagSearch.set('');
    });

    // Prevents being stuck on an out-of-range page after filters change.
    effect(() => {
      if (this._squelch) return;
      const total = this.totalPages();
      const page = this.pageIndex();
      if (total > 0 && page >= total) {
        this._squelch = true;
        queueMicrotask(async () => {
          await this.loadPage(Math.max(0, total - 1));
          this._squelch = false;
        });
      }
    });

    // React to global search (SSRM: trigger server-side filter)
    effect(() => {
      const quickFilterText = this.searchTerm();

      // Keep track of the old filter text to avoid unnecessary roundtrip
      if (quickFilterText != this.oldFilterText) {
        this.oldFilterText = quickFilterText as string;
        this.loadPage(0);
      }
    });
    // When page size changes, go back to first page (after init)
    effect(() => {
      const size = this.pageSize();
      if (!this._initialized) {
        this._lastPageSize = size;
        return;
      }
      if (this._lastPageSize === size) return;
      this._lastPageSize = size;
      void this.loadPage(0);
    });
    // Keep table data + selection + sorting synced when rows or sort change
    effect(() => {
      const rows = this.rows();
      // touch sort signals so effect re-runs when they change
      this.sortCol();
      this.sortDir();
      this.tableSvc.setTableData(
        this.tsTable,
        rows,
        this.buildRowSelectionForCurrentData(),
        this.sortCol(),
        this.sortDir(),
      );
    });

    // React to limitToTags input signal changes
    effect(() => {
      // Fallback to an empty array if the input is undefined or null
      const tags = this.limitToTags() || [];

      untracked(() => {
        this.tagFilter.selectedTags.set([...tags]);
        if (this._initialized) {
          this.doRefresh();
        }
      });
    });

    // React to limitToIssues input signal changes
    effect(() => {
      // Fallback to an empty array if the input is undefined or null
      const issues = this.limitToIssues() || [];

      untracked(() => {
        this.tagFilter.selectedIssues.set([...issues]);
        if (this._initialized) {
          this.doRefresh();
        }
      });
    });

    effect(() => {
      this.externalAdvancedFilterModel();
      untracked(() => {
        if (this._initialized) {
          this.doRefresh();
        }
      });
    });

    effect(() => {
      this.listId();
      untracked(() => {
        if (this._initialized) {
          this.doRefresh();
        }
      });
    });
    // Virtualizer count sync handled by controller
    // Pin offsets recompute centralized in PinningController

    effect(() => {
      const tool = this.showToolbar();
      console.log(tool, this.showToolbar(), this.title());
    });
  }

  public getCountRowSelected() {
    return this.countRowSelected();
  }

  /** Expose current grid filters/sort to build a definition */
  public getDefinition(): getAllOptionsType {
    return {
      searchStr: this.searchSvc.getFilterText(),
      sortModel: this.sorting().map((s) => ({ colId: s.id, sort: s.desc ? 'desc' : 'asc' })),
      filterModel: this.buildFilterModel(),
      tags: this.tagFilter.selectedTags(),
      issues: this.tagFilter.selectedIssues(),
    } as getAllOptionsType;
  }

  public ngAfterViewInit() {
    if (!this.store) {
      return;
    }
    // Virtualizer disabled for paged grid; no attach
    const el = this.scrollerRef()?.nativeElement as HTMLDivElement | undefined;
    void el; // reserved for future use
    // Attach controllers to the table once
    this.pctrl.attachTable(this.tsTable);
    this.pctrl.init({
      getColWidth: (id) => this.getColWidth(id),
      getSelectionWidth: () => this.selectionStickyWidth(),
      getPinState: () => this.tsTable?.getState?.().columnPinning ?? { left: [], right: [] },
    });
    // Measure header widths initially and on resize
    this.updateHeaderWidths();
    window.addEventListener('resize', this.updateHeaderWidths);
  }

  public ngOnDestroy(): void {
    if (!this.store) {
      return;
    }
    // Abort any inflight requests and release refs
    this.gridSvc.abort();
    this.tsTable = undefined;
    window.removeEventListener('resize', this.updateHeaderWidths);
  }

  public async ngOnInit() {
    if (!this.store) {
      return;
    }
    this.undoMgr.initialize(this);
    await this.tagFilter.init({
      limitToTags: this.limitToTags(),
      limitToIssues: this.limitToIssues(),
      tagOptionsSvc: this.dgTagOptionsSvc,
      doRefresh: () => this.doRefresh(),
    });
    if (this.showListFilter()) {
      try {
        const listsResult = await this.dgListsSvc!.getAll();
        const entity = this.config.messages.exportEntity;
        const expectedObject = entity === 'persons' ? 'people' : 'households';
        const rows = listsResult.rows ?? listsResult;
        const filtered = rows.filter((l: any) => l.object === expectedObject);
        this.availableLists.set(filtered);
      } catch (err) {
        console.error('Failed to load lists for filter:', err);
      }
    }
    this.selectionStickyWidth.set(this.selectionColumnWidthPx);
    // Initialize persistence key
    const urlKey = typeof window !== 'undefined' ? window.location?.pathname || '' : '';
    this._persistKey = `pcdg:${urlKey}`;
    // Attempt to read saved column order before table creation
    let savedColumnOrder: string[] | undefined;
    try {
      const raw = localStorage.getItem(this._persistKey);
      if (raw) {
        const data = JSON.parse(raw || '{}') as { order?: string[] };
        if (Array.isArray(data?.order)) savedColumnOrder = data.order as string[];
      }
    } catch {}
    // Note: allowFilter input retained for API compatibility (filter UI uses signals)
    const selectionCols = this.enableSelection() ? [SELECTION_COLUMN] : [];
    this.colDefsWithEdit = [...selectionCols, ...this.colDefs()];
    this.hasEditableColumns.set(this.colDefsWithEdit.some((col) => !!col?.editable));
    // Initialize column visibility defaults
    const vis: Record<string, boolean> = {};
    for (const c of this.colDefsWithEdit) if (c.field) vis[c.field] = c.hide !== true;
    this.colVisibility.set(vis);
    // Build TanStack columns
    this.tsColumns = this.tableSvc.buildTsColumns(this.colDefsWithEdit);
    this.tsTable = this.tableSvc.createGridTable({
      rows: this.rows(),
      columns: this.tsColumns,
      getRowId: (row: any) => this.toId(row),
      state: {
        sorting: this.sorting(),
        columnVisibility: this.colVisibility(),
        rowSelection: this.buildRowSelectionForCurrentData(),
        columnPinning: { left: [], right: [] },
        columnSizing: {},
        columnOrder: savedColumnOrder || [],
      },
      onStateChange: () => this.syncSignalsFromTable(),
      onSortingChange: (updater: Updater<SortingState>) => {
        const next = typeof updater === 'function' ? updater(this.tsTable!.getState().sorting) : updater;
        this.sorting.set(next);
        const first = next?.[0];
        this.sortCol.set(first?.id ?? null);
        this.sortDir.set(first?.desc ? 'desc' : first ? 'asc' : null);
        this.loadPage(0);
        this.store.requestPersist();
      },
      onRowSelectionChange: (updater: Updater<Record<string, boolean>>) => {
        const state = this.tsTable!.getState() as unknown as { rowSelection?: Record<string, boolean> };
        const current: Record<string, boolean> = state?.rowSelection ?? {};
        const next: Record<string, boolean> = typeof updater === 'function' ? updater(current) : updater;
        const set = new Set(this.selectedIdSet());
        const canSelectFn = this.rowCanSelect();
        for (const row of this.rows()) {
          const id = this.toId(row);
          if (!id) continue;
          if (canSelectFn && !canSelectFn(row)) {
            set.delete(id);
            continue;
          }
          if (next[id]) set.add(id);
          else set.delete(id);
        }
        this.selectedIdSet.set(set);
      },
      onColumnSizingChange: (updater: Updater<Record<string, number>>) => {
        const state = this.tsTable!.getState() as unknown as { columnSizing?: Record<string, number> };
        const current: Record<string, number> = state?.columnSizing || {};
        const next: Record<string, number> = typeof updater === 'function' ? updater(current) : updater;
        this.colWidths.set({ ...(next || {}) });
        this.tsTable!.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, columnSizing: next || {} } }));
        this.store.requestPersist();
      },
    });
    // Attach to store for syncing & persistence
    try {
      this.store.attachTable(this.tsTable);
      this.store.setPersistKey(this._persistKey);
      this.store.setGetRowId((row: any) => this.toId(row));
    } catch {}
    // Load persisted state and apply to table before first load
    // Set default page size from config; loadState may override with persisted value
    if (this.config.pageSize && this.config.pageSize > 0) this.store.pageSize.set(this.config.pageSize);
    this.store.loadState();
    this.selectionStickyWidth.set(this.selectionColumnWidthPx);
    await this.loadPage(0);
    this._initialized = true;
  }

  public triggerFilterChanged() {
    this.loadPage(0);
  }

  /** Navigates to add route. */
  protected add() {
    this.navSvc.navigateIfValid(this.router, this.route, this.addRoute());
  }
  public doAdd() {
    this.add();
  }

  protected cloneSelected() {
    if (!this.hasSingleSelection()) return;
    const selectedId = Array.from(this.selectedIdSet())[0];
    const selectedRow = this.rows().find((r) => this.toId(r) === selectedId);
    if (!selectedRow) return;

    void this.router.navigate([this.addRoute()], { relativeTo: this.route, state: { cloneData: selectedRow } });
  }

  public doClone() {
    this.cloneSelected();
  }

  protected applyPanelFilters() {
    const raw = this.panelFilters();
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) {
      const op = v?.op ?? 'contains';
      const sv = String(v?.value ?? '').trim();
      if (op === 'isEmpty' || op === 'isNotEmpty') {
        cleaned[k] = { op, value: '' };
      } else if (sv) {
        cleaned[k] = { op, value: sv };
      }
    }
    this.filterValues.set(cleaned);
    this.showFilterPanel.set(false);
    this.loadPage(0);
  }

  public ariaSortHeader(h: any): 'ascending' | 'descending' | 'none' {
    const s = typeof h?.column?.getIsSorted === 'function' ? h.column.getIsSorted() : undefined;
    if (s === 'asc') return 'ascending';
    if (s === 'desc') return 'descending';
    return 'none';
  }

  // Auto-size column based on header and currently visible cells
  public autoSizeColumn(h: any) {
    const id = this.getFieldFromHeader(h);
    if (!id) return;
    const table = this.gridTable()?.nativeElement;
    if (!table) return;
    const px = this.columnsSvc.computeAutoSizeWidth(table, id);
    if (px > 0) this.setColWidth(id, px);
    this.store?.requestPersist();
  }

  // Virtualizer padding not used in paginated mode

  // Build a compact filter model from current UI filter values
  public buildFilterModel(): Record<string, any> {
    return this.filtersSvc.buildFilterModel(this.filterValues());
  }

  protected readonly sanitizer = inject(DomSanitizer);

  /** Trust cell renderer HTML so [innerHTML] won't strip styles. */
  protected callCellRenderer(row: any, col: ColDef): SafeHtml {
    const fn: any = col.cellRenderer;
    if (typeof fn === 'function') {
      const value = this.hasValueFormatter(col) ? this.callValueFormatter(row, col) : this.getCellValue(row, col);

      const raw = fn({ data: row, value, colDef: col });

      // If renderers return strings (your current setup), trust them here.
      if (typeof raw === 'string') {
        return this.sanitizer.bypassSecurityTrustHtml(raw);
      }

      // If you later allow SafeHtml from some renderers, just return it.
      return raw as SafeHtml;
    }
    // Empty string is still valid SafeHtml
    return this.sanitizer.bypassSecurityTrustHtml('');
  }

  protected callValueFormatter(row: any, col: ColDef): any {
    const fn: any = col.valueFormatter;
    if (typeof fn === 'function') {
      return fn({ data: row, value: this.getCellValue(row, col), colDef: col });
    }
    return this.getCellValue(row, col);
  }

  // canNext/canPrev are computed
  protected cancelEdit() {
    this.editingCell.set(null);
  }

  /** Clear both grid selection and the select-all cache */
  protected clearAllSelection() {
    const child = this.childGrid();
    if (child) {
      child.clearAllSelection();
      return;
    }
    this.allSelected.set(false);
    this.allSelectedIds.set([]);
    this.allSelectedIdSet.set(new Set());
    this.allSelectedCount.set(0);
  }

  public clearHeaderFilter(field: string) {
    const next = { ...this.filterValues() };
    delete next[field];
    this.filterValues.set(next);
    this.loadPage(0);
    this.store?.requestPersist();
  }

  protected clearPanelFilters() {
    this.panelFilters.set({});
  }

  public clearSort(h: any) {
    if (typeof h?.column?.clearSorting === 'function') {
      h.column.clearSorting();
      return;
    }
    // Fallback: remove from sorting state
    const id = this.getFieldFromHeader(h);
    if (!id) return;
    const next = this.sorting().filter((s) => s.id !== id);
    this.sorting.set(next);
    this.tsTable?.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, sorting: next } }));
    this.loadPage(0);
  }

  protected closePanel() {
    this.showFilterPanel.set(false);
  }

  public columnLabelFor(id: string): string {
    const c = this.colDefsWithEdit.find((x) => x.field === id);
    return c?.headerName || id;
  }

  protected async commitEdit(row: any, col: ColDef) {
    if (!col.field) return;

    if (this.isTagColumn(col)) {
      await this.commitTagColumn(row, col);
      return;
    }

    const value = this.editingValue();
    if (this.editingCtrl) {
      await this.editingCtrl.commitSingleCell(row, col, this.coerceEditingValue(col, value));
    }
    this.editingCell.set(null);
  }

  protected async confirmMerge() {
    const selectedRows = this.getSelectedRows();
    console.log('selectedRows', selectedRows);
  }

  /** Confirm and then delete selected rows */
  protected async confirmDelete(selectedRows?: any[]): Promise<boolean | void> {
    if (this.disableDelete()) {
      this.alertSvc.showError(this.config.messages.noDeletePermission);
      return true;
    }

    const overrideFn = this.confirmDeleteOverride();
    if (overrideFn) {
      const selected = selectedRows || this.getSelectedRows();
      const handled = await overrideFn(selected);
      if (handled !== false) {
        this.clearAllSelection();
        await this.refresh();
        return true;
      }
    }

    await this.actionsSvc.confirmDeleteAndRun({
      _loading: this._loading,
      dialogs: this.dialogs,
      alertSvc: this.alertSvc,
      getSelectedRows: () => selectedRows || this.getSelectedRows(),
      gridSvc: this.gridSvc,
      config: this.config,
    });

    // Always clear our select-all cache after a delete attempt
    this.clearAllSelection();
    await this.refresh();
    return true;
  }
  public doConfirmDelete() {
    void this.confirmDelete();
  }

  public doConfirmMerge() {
    void this.confirmMerge();
  }
  /** Warn about export scope, then export */
  protected async confirmExport(): Promise<void> {
    await this.actionsSvc.doExportCsv({
      dialogs: this.dialogs,
      alertSvc: this.alertSvc,
      config: this.config,
      displayedCount: this.displayedCount(),
      totalCount: this.totalCountAll(),
      getRowsForExport: () => this.rows().map((r: any) => ({ ...r })),
      queueFullExport: () => this.queueFullExport(),
    });
  }
  public doConfirmExport() {
    void this.confirmExport();
  }

  protected cyclePin(h: any) {
    const current = this.pinState(h);
    const next = current === 'left' ? 'right' : current === 'right' ? false : 'left';
    const pin = h?.column?.pin;
    if (typeof pin === 'function') pin.call(h.column, next);
    this.store?.requestPersist();
  }

  /** Triggers the import CSV flow (placeholder only). */
  public doImportCSV() {
    // Emit a simple signal so consumers can open their import UI
    this.importCSV.emit('open');
  }

  public endIndex(): number {
    return this.rows().length;
  }

  // exportToCSV removed (legacy path)
  public filter() {
    // Open right-side filter panel and seed with current filters
    const current = this.filterValues();
    this.panelFilters.set(this.filtersSvc.preparePanelFilters(current));
    this.showFilterPanel.set(true);
  }

  // Helpers for template-safe access to dynamic fields/formatters/renderers
  protected getCellValue(row: any, col: ColDef): any {
    // Prefer valueGetter when provided
    const vget = col.valueGetter as ((p: any) => any) | undefined;
    if (typeof vget === 'function') {
      try {
        return vget({ data: row, colDef: col, value: row?.[col.field as string] });
      } catch {
        // fall through to field lookup
      }
    }
    const field = (col.field as string) || '';
    return field ? row?.[field] : undefined;
  }

  protected getEditingDisplayValue(row: any, col: ColDef): any {
    return this.getCellValue(row, col);
  }

  public getColDefById(id: string): ColDef | undefined {
    return this.colDefsWithEdit.find((c) => c.field === id);
  }

  public getColWidth(id: string): number | null {
    const col = this.tsTable?.getColumn?.(id);
    const size = typeof col?.getSize === 'function' ? Number(col.getSize()) : undefined;
    const min = this.columnMinWidthPx(id);
    if (size && size > 0) return Math.max(size, min);
    const stored = this.colWidths()[id];
    if (typeof stored === 'number') return Math.max(stored, min);
    return min;
  }

  // displayedCount is computed
  protected getFieldFromHeader(h: any): string | null {
    const id = h?.column?.id;
    return typeof id === 'string' ? id : null;
  }

  protected getFilterArray(field: string): string[] {
    return this.filtersSvc.getFilterArray(this.filterValues(), field);
  }

  // Helper to derive filter select options from a column definition
  public getFilterOptionsForCol(col: ColDef): string[] | null {
    return this.filtersSvc.getFilterOptionsForCol(col);
  }

  protected selectEditorOptions(col: ColDef): SelectEditorOptions | null {
    return this.filtersSvc.getSelectEditorOptions(col);
  }

  /**
   * Called when the user picks a value from a single-select dropdown editor.
   * Immediately commits so the backend is updated without requiring Enter/blur.
   */
  protected async onSelectChange(row: any, col: ColDef, newValue: any) {
    const resolvedValue = Array.isArray(newValue) ? newValue[0] : newValue;
    // Update the editing value first so commitEdit reads the correct value
    this.editingValue.set(resolvedValue);
    await this.commitEdit(row, col);
  }

  protected tagsAsStrings(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const tags: string[] = [];
    for (const entry of value) {
      const normalized = entry == null ? '' : String(entry).trim();
      if (normalized) tags.push(normalized);
    }
    return tags;
  }

  protected async handleTagRemoved(row: any, col: ColDef, tagName: string) {
    if (!col?.field || !this.isTagColumn(col)) return;
    const trimmed = typeof tagName === 'string' ? tagName.trim() : '';
    if (!trimmed) return;

    const current = this.getCellValue(row, col);
    const previous = this.utilsSvc.normalizeTagSelection(current);
    if (!previous.includes(trimmed)) return;

    const next = previous.filter((tag) => tag !== trimmed);
    await this.persistTagSelection(row, col, next, {
      successMessage: `Removed tag "${trimmed}"`,
    });
  }

  protected isTagColumn(col: ColDef): boolean {
    if (!col) return false;
    if (col.tagColumn) return true;
    const field = (col.field ?? '').toLowerCase();
    return field === 'tags' || field === 'issues';
  }

  protected async commitTagColumn(row: any, col: ColDef) {
    try {
      const next = this.utilsSvc.normalizeTagSelection(this.editingValue());
      await this.persistTagSelection(row, col, next);
    } finally {
      this.editingCell.set(null);
    }
  }

  /** Returns sorted available tag choices for the inline checkbox editor. */
  protected tagEditorChoices(col: ColDef): string[] {
    const opts = this.selectEditorOptions(col);
    return (opts?.choices.map((c) => c.value).filter(Boolean) ?? []).sort();
  }

  /** tagEditorChoices filtered by the current tagSearch text. */
  protected filteredTagChoices(col: ColDef): string[] {
    const q = this.tagSearch().trim().toLowerCase();
    const all = this.tagEditorChoices(col);
    return q ? all.filter((t) => t.toLowerCase().includes(q)) : all;
  }

  /** Whether a tag name is currently checked in the inline editor. */
  protected isTagChecked(tag: string): boolean {
    const v = this.editingValue();
    return Array.isArray(v) && v.includes(tag);
  }

  /** Adds or removes a tag from the inline editor's working selection. */
  protected toggleTagInEditor(tag: string, checked: boolean) {
    const current: string[] = Array.isArray(this.editingValue()) ? [...this.editingValue()] : [];
    if (checked && !current.includes(tag)) {
      this.editingValue.set([...current, tag]);
    } else if (!checked) {
      this.editingValue.set(current.filter((t) => t !== tag));
    }
  }

  protected async persistTagSelection(row: any, col: ColDef, desired: string[], opts?: { successMessage?: string }) {
    const field = col.field;
    if (!field) return;

    const id = this.toId(row);
    if (!id) return;

    const previous = this.utilsSvc.normalizeTagSelection(this.getCellValue(row, col));
    const next = this.utilsSvc.normalizeTagSelection(desired);

    const diff = this.diffTagSelection(previous, next);
    if (!diff.hasChanges) return;
    const applyTags = (tags: string[], prevTags?: string[]) => {
      const safe = Array.isArray(tags) ? [...tags] : [];
      (row as Record<string, unknown>)[field] = safe;
      this.updateEditedRowInCachesFn(id, field, safe, prevTags);
      this.updateTableWindowFn(this.startIndex(), this.endIndex());
    };

    applyTags(next, previous);

    try {
      const removedTeamNames = await this.applyTagDiff(id, diff, col);
      const finalTags = await this.refreshTagsFromServer(id, next, col);
      applyTags(finalTags, previous);
      this.notifyTagSuccess(opts?.successMessage, removedTeamNames, diff);
    } catch {
      applyTags(previous, previous);
      const errorMsg =
        col.cellRendererParams?.tagType === 'issue' ? 'Failed to update issues' : 'Failed to update tags';
      this.alertSvc.showError(errorMsg);
    }
  }

  private diffTagSelection(previous: string[], next: string[]): TagDiff {
    const toAdd = next.filter((tag) => !previous.includes(tag));
    const toRemove = previous.filter((tag) => !next.includes(tag));
    return {
      toAdd,
      toRemove,
      hasChanges: toAdd.length > 0 || toRemove.length > 0,
    };
  }

  private async applyTagDiff(id: string, diff: TagDiff, col?: ColDef): Promise<string[]> {
    const removedTeamNames: string[] = [];
    const type = col?.cellRendererParams?.tagType ?? 'tag';

    for (const tag of diff.toRemove) {
      const detachResult = await this.gridSvc.detachTag(id, tag, type);
      if (detachResult === false) {
        throw new Error('Tag removal was rejected');
      }
      const teams = (detachResult as any)?.removed_teams;
      if (Array.isArray(teams)) {
        for (const team of teams) {
          removedTeamNames.push(team?.name || 'Unnamed team');
        }
      }
    }

    for (const tag of diff.toAdd) {
      await this.gridSvc.attachTag(id, tag, type);
    }

    // Bust the cache so the next tag/issue dropdown open re-fetches fresh names
    if (diff.toAdd.length > 0 || diff.toRemove.length > 0) {
      this.dgTagOptionsSvc.invalidate(type as 'tag' | 'issue');
    }

    return removedTeamNames;
  }

  private async refreshTagsFromServer(id: string, fallback: string[], col?: ColDef): Promise<string[]> {
    try {
      const type = col?.cellRendererParams?.tagType ?? 'tag';
      const refreshed = await this.gridSvc.getTags(id, type);
      if (Array.isArray(refreshed)) {
        return [...refreshed];
      }
    } catch {
      // ignore refresh errors; fall back to optimistic state
    }
    return fallback;
  }

  private notifyTagSuccess(successMessage: string | undefined, removedTeamNames: string[], diff: TagDiff) {
    const hasRemovedTeams = removedTeamNames.length > 0;
    const message = successMessage ?? this.buildTagSuccessMessage(diff);
    if (!message && !hasRemovedTeams) return;

    if (message) {
      if (hasRemovedTeams) {
        this.alertSvc.showSuccess(`${message}; removed from teams: ${removedTeamNames.join(', ')}`);
      } else {
        this.alertSvc.showSuccess(message);
      }
      return;
    }

    this.alertSvc.showSuccess(`Removed from teams: ${removedTeamNames.join(', ')}`);
  }

  private buildTagSuccessMessage(diff: TagDiff): string | undefined {
    const additions = diff.toAdd;
    const removals = diff.toRemove;
    if (!additions.length && !removals.length) return undefined;

    if (additions.length && !removals.length) {
      return additions.length === 1 ? `Added tag "${additions[0]}"` : `Added ${additions.length} tags`;
    }

    if (removals.length && !additions.length) {
      return removals.length === 1 ? `Removed tag "${removals[0]}"` : `Removed ${removals.length} tags`;
    }

    const parts: string[] = [];
    if (additions.length) {
      parts.push(additions.length === 1 ? `added "${additions[0]}"` : `added ${additions.length} tags`);
    }
    if (removals.length) {
      parts.push(removals.length === 1 ? `removed "${removals[0]}"` : `removed ${removals.length} tags`);
    }
    return `Tags updated (${parts.join('; ')})`;
  }

  protected multiSelectHeight(options: SelectEditorOptions | null): string | null {
    if (!options?.multiple) return null;
    const rows = options.size && options.size > 0 ? Math.floor(options.size) : 5;
    const rowHeightRem = 1.6;
    const paddingRem = 0.75;
    return `${rows * rowHeightRem + paddingRem}rem`;
  }

  protected getTextEditorConfig(col: ColDef): { textarea: boolean; rows: number } {
    const params = this.resolveEditorParams(col);
    const multilineFlag = Boolean(params?.textarea ?? params?.multiline);
    const rowsRaw = params?.rows ?? params?.textareaRows ?? params?.lines;
    const rowsNum = Number(rowsRaw);
    const rows = Number.isFinite(rowsNum) && rowsNum > 0 ? Math.floor(rowsNum) : 5;
    return { textarea: multilineFlag, rows: multilineFlag ? rows : 1 };
  }

  public getFilterValue(field: string): string {
    return this.filtersSvc.getFilterValue(this.filterValues(), field);
  }

  /** Utility: returns selected rows from grid */
  protected getSelectedRows(): (Partial<RowOf<T>> & { id: string })[] {
    const child = this.childGrid();
    if (child) {
      return child.getSelectedRows() as (Partial<RowOf<T>> & { id: string })[];
    }
    const currentRows = this.rows();
    const rowById = new Map<string, RowOf<T>>();
    for (const row of currentRows) {
      const id = this.toId(row);
      if (id) rowById.set(id, row as RowOf<T>);
    }

    const toRow = (id: string) => {
      const fromPage = rowById.get(id);
      if (fromPage) {
        return { ...(fromPage as unknown as Record<string, unknown>), id } as unknown as RowOf<T>;
      }
      return { id } as unknown as RowOf<T>;
    };

    if (this.allSelected()) {
      const ids = this.allSelectedIds();
      return ids.map((id) => toRow(id)) as unknown as (Partial<RowOf<T>> & { id: string })[];
    }
    const ids = this.selectedIdSet();
    return Array.from(ids).map((id) => toRow(id)) as unknown as (Partial<RowOf<T>> & { id: string })[];
  }

  /** Bridge for column-level click handlers */
  protected handleCellClick(row: any, col: ColDef) {
    if (col.isCellInteractive && !col.isCellInteractive(row)) return;
    if (typeof col.onCellClicked === 'function') {
      col.onCellClicked({ data: row, colDef: col });
    }
  }

  /** Bridge for column-level double-click handlers */
  protected handleCellDblClick(row: any, col: ColDef) {
    if (col.isCellInteractive && !col.isCellInteractive(row)) return;
    if (this.isCellEditable(row, col)) {
      this.startEdit(row, col);
      return;
    }
    if (typeof col.onCellDoubleClicked === 'function') {
      col.onCellDoubleClicked({ data: row, colDef: col });
    } else {
      this.openEditOnDoubleClick(row);
    }
  }

  protected hasCellRenderer(col: ColDef): boolean {
    return !!col.cellRenderer;
  }

  protected hasValueFormatter(col: ColDef): boolean {
    return typeof col.valueFormatter === 'function';
  }

  // headerClick removed; using explicit header API bindings instead

  protected headerGroups(): any[] {
    const tbl: any = this.tsTable;
    return tbl?.getHeaderGroups?.() || [];
  }

  protected hideAllCols() {
    const v = { ...this.colVisibility() };
    for (const c of this.colDefsWithEdit) if (c.field) v[c.field] = false;
    this.colVisibility.set(v);
    if (this.tsTable)
      this.tsTable.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, columnVisibility: v } }));
  }
  public hideAllColsPublic() {
    this.hideAllCols();
  }

  public hideColumn(h: any) {
    const id = this.getFieldFromHeader(h);
    if (!id) return;
    this.toggleCol(id, false);
    if (typeof h?.column?.toggleVisibility === 'function') h.column.toggleVisibility(false);
  }

  // Inline filter row helpers for multi-select label
  public inlineFilterLabel(field: string): string {
    return this.filtersSvc.inlineFilterLabel(this.filterValues(), field);
  }

  protected inputTypeFor(col: ColDef): 'text' | 'number' | 'date' | 'color' {
    const t = String(col?.cellDataType || '').toLowerCase();
    if (t === 'number' || t === 'numeric') return 'number';
    if (t === 'date' || t === 'datetime' || t === 'dateonly') return 'date';
    if (t === 'color' || t === 'colour') return 'color';
    return 'text';
  }

  // Toolbar helpers
  public canUndo() {
    return !!this.undoMgr.canUndo();
  }
  public canRedo() {
    return !!this.undoMgr.canRedo();
  }
  public undo() {
    this.undoMgr.undo();
  }
  public redo() {
    this.undoMgr.redo();
  }
  public showFiltersState() {
    return this.showFilterPanel() || this.showFilters();
  }
  public archiveModeState() {
    return this.archiveMode();
  }
  public hasSelectionState() {
    return this.hasSelection();
  }
  public getColDefsForToolbar() {
    return this.colDefsWithEdit;
  }
  public getColVisibilityMap() {
    return this.colVisibility();
  }

  protected isColVisible(c: ColDef): boolean {
    const v = this.colVisibility();
    if (!c.field) return true;
    return v[c.field] !== false;
  }

  // Inline edit helpers
  protected isEditable(col: ColDef): boolean {
    return !!col?.editable;
  }

  protected isCellEditable(row: any, col: ColDef): boolean {
    if (!this.isEditable(col)) return false;
    const canSelectFn = this.rowCanSelect();
    if (canSelectFn && !canSelectFn(row)) return false;
    return true;
  }

  protected isCellPointerInteractive(row: any, col: ColDef | undefined): boolean {
    if (!col) return false;
    if (col.isCellInteractive && !col.isCellInteractive(row)) return false;
    if (this.isCellEditable(row, col)) return false;
    if (typeof col.onCellDoubleClicked === 'function') return true;
    if (typeof col.onCellClicked === 'function') return true;
    return !this.disableView();
  }

  protected isPointerInteractive(col: ColDef | undefined): boolean {
    if (!col) return false;
    if (this.isEditable(col)) return false;
    if (typeof col.onCellDoubleClicked === 'function') return true;
    if (typeof col.onCellClicked === 'function') return true;
    return !this.disableView();
  }

  public isOptionChecked(field: string, option: string): boolean {
    return this.getFilterArray(field).includes(option);
  }

  /** Whether the current page (displayed rows) is fully selected */
  // isPageFullySelected is computed
  protected isRowChecked(id: string): boolean {
    return this.allSelected() ? this.allSelectedIdSet().has(id) : this.selectedIdSet().has(id);
  }

  // Theme no-op (unused)

  // Sorting
  protected isSortable(col: ColDef): boolean {
    return !!col.field; // simple toggle; extend as needed
  }

  // TanStack helpers
  protected leafHeaders(): any[] {
    const tbl: any = this.tsTable;
    if (!tbl) return [];
    // Flat headers correspond to leaf columns
    return (tbl.getFlatHeaders?.() || []).filter((h: any) => h.column?.getIsVisible?.());
  }

  public leftOffsetPx(colId: string): number {
    return this.pctrl?.leftOffsetPx(colId) ?? 0;
  }

  // merge action removed

  // Button-driven next page: replace current data
  protected async nextPage() {
    if (!this.canNext()) return;
    await this.loadPage(this.pageIndex() + 1, false);
  }

  // First/Last page navigation
  protected async firstPage() {
    if (!this.canPrev()) return;
    await this.loadPage(0, false);
  }
  protected async lastPage() {
    const last = Math.max(0, this.totalPages() - 1);
    if (this.pageIndex() >= last) return;
    await this.loadPage(last, false);
  }

  // Keyboard navigation between cells
  protected onCellKeydown(ev: KeyboardEvent) {
    // Ignore key handling when an input/select inside the cell is focused
    const tag = (ev.target as HTMLElement)?.tagName?.toLowerCase?.() || '';
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    this.kctrl?.handleCellKeydown(ev, {
      getColDefById: (id) => this.getColDefById(id),
      isEditable: (col) => this.isEditable(col),
      startEdit: (row, col) => this.startEdit(row, col),
      rows: () => this.rows(),
    });
  }

  /** Called when a row is hovered. Used to track row ID. */
  protected onCellMouseOver(row: any) {
    this.lastRowHovered = row?.id;
  }

  // Handle filter input changes
  protected onFilterInput(field: string, value: any) {
    const next = { ...this.filterValues() };
    if (value === undefined || value === null || String(value).trim() === '') delete next[field];
    else next[field] = value;
    this.filterValues.set(next);
    this.loadPage(0);
  }

  public onHeaderCheckbox(checked: boolean) {
    if (this.allSelected()) this.allSelected.set(false);
    const api: any = this.tsTable;
    if (typeof api?.toggleAllRowsSelected === 'function') api.toggleAllRowsSelected(checked);
  }

  public onHeaderDragOver(_h: any, ev: DragEvent) {
    this.reorder?.onDragOver(ev);
  }

  // Column reordering (drag-and-drop)
  public onHeaderDragStart(h: any, ev: DragEvent) {
    this.reorder?.configure({
      suppressHeaderDrag: () => this.suppressHeaderDrag,
      requestPersist: () => this.store?.requestPersist(),
    });
    this.reorder?.onDragStart(h, ev);
  }

  public onHeaderDrop(h: any, ev: DragEvent) {
    this.reorder?.onDrop(h, ev, this.tsTable);
  }

  public onHeaderFilterInput(field: string, value: any) {
    const v = String(value ?? '').trim();
    const next = { ...this.filterValues() };
    if (!v) delete next[field];
    else next[field] = { op: 'contains', value: v };
    this.filterValues.set(next);
    this.loadPage(0);
    this.store?.requestPersist();
  }

  // header resize is handled via HeaderResizeDirective

  protected onPanelOpChange(field: string, op: string) {
    const next = { ...this.panelFilters() };
    const prev = next[field] || { op: 'contains', value: '' };
    next[field] = { ...prev, op };
    this.panelFilters.set(next);
  }

  protected onPanelValueChange(field: string, value: any) {
    const next = { ...this.panelFilters() };
    const prev = next[field] || { op: 'contains', value: '' };
    next[field] = { ...prev, value };
    this.panelFilters.set(next);
  }

  protected onRowCheckboxChange(row: any, checked: boolean) {
    if (this.allSelected()) {
      const id = this.toId(row.original ?? row);
      if (!id) return;
      const canSelectFn = this.rowCanSelect();
      if (canSelectFn && !canSelectFn(row.original ?? row)) {
        return;
      }
      const current = this.allSelectedIdSet();
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      this.allSelectedIdSet.set(next);
      return;
    }
    if (typeof row?.toggleSelected === 'function') {
      const canSelectFn = this.rowCanSelect();
      if (canSelectFn && !canSelectFn(row.original ?? row)) {
        return;
      }
      row.toggleSelected(checked);
    }
  }

  // Virtualization helpers
  protected onScroll(event: Event) {
    // No infinite scroll or virtualization-driven paging; ignore scroll.
    // Keep handler to allow future enhancements.
    void event;
  }

  // Prevent drag-reorder when grabbing selection resizer
  public onSelectionResizeDragStart(ev: DragEvent) {
    try {
      ev.preventDefault();
    } catch {}
    ev.stopPropagation();
  }

  // Selection column resize
  public onSelectionResizeMouseDown(ev: MouseEvent) {
    ev.stopPropagation();
    const startW = this.selectionStickyWidth();
    this.rctrl?.beginSelectionResize(
      ev.clientX,
      startW,
      (w) => {
        this.selectionStickyWidth.set(w);
      },
      () => this.store?.requestPersist(),
    );
  }

  public onSelectionResizeTouchStart(ev: TouchEvent) {
    ev.stopPropagation();
    const x = ev.touches?.[0]?.clientX ?? 0;
    const startW = this.selectionStickyWidth();
    this.rctrl?.beginSelectionResizeTouch(
      x,
      startW,
      (w) => {
        this.selectionStickyWidth.set(w);
      },
      () => this.store?.requestPersist(),
    );
  }

  public onToggleFilterOption(field: string, option: string, checked: boolean) {
    const current = this.getFilterArray(field);
    let nextArr: string[] = current.slice();
    if (checked && !nextArr.includes(option)) nextArr.push(option);
    if (!checked) nextArr = nextArr.filter((o) => o !== option);
    const next: Record<string, any> = { ...this.filterValues() };
    if (nextArr.length === 0) delete next[field];
    else next[field] = { op: 'in', value: nextArr };
    this.filterValues.set(next);
    this.loadPage(0);
    this.store?.requestPersist();
  }

  /** Opens edit form for row. */
  protected openEdit(id: string) {
    return this.view(id);
  }

  /** Called when row is double-clicked. */
  protected openEditOnDoubleClick(row: any) {
    this.openEdit(row?.id);
  }

  // Filter panel actions
  protected panelFields(): string[] {
    return this.colDefsWithEdit.filter((c) => !!c.field).map((c) => c.field!) as string[];
  }

  protected panelLabelFor(field: string): string {
    const col = this.colDefsWithEdit.find((c) => c.field === field);
    return col?.headerName || field;
  }

  protected panelOptionsFor(field: string): string[] | null {
    const col = this.colDefsWithEdit.find((c) => c.field === field);
    if (!col) return null;
    return this.getFilterOptionsForCol(col);
  }

  public pinLeft(h: any) {
    const pin = h?.column?.pin;
    if (typeof pin === 'function') pin.call(h.column, 'left');
    this.store?.requestPersist();
  }

  public pinRight(h: any) {
    const pin = h?.column?.pin;
    if (typeof pin === 'function') pin.call(h.column, 'right');
    this.store?.requestPersist();
  }

  // Column pinning helpers
  public pinState(h: any): 'left' | 'right' | false {
    const fn = h?.column?.getIsPinned;
    return typeof fn === 'function' ? (fn.call(h.column) as 'left' | 'right' | false) : false;
  }

  protected async prevPage() {
    if (!this.canPrev()) return;
    await this.loadPage(this.pageIndex() - 1);
  }

  /** Triggers a full grid refresh via backend. */
  protected async refresh(): Promise<void> {
    const child = this.childGrid();
    if (child) {
      await child.refresh();
      return;
    }
    await this.loadPage(this.pageIndex());
  }
  public async doRefresh() {
    if (this.isRefreshing()) return;
    this.isRefreshing.set(true);
    const start = Date.now();
    try {
      await this.refresh();
    } finally {
      const elapsed = Date.now() - start;
      const minSpin = 1000; // spin at least once (1 second minimum)
      if (elapsed < minSpin) {
        await new Promise((resolve) => setTimeout(resolve, minSpin - elapsed));
      }
      this.isRefreshing.set(false);
    }
  }

  protected resetAllWidths() {
    this.colWidths.set({});
    const sizing: Record<string, number> = {};
    this.tsTable?.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, columnSizing: sizing } }));
    this.store?.requestPersist();
  }

  // Resolve row background using DaisyUI tokens for zebra striping
  protected rowBgForIndex(i: number): string {
    return i % 2 === 1 ? 'var(--fallback-b2, oklch(var(--b2)))' : 'var(--fallback-b1, oklch(var(--b1)))';
  }
  public resetAllWidthsPublic() {
    this.resetAllWidths();
  }

  // Build header resize config for directive
  protected headerResizeConfig(h: any) {
    return {
      header: h,
      getColWidth: (id: string) => this.getColWidth(id),
      setWidth: (col: any, id: string, w: number) => {
        const width = this.clampColumnWidth(id, w);
        try {
          if (typeof col?.setSize === 'function') col.setSize(width);
        } catch {}
        this.setColWidth(id, width);
      },
      requestPersist: () => this.store?.requestPersist(),
      selectionWidth: () => this.selectionStickyWidth(),
      setSuppressHeaderDrag: (v: boolean) => {
        this.suppressHeaderDrag = !!v;
      },
    } as const;
  }

  protected onPageSizeChange(val: string | number) {
    const n = typeof val === 'number' ? val : parseInt(String(val), 10);
    const size = isNaN(n) || n <= 0 ? 25 : n;
    if (size === this.pageSize()) return;
    this.pageSize.set(size);
    // loadPage(0) is triggered by effect on pageSize
  }

  public resetColWidth(h: any) {
    const id = this.getFieldFromHeader(h);
    if (!id) return;
    const state = this.tsTable!.getState() as unknown as { columnSizing?: Record<string, number> };
    const sizing = { ...(state?.columnSizing || {}) };
    if (id in sizing) delete sizing[id];
    this.colWidths.update((m) => {
      const next = { ...(m || {}) };
      delete next[id!];
      return next;
    });
    this.tsTable?.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, columnSizing: sizing } }));
  }

  public rightOffsetPx(colId: string): number {
    return this.pctrl?.rightOffsetPx(colId) ?? 0;
  }

  protected async selectAllMatching() {
    try {
      if (!this.fetchCtrl) return;
      const { ids, count } = await this.fetchCtrl.selectAllMatching();
      this.allSelectedIds.set(ids);
      this.allSelectedIdSet.set(new Set(ids));
      this.allSelectedCount.set(count);
      this.allSelected.set(ids.length > 0);
      this.alertSvc.showInfo(`Selected ${this.allSelectedCount()} row(s)`);
    } catch {
      this.alertSvc.showError('Failed to select all rows');
    }
  }

  // reapplySelectionToVisible removed (selection handled via signals)

  /** Cancels the fetch call and hides loader. */
  protected sendAbort() {
    this.gridSvc.abort();
  }

  protected setColWidth(id: string, px: number) {
    const next = { ...this.colWidths() };
    const width = this.clampColumnWidth(id, px);
    next[id] = width;
    this.colWidths.set(next);
    if (this.tsTable) {
      try {
        this.tsTable.setOptions((prev: any) => {
          const prevState = prev?.state ?? {};
          const sizing = { ...(prevState.columnSizing || {}) };
          sizing[id] = width;
          return { ...prev, state: { ...prevState, columnSizing: sizing } };
        });
      } catch {}
    }
    try {
      this.store?.requestPersist();
    } catch {}
    // After width change, recompute sticky offsets
    this.updateHeaderWidths();
  }

  private computeHeaderMinWidths(table: HTMLTableElement): Record<string, number> {
    const map: Record<string, number> = {};
    const headers = table.querySelectorAll('thead th[data-col-id]');
    headers.forEach((node) => {
      const el = node as HTMLElement;
      const id = (el.dataset?.['colId'] ?? el.getAttribute('data-col-id')) || '';
      if (!id) return;
      const width = this.measureHeaderPreferredWidth(el);
      if (width > 0) map[id] = width;
    });
    return map;
  }

  private measureHeaderPreferredWidth(headerEl: HTMLElement): number {
    const doc = headerEl.ownerDocument;
    if (!doc) return 0;
    const content = headerEl.querySelector<HTMLElement>('[data-header-content]');
    if (!content) {
      const rect = headerEl.getBoundingClientRect();
      return Math.max(0, Math.ceil(rect.width));
    }
    const clone = content.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.visibility = 'hidden';
    clone.style.pointerEvents = 'none';
    clone.style.flex = '0 0 auto';
    clone.style.whiteSpace = 'nowrap';
    clone.style.width = 'auto';
    clone.style.height = 'auto';
    clone.style.maxWidth = 'unset';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    const labelClone = clone.querySelector<HTMLElement>('[data-header-label]');
    if (labelClone) {
      labelClone.style.flex = '0 0 auto';
      labelClone.style.whiteSpace = 'nowrap';
    }
    doc.body.appendChild(clone);
    const contentWidth = clone.getBoundingClientRect().width;
    clone.remove();
    if (contentWidth <= 0) return 0;
    const view = doc.defaultView;
    const style = view ? view.getComputedStyle(headerEl) : null;
    const paddingLeft = style ? parseFloat(style.paddingLeft || '0') : 0;
    const paddingRight = style ? parseFloat(style.paddingRight || '0') : 0;
    const borderLeft = style ? parseFloat(style.borderLeftWidth || '0') : 0;
    const borderRight = style ? parseFloat(style.borderRightWidth || '0') : 0;
    const total = contentWidth + paddingLeft + paddingRight + borderLeft + borderRight + this.headerAutoSizeBufferPx;
    return Math.max(0, Math.ceil(total));
  }

  private enforceWidthMinimums(mins: Record<string, number>) {
    for (const [id, min] of Object.entries(mins)) {
      const current = this.colWidths()[id];
      if (typeof current === 'number' && current > 0 && current < min) {
        this.setColWidth(id, min);
      }
    }
  }

  // Column visibility bulk actions
  protected showAllCols() {
    const v = { ...this.colVisibility() };
    for (const c of this.colDefsWithEdit) if (c.field) v[c.field] = true;
    this.colVisibility.set(v);
    if (this.tsTable)
      this.tsTable.setOptions((prev: any) => ({ ...prev, state: { ...prev.state, columnVisibility: v } }));
  }
  public showAllColsPublic() {
    this.showAllCols();
  }

  public showColumnById(id: string) {
    this.toggleCol(id, true);
    const col = this.tsTable?.getColumn?.(id);
    if (col?.toggleVisibility) col.toggleVisibility(true);
  }

  // Header menu actions
  public sortAsc(h: any) {
    const isSorted = typeof h?.column?.getIsSorted === 'function' ? h.column.getIsSorted() : undefined;
    if (isSorted !== 'asc') {
      const fn = h?.column?.toggleSorting;
      if (typeof fn === 'function') fn.call(h.column, false, false);
    }
  }

  public sortDesc(h: any) {
    const isSorted = typeof h?.column?.getIsSorted === 'function' ? h.column.getIsSorted() : undefined;
    if (isSorted !== 'desc') {
      const fn = h?.column?.toggleSorting;
      if (typeof fn === 'function') fn.call(h.column, true, false);
    }
  }

  public sortIndicatorForHeader(h: any): PcIconNameType {
    const s = typeof h?.column?.getIsSorted === 'function' ? h.column.getIsSorted() : undefined;
    if (s === 'asc') return 'chevron-up';
    if (s === 'desc') return 'chevron-down';
    return 'none';
  }

  protected startEdit(row: any, col: ColDef) {
    if (!this.isCellEditable(row, col) || !col.field) return;
    const id = this.toId(row);
    if (!id) return;
    this.editingCell.set({ id, field: col.field });
    const value = this.getEditingDisplayValue(row, col);
    this.editingValue.set(Array.isArray(value) ? [...value] : value);
  }

  public startIndex(): number {
    return 0;
  }

  // Row selection helpers (TanStack-driven)
  public tableAllPageSelected(): boolean {
    const rows = this.rows();
    if (!rows.length) return false;
    const canSelectFn = this.rowCanSelect();
    const ids = this.selectedIdSet();
    let selectableCount = 0;
    let selectedSelectableCount = 0;
    for (const r of rows) {
      const id = this.toId(r);
      if (!id) continue;
      if (canSelectFn && !canSelectFn(r)) {
        continue;
      }
      selectableCount++;
      if (ids.has(id)) {
        selectedSelectableCount++;
      }
    }
    return selectableCount > 0 && selectedSelectableCount === selectableCount;
  }

  public tableSomePageSelected(): boolean {
    if (this.tableAllPageSelected()) return false;
    const rows = this.rows();
    const canSelectFn = this.rowCanSelect();
    const ids = this.selectedIdSet();
    for (const r of rows) {
      const id = this.toId(r);
      if (!id) continue;
      if (canSelectFn && !canSelectFn(r)) {
        continue;
      }
      if (ids.has(id)) {
        return true;
      }
    }
    return false;
  }

  public toId(row: any): string {
    const id = row?.id;
    return id == null ? '' : String(id);
  }

  /** Toggle archive mode and refresh/filter accordingly */
  protected toggleArchiveMode() {
    this.archiveMode.set(!this.archiveMode());
    // Clear any prior selection context when switching datasets
    this.clearAllSelection();
    // Reload first page
    this.loadPage(0);
  }
  public toggleArchiveModePublic() {
    this.toggleArchiveMode();
  }

  protected toggleCol(field: string, checked: boolean) {
    const v = { ...this.colVisibility() };
    v[field] = checked;
    this.colVisibility.set(v);
    if (this.tsTable) {
      this.tsTable.setOptions((prev: any) => ({
        ...prev,
        state: { ...prev.state, columnVisibility: v },
      }));
    }
    this.store?.requestPersist();
  }
  public toggleColPublic(field: string, checked: boolean) {
    this.toggleCol(field, checked);
  }

  public toggleHeaderSort(h: any, ev?: MouseEvent) {
    const fn = h?.column?.toggleSorting;
    if (typeof fn === 'function') fn.call(h.column, undefined, !!ev?.shiftKey);
  }

  protected togglePageChecked(checked: boolean) {
    if (this.allSelected()) this.allSelected.set(false);
    const nextSet = this.selSvc.togglePageSelectionSet(this.selectedIdSet(), this.rows(), checked);
    this.selectedIdSet.set(nextSet);
  }

  protected toggleRowChecked(id: string, checked: boolean) {
    if (this.allSelected()) {
      const current = this.allSelectedIdSet();
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      this.allSelectedIdSet.set(next);
    } else {
      const set = new Set(this.selectedIdSet());
      if (checked) set.add(id);
      else set.delete(id);
      this.selectedIdSet.set(set);
    }
  }

  // topPadHeight not used without virtualizer

  // Pagination
  // totalPages is computed
  public unpin(h: any) {
    const pin = h?.column?.pin;
    if (typeof pin === 'function') pin.call(h.column, false);
    this.store?.requestPersist();
  }

  // visibleCount not used without virtualizer

  protected visibleTableRows(): any[] {
    const rows = this.tsTable?.getRowModel?.().rows || [];
    return rows;
  }

  // Build TanStack rowSelection snapshot for current data from our global selected set
  private buildRowSelectionForCurrentData(): Record<string, boolean> {
    const ids = this.selectedIdSet();
    const map: Record<string, boolean> = {};
    for (const r of this.rows()) {
      const id = this.toId(r);
      if (id && ids.has(id)) map[id] = true;
    }
    return map;
  }

  private coerceEditingValue(col: ColDef, raw: any): any {
    const editorCfg = this.selectEditorOptions(col);
    let val = raw;
    if (editorCfg && !editorCfg.multiple && Array.isArray(raw)) {
      val = raw[0];
    }
    const t = this.inputTypeFor(col);
    if (t === 'number') {
      const n = typeof val === 'number' ? val : parseFloat(String(val ?? '').trim());
      return isNaN(n) ? null : n;
    }
    if (t === 'date') {
      const v = String(val ?? '').trim();
      // normalize to YYYY-MM-DD if possible
      return v.length > 10 ? v.slice(0, 10) : v;
    }
    if (t === 'color') {
      const v = String(val ?? '').trim();
      const pattern = /^#([0-9a-fA-F]{6})$/;
      return pattern.test(v) ? v.toLowerCase() : null;
    }
    return val;
  }

  private resolveEditorParams(col: ColDef): any {
    const cep = col?.cellEditorParams;
    if (!cep) return null;
    try {
      return typeof cep === 'function' ? cep() : cep;
    } catch {
      return null;
    }
  }

  // selection resize handled by ResizingController

  private async loadPage(index: number, append = false) {
    if (!this.fetchCtrl) return;
    await this.fetchCtrl.loadPage(index, append);
  }

  /** Queue a full background export and return immediately. */
  private async queueFullExport(): Promise<void> {
    // Pass a very high endRow so the backend fetches all rows without a limit
    const options = this.dataSvc.buildGetAllOptions({
      searchStr: this.searchSvc.getFilterText(),
      startRow: 0,
      endRow: 10_000_000,
      tags: this.selectedTags(),
      issues: this.selectedIssues(),
      filterModel: this.buildFilterModel(),
      sortState: this.sorting(),
      sortCol: this.sortCol(),
      sortDir: this.sortDir(),
      includeArchived: this.archiveMode(),
      advancedFilterModel: this.externalAdvancedFilterModel() || this.advFilter.buildModel(),
      listId: this.activeListId(),
    });
    await this.gridSvc.queueExport({
      entity: (this.config.messages.exportEntity ||
        this.config.messages.exportFileName.replace('.csv', '').replace(/-/g, '_')) as QueueExportInputType['entity'],
      options,
      columns: this.visibleColumnFields(),
      fileName: this.config.messages.exportFileName,
    });
  }

  private visibleColumnFields(): string[] {
    const visibility = this.colVisibility();
    return this.colDefsWithEdit
      .map((col) => (typeof col.field === 'string' ? col.field : null))
      .filter((field): field is string => !!field && visibility[field] !== false);
  }

  // Persistence handled by GridStoreService

  // header resize handled by ResizingController

  // onCellValueChanged handled by EditingController

  // saveState removed (consolidated into GridStoreService)

  // shouldBlockEdit handled by EditingController

  private syncSignalsFromTable() {
    const st: any = this.tsTable?.getState?.() ?? {};
    if (st.sorting) this.sorting.set(st.sorting);
    if (st.columnVisibility) this.colVisibility.set(st.columnVisibility);
    // Notify pin-state change so controller effect recomputes offsets
    this.pctrl?.notifyPinStateChanged();
    this.store?.requestPersist();
  }

  public triggerCellFlash(rowId: string, field: string): void {
    const key = `${rowId}:${field}`;
    this.flashedCells.update((s) => {
      const n = new Set(s);
      n.add(key);
      return n;
    });
    setTimeout(() => {
      this.flashedCells.update((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
    }, 1300);
  }

  public updateEditedRowInCaches(id: string, field: string | undefined, value: any, prevValue?: any) {
    if (!field) return;
    if (this.store) {
      const targetRow = this.rows().find((r: any) => String(this.toId(r)) === id);
      const prev = prevValue !== undefined ? prevValue : targetRow ? targetRow[field] : undefined;
      this.store.recordSnapshotBeforeCommit(id, field, prev, value);
    }
    // Update visible rows array
    this.rows.update((curr: any[]) => curr.map((r: any) => (String(r?.id) === id ? { ...r, [field]: value } : r)));
    // Trigger green flash on the updated cell
    this.triggerCellFlash(id, field);
  }

  // pin offsets handled by PinningController

  // Update table data with current visible window
  public updateTableWindow(start: number, end: number) {
    this.tableSvc.updateTableWindow(
      this.tsTable,
      this.rows(),
      start,
      end,
      this.buildRowSelectionForCurrentData(),
      this.sortCol(),
      this.sortDir(),
    );
  }

  /** Navigates to view route for given ID or last hovered ID. */
  private view(id?: string) {
    const targetId = id || this.lastRowHovered;
    if (!targetId || this.disableView()) return;

    const vr = this.viewRoute();
    if (vr) {
      if (vr.startsWith('/')) {
        void this.router.navigate([vr, targetId]);
      } else {
        void this.router.navigate([vr, targetId], { relativeTo: this.route });
      }
    } else {
      void this.navSvc.viewIfAllowed({
        id: targetId,
        lastRowHovered: this.lastRowHovered,
        disableView: this.disableView(),
        navigate: (path) => this.navSvc.navigateIfValid(this.router, this.route, path),
      });
    }
  }
}

type RowOf<K extends keyof Models> = Models[K];
type TagDiff = {
  toAdd: string[];
  toRemove: string[];
  hasChanges: boolean;
};
