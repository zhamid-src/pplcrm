/**
 * Strongly-typed email folders with a compatibility interface.
 *
 * - `EmailFolderConfig` (interface): broad/loose for external use (code is optional).
 * - `StrictEmailFolderConfig` (type): discriminated union used to validate constants.
 * - when is_virtual: true -> code is required
 * - when is_virtual: false -> code is forbidden
 * - `EMAIL_FOLDERS` is validated against the strict type via `satisfies`.
 * - `SPECIAL_FOLDERS` is derived with exact keys/ids inferred from `EMAIL_FOLDERS`.
 */

// ---------- Public compatibility interface (loose) ----------
// ---------- Strict types for compile-time guarantees ----------
interface EmailFolderBase {
  icon: string;
  id: string;
  is_default: boolean;
  name: string;
  sort_order: number;
}

export interface EmailFolderConfig {
  code?: string; // optional/loose here for compatibility
  icon: string;
  id: string;
  is_default: boolean;
  is_virtual: boolean;
  name: string;
  sort_order: number;
}

export interface RealEmailFolder extends EmailFolderBase {
  code?: never; // forbidden on real folders
  is_virtual: false;
}

export interface VirtualEmailFolder extends EmailFolderBase {
  code: string; // required when virtual
  is_virtual: true;
}

// ---------- Derived types ----------
type Folder = (typeof EMAIL_FOLDERS)[number];

type OnlyVirtual = Extract<Folder, { is_virtual: true }>;

export type EmailStatus = 'open' | 'closed' | 'resolved';

export type SpecialFolderId = OnlyVirtual['id'];

export type SpecialFolderKey = OnlyVirtual['code'];

export type StrictEmailFolderConfig = VirtualEmailFolder | RealEmailFolder;

// ---------- Helper to build SPECIAL_FOLDERS with exact keys ----------
function createSpecialFolders<const A extends readonly StrictEmailFolderConfig[]>(folders: A) {
  type V = Extract<A[number], { is_virtual: true }>;
  type K = V extends { code: infer C extends string } ? C : never;
  type IdFor<Code extends string> = Extract<V, { code: Code }>['id'];

  const entries = (folders.filter((f): f is V => f.is_virtual) as readonly V[]).map((f) => [f.code, f.id] as const);

  return Object.freeze(Object.fromEntries(entries)) as { readonly [P in K]: IdFor<P> };
}

// Optional runtime helper
export const isSpecialFolderId = (id: string): id is SpecialFolderId =>
  Object.values(SPECIAL_FOLDERS).includes(id as SpecialFolderId);

// Helpful type guard
export const isVirtualFolder = (f: StrictEmailFolderConfig): f is VirtualEmailFolder => f.is_virtual === true;

// ---------- Configuration (validated against the STRICT type) ----------
export const EMAIL_FOLDERS = [
  {
    id: '8',
    name: 'Unassigned',
    icon: 'inbox',
    sort_order: 1,
    is_default: false,
    is_virtual: true,
    code: 'UNASSIGNED',
  },
  {
    id: '6',
    name: 'Assigned to me',
    icon: 'user-circle',
    sort_order: 2,
    is_default: true,
    is_virtual: true,
    code: 'ASSIGNED_TO_ME',
  },
  {
    id: '9',
    name: 'Favourites',
    icon: 'star',
    sort_order: 3,
    is_default: false,
    is_virtual: true,
    code: 'FAVOURITES',
  },
  {
    id: '1',
    name: 'All Open',
    icon: 'document-duplicate',
    sort_order: 4,
    is_default: false,
    is_virtual: true,
    code: 'ALL_OPEN',
  },
  {
    id: '2',
    name: 'Completed',
    icon: 'document-check',
    sort_order: 5,
    is_default: false,
    is_virtual: true,
    code: 'CLOSED', // external-facing name for "Completed"
  },
  // Real folders
  {
    id: '7',
    name: 'Drafts',
    icon: 'document',
    sort_order: 6,
    is_default: false,
    is_virtual: false,
  },
  {
    id: '3',
    name: 'Sent',
    icon: 'paper-airplane',
    sort_order: 7,
    is_default: false,
    is_virtual: false,
  },
  {
    id: '4',
    name: 'Spam',
    icon: 'exclamation-triangle',
    sort_order: 8,
    is_default: false,
    is_virtual: false,
  },
  {
    id: '5',
    name: 'Trash',
    icon: 'trash',
    sort_order: 9,
    is_default: false,
    is_virtual: false,
  },
] as const satisfies StrictEmailFolderConfig[];

// ---------- SPECIAL_FOLDERS (strongly typed) ----------
export const SPECIAL_FOLDERS = createSpecialFolders(EMAIL_FOLDERS);
