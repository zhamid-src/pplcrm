import { z } from 'zod';

/**
 * The list of objects that are required to create a new
 * tag.
 */
export const AddTagObj = z.object({
  /**
   * The tag to add.
   *
   * Example: Supporter, Donor, Volunteer, etc.
   */
  name: z.string(),
  /**
   * The optional field that describes the tag.
   */
  description: z.string().nullable().optional(),
});
export const EmailCommentObj = z.object({
  id: z.string(),
  email_id: z.string(),
  author_id: z.string(),
  comment: z.string(),
  created_at: z.date(),
});
export const EmailDraftObj = z.object({
  id: z.string(),
  to_list: z.array(z.string()),
  cc_list: z.array(z.string()),
  bcc_list: z.array(z.string()),
  subject: z.string().optional(),
  body_html: z.string().optional(),
  body_delta: z.any().optional(),
  updated_at: z.date(),
});
export const EmailFolderObj = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  sort_order: z.number(),
  is_default: z.boolean(),
  is_virtual: z.boolean(),
});
export const EmailObj = z.object({
  id: z.string(),
  folder_id: z.string(),
  from_email: z.string().optional(),
  from_name: z.string().optional(),
  to_email: z.string().optional(),
  subject: z.string().optional(),
  preview: z.string().optional(),
  assigned_to: z.string().optional(),
  updated_at: z.date(),
  is_favourite: z.boolean(),
  attachment_count: z.number(),
  has_attachment: z.boolean(),
  status: z.enum(['open', 'closed']).nullable().default('open'),
});

/**
 * The parameter for updating a person.
 * It's used with an ID in the API call that
 * indicates which Person to update.
 */
export const PersonsObj = z.object({
  id: z.string(),
  household_id: z.string(),
  email: z.string(),
  email2: z.string(),
  first_name: z.string(),
  middle_names: z.string(),
  last_name: z.string(),
  home_phone: z.string(),
  mobile: z.string(),
  notes: z.string(),
  json: z.string(),
});
export const SettingsObj = z.object({
  id: z.string().optional(),
  tenant_id: z.string().optional(),
  campaign_id: z.string().optional(),
  createdby_id: z.string().optional(),
  updatedby_id: z.string().optional(),
  key: z.string().optional(),
  value: z.object().optional(),
});
export const UpdateHouseholdsObj = z.object({
  home_phone: z.string().optional(),
  street_num: z.string().optional(),
  street1: z.string().optional(),
  street2: z.string().optional(),
  apt: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  notes: z.string().optional(),
  json: z.string().optional(),
});
export const UpdatePersonsObj = z.object({
  campaign_id: z.string().optional(),
  household_id: z.string().optional(),
  email: z.string().optional(),
  email2: z.string().optional(),
  first_name: z.string().optional(),
  middle_names: z.string().optional(),
  last_name: z.string().optional(),
  home_phone: z.string().optional(),
  mobile: z.string().optional(),
  notes: z.string().optional(),
  json: z.string().optional(),
});

/**
 * The parameter for updating a tag.
 * It's used with an ID in the API call that
 * indicates which Tag to update.
 */
export const UpdateTagObj = z.object({
  /**
   * The tag to add.
   *
   * Example: Supporter, Donor, Volunteer, etc.
   */
  name: z.string().optional(),
  /**
   * The optional field that describes the tag.
   */
  description: z.string().nullable().optional(),
});
export const sortModelItem = z
  .object({
    colId: z.string(),
    sort: z.enum(['asc', 'desc']),
  })
  .optional();

/**
 * The list of options that are used to filter the list of rows
 * when getting rows from the database.
 */
export const getAllOptions = z
  .object({
    /**
     *
     */
    searchStr: z.string().optional(),
    startRow: z.number().optional(),
    endRow: z.number().optional(),
    sortModel: z.array(sortModelItem).optional(),
    filterModel: z.record(z.string(), z.any()).optional(),
    /**
     * The list of columns to return. If not given then return all columns.
     */
    columns: z.array(z.string()).optional(),
    /**
     * The number of rows to return. If not given then return all rows.
     */
    limit: z.number().optional(),
    /**
     * The offset to start from. If not given then start from the beginning.
     */
    offset: z.number().optional(),
    /**
     * The list of columns to sort by. If not given then don't sort.
     */
    orderBy: z.array(z.string()).optional(),
    /**
     * The list of columns to group by. If not given then don't group.
     */
    groupBy: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  })
  .optional();
