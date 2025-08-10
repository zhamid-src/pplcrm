import type { z } from 'zod';

import type {
  AddTagObj,
  EmailCommentObj,
  EmailFolderObj,
  EmailObj,
  PersonsObj,
  SettingsObj,
  UpdateHouseholdsObj,
  UpdatePersonsObj,
  UpdateTagObj,
  getAllOptions,
  sortModelItem,
} from '../schemas';

/**
 * Used to get the current time in string from the database
 */
export interface INow {
  now: string;
}

export type AddTagType = z.infer<typeof AddTagObj>;

export type EmailCommentType = z.infer<typeof EmailCommentObj>;

export type EmailFolderType = z.infer<typeof EmailFolderObj>;

export type EmailType = z.infer<typeof EmailObj>;

export type PERSONINHOUSEHOLDTYPE = {
  first_name: string;
  full_name: string;
  id: string;
  last_name: string;
  middle_names: string;
};

export type PersonsType = z.infer<typeof PersonsObj>;

export type SettingsType = z.infer<typeof SettingsObj>;

export type SortModelType = z.infer<typeof sortModelItem>;

export type UpdateHouseholdsType = z.infer<typeof UpdateHouseholdsObj>;

export type UpdatePersonsType = z.infer<typeof UpdatePersonsObj>;

export type UpdateTagType = z.infer<typeof UpdateTagObj>;

export type getAllOptionsType = z.infer<typeof getAllOptions>;
