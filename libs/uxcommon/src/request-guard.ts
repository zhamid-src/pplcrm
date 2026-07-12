export type RequestGuard = {
  /**
   * Marks the start of a new request and returns a checker for it. After each
   * `await`, bail out unless the checker still returns true — a newer request
   * has superseded this one and its (stale) response must not land.
   */
  begin(): () => boolean;
};

/**
 * Guards a reloadable async data source against out-of-order responses: when a
 * component reloads on an input change (e.g. prev/next record navigation), a
 * slow earlier response must not overwrite the newer record.
 *
 * ```ts
 * private readonly guard = createRequestGuard();
 *
 * async load(id: string) {
 *   const isCurrent = this.guard.begin();
 *   const data = await this.svc.getById(id);
 *   if (!isCurrent()) return;
 *   this.detail.set(data);
 * }
 * ```
 */
export function createRequestGuard(): RequestGuard {
  let sequence = 0;
  return {
    begin(): () => boolean {
      const requestId = ++sequence;
      return () => requestId === sequence;
    },
  };
}
