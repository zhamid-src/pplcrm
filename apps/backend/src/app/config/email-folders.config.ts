import type { EmailFolderConfig } from '../../../../../libs/common/src';
import { EMAIL_FOLDERS } from '../../../../../libs/common/src';

export function getAllEmailFolders(): EmailFolderConfig[] {
  return [...EMAIL_FOLDERS].filter((folder: any) => !folder.is_hidden).sort((a, b) => a.sort_order - b.sort_order);
}

export function getEmailFolderById(id: string): EmailFolderConfig | undefined {
  return EMAIL_FOLDERS.find((folder) => folder.id === id);
}

export function getRegularFolders(): EmailFolderConfig[] {
  return EMAIL_FOLDERS.filter((folder) => !folder.is_virtual);
}

export function getVirtualFolders(): EmailFolderConfig[] {
  return EMAIL_FOLDERS.filter((folder) => folder.is_virtual);
}

export function isVirtualFolder(folderId: string): boolean {
  const folder = getEmailFolderById(folderId);
  return folder?.is_virtual || false;
}
