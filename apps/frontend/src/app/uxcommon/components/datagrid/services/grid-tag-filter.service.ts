import { computed, signal } from '@angular/core';

import { TagOptionsService } from './tag-options.service';

export class GridTagFilterService {
  // ── Tag filter signals ────────────────────────────────────────────────────
  readonly allAvailableTags = signal<string[]>([]);
  readonly selectedTags = signal<string[]>([]);
  readonly tagSearchQuery = signal<string>('');

  // ── Issue filter signals ──────────────────────────────────────────────────
  readonly allAvailableIssues = signal<string[]>([]);
  readonly selectedIssues = signal<string[]>([]);
  readonly issueSearchQuery = signal<string>('');

  // ── Computeds ─────────────────────────────────────────────────────────────
  readonly filteredAvailableTags = computed(() => {
    const query = this.tagSearchQuery().toLowerCase().trim();
    const all = this.allAvailableTags();
    if (!query) return all;
    return all.filter((tag) => tag.toLowerCase().includes(query));
  });

  readonly filteredAvailableIssues = computed(() => {
    const query = this.issueSearchQuery().toLowerCase().trim();
    const all = this.allAvailableIssues();
    if (!query) return all;
    return all.filter((issue) => issue.toLowerCase().includes(query));
  });

  // showTagFilter / showIssueFilter are kept on DataGrid because they depend
  // on the `colDefs` input signal, which belongs to the component.

  // ── Initialisation ────────────────────────────────────────────────────────

  /**
   * Must be called from `ngOnInit`. Loads available tag/issue names and seeds
   * the selection from the host component's limitTo inputs.
   */
  async init(params: {
    limitToTags: string[];
    limitToIssues: string[];
    tagOptionsSvc: TagOptionsService;
    doRefresh: () => void;
  }): Promise<void> {
    this._doRefresh = params.doRefresh;

    this.selectedTags.set([...params.limitToTags]);
    this.selectedIssues.set([...params.limitToIssues]);

    try {
      const tags = await params.tagOptionsSvc.getTagNames('tag');
      this.allAvailableTags.set(tags);
    } catch {
      this.allAvailableTags.set([]);
    }

    try {
      const issues = await params.tagOptionsSvc.getTagNames('issue');
      this.allAvailableIssues.set(issues);
    } catch {
      this.allAvailableIssues.set([]);
    }
  }

  // ── Tag filter actions ────────────────────────────────────────────────────

  toggleTagFilter(tag: string, checked: boolean): void {
    const current = this.selectedTags();
    const next = checked ? [...current, tag] : current.filter((t) => t !== tag);
    this.selectedTags.set(next);
    this._doRefresh();
  }

  clearTagsFilter(): void {
    this.selectedTags.set([]);
    this.tagSearchQuery.set('');
    this._doRefresh();
  }

  selectAllTags(): void {
    const visible = this.filteredAvailableTags();
    const current = new Set(this.selectedTags());
    for (const tag of visible) current.add(tag);
    this.selectedTags.set(Array.from(current));
    this._doRefresh();
  }

  clearAllTagsVisible(): void {
    const visibleSet = new Set(this.filteredAvailableTags());
    const next = this.selectedTags().filter((tag) => !visibleSet.has(tag));
    this.selectedTags.set(next);
    this._doRefresh();
  }

  // ── Issue filter actions ──────────────────────────────────────────────────

  toggleIssueFilter(issue: string, checked: boolean): void {
    const current = this.selectedIssues();
    const next = checked ? [...current, issue] : current.filter((i) => i !== issue);
    this.selectedIssues.set(next);
    this._doRefresh();
  }

  clearIssuesFilter(): void {
    this.selectedIssues.set([]);
    this.issueSearchQuery.set('');
    this._doRefresh();
  }

  selectAllIssues(): void {
    const visible = this.filteredAvailableIssues();
    const current = new Set(this.selectedIssues());
    for (const issue of visible) current.add(issue);
    this.selectedIssues.set(Array.from(current));
    this._doRefresh();
  }

  clearAllIssuesVisible(): void {
    const visibleSet = new Set(this.filteredAvailableIssues());
    const next = this.selectedIssues().filter((issue) => !visibleSet.has(issue));
    this.selectedIssues.set(next);
    this._doRefresh();
  }

  // ── Private ───────────────────────────────────────────────────────────────
  private _doRefresh: () => void = () => {};
}
