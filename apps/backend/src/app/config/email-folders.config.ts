/**
 * Email folders configuration.
 * This replaces the email_folders database table with a hardcoded configuration.
 */
export interface EmailFolderConfig {
  icon: string;
  id: string;
  is_default: boolean;
  is_virtual: boolean; // True for special folders that don't store emails directly
  name: string;
  sort_order: number;
}

/**
 * Get all email folders sorted by sort_order.
 */
export function getAllEmailFolders(): EmailFolderConfig[] {
  return EMAIL_FOLDERS.sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Get a specific email folder by ID.
 */
export function getEmailFolderById(id: string): EmailFolderConfig | undefined {
  return EMAIL_FOLDERS.find((folder) => folder.id === id);
}

/**
 * Get all regular folders.
 */
export function getRegularFolders(): EmailFolderConfig[] {
  return EMAIL_FOLDERS.filter((folder) => !folder.is_virtual);
}

/**
 * Get all virtual folders.
 */
export function getVirtualFolders(): EmailFolderConfig[] {
  return EMAIL_FOLDERS.filter((folder) => folder.is_virtual);
}

/**
 * Check if a folder is virtual (special logic) or regular (stores emails).
 */
export function isVirtualFolder(folderId: string): boolean {
  const folder = getEmailFolderById(folderId);
  return folder?.is_virtual || false;
}

/**
 * Hardcoded email folders configuration.
 * These folders are the same for all tenants.
 */
export const EMAIL_FOLDERS: EmailFolderConfig[] = [
  {
    id: '8',
    name: 'Unassigned',
    icon: 'inbox',
    sort_order: 1,
    is_default: false,
    is_virtual: true, // Virtual folder - shows open emails from all folders
  },
  {
    id: '6',
    name: 'Assigned to me',
    icon: 'user-circle',
    sort_order: 2,
    is_default: true,
    is_virtual: true, // Virtual folder - shows assigned emails
  },
  {
    id: '1',
    name: 'All Open',
    icon: 'document-duplicate',
    sort_order: 4,
    is_default: false,
    is_virtual: true, // Virtual folder - shows open emails from all folders
  },

  {
    id: '2',
    name: 'Completed',
    icon: 'document-check',
    sort_order: 3,
    is_default: false,
    is_virtual: true, // Virtual folder - shows closed/resolved emails
  },
  {
    id: '7',
    name: 'Drafts',
    icon: 'document',
    sort_order: 5,
    is_default: false,
    is_virtual: false, // Virtual folder - shows closed/resolved emails
  },
  {
    id: '3',
    name: 'Sent',
    icon: 'paper-airplane',
    sort_order: 6,
    is_default: false,
    is_virtual: false, // Regular folder - stores emails with folder_id = 3
  },
  {
    id: '4',
    name: 'Spam',
    icon: 'exclamation-triangle',
    sort_order: 7,
    is_default: false,
    is_virtual: false, // Regular folder - stores emails with folder_id = 4
  },
  {
    id: '5',
    name: 'Trash',
    icon: 'trash',
    sort_order: 8,
    is_default: false,
    is_virtual: false, // Regular folder - stores emails with folder_id = 5
  },
];
