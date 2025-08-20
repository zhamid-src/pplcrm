/**
 * Strongly-typed email folders with:
 * - SPECIAL_FOLDERS: virtual-only map (exact keys/ids)
 * - REGULAR_FOLDERS: real-only map (exact keys/ids, keys are UPPERCASE names)
 * - ALL_FOLDERS: merged map of both
 * - FOLDER_BY_ID and ALL_FOLDER_IDS helpers
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
  code?: string; // optional/loose for compatibility
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

type OnlyReal = Extract<Folder, { is_virtual: false }>;

type OnlyVirtual = Extract<Folder, { is_virtual: true }>;

// All folders (merged, exact keys/ids)
export type AllFolderKey = keyof typeof SPECIAL_FOLDERS | keyof typeof REGULAR_FOLDERS;

export type AllFoldersMap = typeof SPECIAL_FOLDERS & typeof REGULAR_FOLDERS;

export type EmailStatus = 'open' | 'closed';

export type RegularFolderId = OnlyReal['id']; // '7' | '3' | '4' | '5'

export type RegularFolderKey = Uppercase<RegularFolderName>; // 'DRAFTS' | 'SENT' | 'SPAM' | 'TRASH'

export type RegularFolderName = OnlyReal['name']; // 'Drafts' | 'Sent' | 'Spam' | 'Trash'

export type SpecialFolderId = OnlyVirtual['id'];

export type SpecialFolderKey = OnlyVirtual['code'];

export type StrictEmailFolderConfig = VirtualEmailFolder | RealEmailFolder;

function createRegularFolders<const A extends readonly StrictEmailFolderConfig[]>(folders: A) {
  type R = Extract<A[number], { is_virtual: false }>;
  type Key = Uppercase<R['name'] & string>;
  type IdFor<K extends Key> = Extract<R, { name: Capitalize<Lowercase<K>> }>['id'];

  const entries = (folders.filter((f): f is R => !f.is_virtual) as readonly R[]).map(
    (f) => [f.name.toUpperCase() as Key, f.id] as const,
  );

  return Object.freeze(Object.fromEntries(entries)) as { readonly [K in Key]: IdFor<K> };
}

// ---------- Builders ----------
function createSpecialFolders<const A extends readonly StrictEmailFolderConfig[]>(folders: A) {
  type V = Extract<A[number], { is_virtual: true }>;
  type K = V extends { code: infer C extends string } ? C : never;
  type IdFor<Code extends string> = Extract<V, { code: Code }>['id'];

  const entries = (folders.filter((f): f is V => f.is_virtual) as readonly V[]).map((f) => [f.code, f.id] as const);

  return Object.freeze(Object.fromEntries(entries)) as { readonly [P in K]: IdFor<P> };
}

export const isRegularFolderId = (id: string): id is RegularFolderId =>
  Object.values(REGULAR_FOLDERS).includes(id as RegularFolderId);

// Optional runtime type guards
export const isSpecialFolderId = (id: string): id is SpecialFolderId =>
  Object.values(SPECIAL_FOLDERS).includes(id as SpecialFolderId);

// ---------- Configuration (validated against STRICT type) ----------
export const EMAIL_FOLDERS = [
  // Virtual
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
  { id: '9', name: 'Favourites', icon: 'star', sort_order: 3, is_default: false, is_virtual: true, code: 'FAVOURITES' },
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
    code: 'CLOSED',
  },

  // Real
  { id: '7', name: 'Drafts', icon: 'document', sort_order: 6, is_default: false, is_virtual: false },
  { id: '3', name: 'Sent', icon: 'paper-airplane', sort_order: 7, is_default: false, is_virtual: false },
  { id: '4', name: 'Spam', icon: 'exclamation-triangle', sort_order: 8, is_default: false, is_virtual: false },
  { id: '5', name: 'Trash', icon: 'trash', sort_order: 9, is_default: false, is_virtual: false },
] as const satisfies StrictEmailFolderConfig[];

// Real-only (exact keys/ids)
export const REGULAR_FOLDERS = createRegularFolders(EMAIL_FOLDERS);

// ---------- Exposed constants ----------

// Virtual-only (exact keys/ids)
export const SPECIAL_FOLDERS = createSpecialFolders(EMAIL_FOLDERS);
export const ALL_FOLDERS: AllFoldersMap = { ...SPECIAL_FOLDERS, ...REGULAR_FOLDERS } as const;

// Useful helpers
export const ALL_FOLDER_IDS = EMAIL_FOLDERS.map((f) => f.id) as ReadonlyArray<Folder['id']>;
export const FOLDER_BY_ID = Object.freeze(Object.fromEntries(EMAIL_FOLDERS.map((f) => [f.id, f]))) as Readonly<
  Record<Folder['id'], Folder>
>;
