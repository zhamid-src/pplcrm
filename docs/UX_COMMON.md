# 🧱 PeopleCRM Frontend Common UX Documentation

This document describes the shared UI/UX elements, directives, pipes, and core utilities located under `apps/frontend/src/app/uxcommon`. These elements are reusable assets that establish the app’s design patterns and interactive features.

---

## 🗂️ Directory Layout

* `components/` – Reusable UI widgets and dialog containers.
* `directives/` – Custom DOM decoration behaviors.
* `pipes/` – String formatting and template converters.
* `mentions/` – Support utilities for text @mention parsing and dropdowns.
* `loading-gate.ts` – State management gate utility for tracking loading indicators cleanly.

---

## 🎨 Reusable Components

The following components live in `uxcommon/components/`.

### 1. `DataGrid` (`pc-datagrid`)
* **Path**: [`uxcommon/components/datagrid/datagrid.ts`](../apps/frontend/src/app/uxcommon/components/datagrid/datagrid.ts)
* **Description**: A full-featured custom data table implementing a TanStack-like API.
* **Key Features**:
  * **Column Pinning**: Pin crucial columns (e.g., selection) to the left side during horizontal scrolling.
  * **Header Resize & Reorder**: Directives allow headers to be dragged to reorder columns or resized.
  * **Inline Editing**: Double-clicking on editable fields opens an inline editor (text, checkboxes, select menus, tags).
  * **Selection**: Local pagination page selection and "select all records across search results".
  * **Advanced Filters**: A robust rule builder supporting combinations of rules (`AND` / `OR`).
  * **CSV Integration**: Seamless import and export of CSV tables directly from/to the grid dataset.
  * **Persistence**: Auto-saves column configurations (widths, ordering, visibility) to local storage.
* **Inputs**:
  * `colDefs: Input<ColDef[]>` – Column definition schema.
  * `enableSelection: Input<boolean>` – Enables row checkbox column.
  * `rowCanSelect: Input<(row: any) => boolean>` – Determines selectable rows.
  * `disableExport / disableImport: Input<boolean>` – Controls CSV export/import availability.
  * `addRoute: Input<string | null>` – Router path for adding new entities.
* **Outputs**:
  * `importCSV: Output<string>` – Fires when a CSV has been parsed successfully.

### 2. `ConfirmDialogHost` & `ConfirmDialogService`
* **Path**: [`uxcommon/components/confirm-dialog-host.ts`](../apps/frontend/src/app/uxcommon/components/confirm-dialog-host.ts)
* **Description**: Global modal dialog service used to prompt users for confirmations (e.g., deleting data, unsaved changes). Injecting `ConfirmDialogService` opens a clean overlay dialog with customizable titles, prompts, and actions.

### 3. `CsvImport` (`pc-csv-import`)
* **Path**: [`uxcommon/components/csv-import/csv-import.ts`](../apps/frontend/src/app/uxcommon/components/csv-import/csv-import.ts)
* **Description**: A drag-and-drop CSV importer modal widget. Parses files on the client side and provides validation checks before emitting data.

### 4. `Breadcrumb` (`pc-breadcrumb`)
* **Path**: [`uxcommon/components/breadcrumb/breadcrumb.ts`](../apps/frontend/src/app/uxcommon/components/breadcrumb/breadcrumb.ts)
* **Description**: Rendered navigation breadcrumbs reflecting the current route hierarchy, automatically updated via Angular router events.

### 5. `Autocomplete` (`pc-autocomplete`)
* **Path**: [`uxcommon/components/autocomplete/autocomplete.ts`](../apps/frontend/src/app/uxcommon/components/autocomplete/autocomplete.ts)
* **Description**: A type-ahead suggestion dropdown that filters choices as the user types, useful for picking users or assigning entities.

### 6. `Alerts` & `AlertService` (`pc-alerts`)
* **Path**: [`uxcommon/components/alerts/alerts.ts`](../apps/frontend/src/app/uxcommon/components/alerts/alerts.ts)
* **Description**: A central toast alerts dispatcher. Supports error, success, warning, and info notifications. To use, inject `AlertService` and call `.showSuccess("Message")` or `.showError("Error")`.

### 7. `Tags` & `TagItem` & `AddTag` (`pc-tags`)
* **Path**: [`uxcommon/components/tags/tags.ts`](../apps/frontend/src/app/uxcommon/components/tags/tags.ts)
* **Description**: Controls that display tags (labels), manage lists of active tags, and offer interactive UI elements to add new custom tags to items.

### 8. `InputShell` (`pc-input-shell`)
* **Path**: [`uxcommon/components/input-shell/input-shell.ts`](../apps/frontend/src/app/uxcommon/components/input-shell/input-shell.ts)
* **Description**: A visual wrapper control that encloses standard textboxes, adding matching labels, error indicators, helper texts, and consistent styling.

