import type { z } from 'zod';

import type {
  AddTagObj,
  AddListObj,
  AddMarketingEmailObj,
  AddTaskObj,
  EmailCommentObj,
  EmailFolderObj,
  EmailObj,
  MarketingEmailObj,
  marketingEmailTopLinkObj,
  EmailDraftObj,
  PersonsObj,
  SettingsObj,
  UpdateHouseholdsObj,
  UpdatePersonsObj,
  UpdateTagObj,
  ListsObj,
  UpdateMarketingEmailObj,
  UpdateListObj,
  UpdateTaskObj,
  TasksObj,
  getAllOptions,
  exportCsvInput,
  exportCsvResponse,
  sortModelItem,
  InviteAuthUserObj,
  UpdateAuthUserObj,
} from './schema';

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

export type MarketingEmailType = z.infer<typeof MarketingEmailObj>;

export type AddMarketingEmailType = z.infer<typeof AddMarketingEmailObj>;

export type UpdateMarketingEmailType = z.infer<typeof UpdateMarketingEmailObj>;

export type MarketingEmailTopLinkType = z.infer<typeof marketingEmailTopLinkObj>;

export type EmailDraftType = z.infer<typeof EmailDraftObj>;

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

export type AddListType = z.infer<typeof AddListObj>;

export type InviteAuthUserType = z.infer<typeof InviteAuthUserObj>;

export type ListsType = z.infer<typeof ListsObj>;

export type UpdateListType = z.infer<typeof UpdateListObj>;

export type UpdateAuthUserType = z.infer<typeof UpdateAuthUserObj>;

export type AddTaskType = z.infer<typeof AddTaskObj>;
export type TasksType = z.infer<typeof TasksObj>;
export type UpdateTaskType = z.infer<typeof UpdateTaskObj>;
export type ExportCsvInputType = z.infer<typeof exportCsvInput>;
export type ExportCsvResponseType = z.infer<typeof exportCsvResponse>;
