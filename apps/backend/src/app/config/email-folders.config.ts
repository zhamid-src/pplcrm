import { EMAIL_FOLDERS, EmailFolderConfig } from '@common';

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