### 9. `Swap` (`pc-swap`)
* **Path**: [`uxcommon/components/swap/swap.ts`](../apps/frontend/src/app/uxcommon/components/swap/swap.ts)
* **Description**: An interactive element (like DaisyUI's swap) to animate switching between two states (e.g. active/inactive, checked/unchecked, list/grid).

### 10. `NotFound` (`pc-not-found`)
* **Path**: [`uxcommon/components/not-found/not-found.ts`](../apps/frontend/src/app/uxcommon/components/not-found/not-found.ts)
* **Description**: The default fallback error page component displayed when a route matching fails.

### 11. `FormActions` (`pc-form-actions`)
* **Path**: [`uxcommon/components/form-actions/form-actions.ts`](../apps/frontend/src/app/uxcommon/components/form-actions/form-actions.ts)
* **Description**: Standard layout container containing quick-action buttons for saving, deleting, or cancelling form/detail pages.

---

## ⚡ Custom Directives

### 1. `AnimateIf` (`pcAnimateIf`)
* **Path**: [`uxcommon/directives/animate-if.directive.ts`](../apps/frontend/src/app/uxcommon/directives/animate-if.directive.ts)
* **Description**: A structural directive that controls adding and removing elements from the DOM, performing smooth entry and exit transitions using Web Animations API.

---

## 🧪 Custom Pipes

Custom template data-formatting pipes located under `uxcommon/pipes/`:

| Pipe Class | Pipe Name | Description |
| :--- | :--- | :--- |
| `FileIconPipe` | `fileIcon` | Maps file types (PDF, CSV, ZIP, TXT) to corresponding UI SVG icon names. |
| `FilesizePipe` | `filesize` | Formats byte counts into human-readable strings (e.g., `15.4 MB`, `256 KB`). |
| `MentionPipe` | `mentionLinkify` | Regex-parses text for `@username` mentions and converts them to active markdown-like router links. |
| `SanitizeHtmlPipe` | `sanitizeHtml` | Sanitizes untrusted rich HTML markup to render dynamic content safely in components. |
| `SvgHtmlPipe` | `svgHtml` | Trusts and safely renders inline raw SVGs. |
| `TimeagoPipe` | `timeago` | Formats ISO timestamps into relative "Time ago" strings (e.g. `2 hours ago`, `Just now`). |

---

## 🛠️ Mention Utilities

### `MentionController`
* **Path**: [`uxcommon/mentions/mention-controller.ts`](../apps/frontend/src/app/uxcommon/mentions/mention-controller.ts)
* **Description**: A non-visual core helper class designed to hook into HTML `<textarea>` inputs. It monitors user keystrokes, triggers dropdown suggestions when the `@` symbol is entered, and safely autocomplete-inserts usernames into the text field.

---

## 🚦 Loading Gate (`createLoadingGate`)

* **Path**: [`uxcommon/loading-gate.ts`](../apps/frontend/src/app/uxcommon/loading-gate.ts)
* **Description**: A wrapper utility that manages signal-based loading state with built-in debouncing (default 300ms delay before showing) and a minimum duration (default 300ms) once visible. This prevents UI elements/spinners from flickering or flashing briefly on fast API requests.

### Configuration Options
```typescript
export function createLoadingGate(options?: {
  delay?: number;       // ms before setting visible to true (default: 300)
  minDuration?: number; // ms loading stays visible once active (default: 300)
}): loadingGate;
```

### Component Implementation Example
In your component `.ts` file, import `createLoadingGate` and instantiate it. Expose the `visible` signal as `loading` for the template. Wrap async operations with `begin()` and its disposer callback in a `finally` block:
```typescript
import { Component, OnInit, signal } from '@angular/core';
import { createLoadingGate } from '@uxcommon/loading-gate';

@Component({
  selector: 'my-detail-component',
  templateUrl: './my-detail.html',
})
export class MyDetailComponent implements OnInit {
  private readonly _loading = createLoadingGate();
  
  // Expose the visible WritableSignal to the template (read-only usage is recommended)
  protected readonly loading = this._loading.visible;
  protected readonly detail = signal<any>(null);

  public ngOnInit(): void {
    void this.loadData();
  }

  private async loadData() {
    const end = this._loading.begin();
    try {
      this.detail.set(await this.myService.getData());
    } finally {
      end(); // Always call this inside finally to release the gate
    }
  }
}
```

### Template Usage Example
When using `createLoadingGate` on page-level details, the gate starts as `visible === false`. To prevent **Flash of Unstyled/Empty Content (FOUT)** during the first 300ms of initial load, check if the data signal (`detail()`) is loaded, and use `loading()` to show subsequent action spinners or progress bars:
```html
@if (!detail()) {
  <!-- Initial Load Skeleton/Spinner (renders immediately on first load) -->
  <div class="flex items-center justify-center p-12">
    <span class="loading loading-spinner text-primary"></span>
    <p class="text-sm ml-2">Loading data...</p>
  </div>
} @else {
  <!-- Main Content Layout -->
  <section class="p-6">
    <!-- Optional progress bar that appears for slow subsequent page actions -->
    <progress class="progress w-full text-primary" [class.hidden]="!loading()"></progress>

    <h1 class="text-2xl font-bold">{{ detail().name }}</h1>
    <!-- Form Inputs & Fields -->
  </section>
}
```
