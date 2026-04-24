import { z } from 'zod';

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
    searchStr: z.string().optional(),
    startRow: z.number().optional(),
    endRow: z.number().optional(),
    sortModel: z.array(sortModelItem).optional(),
    filterModel: z.record(z.string(), z.any()).optional(),
    includeArchived: z.boolean().optional(),
    columns: z.array(z.string()).optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
    orderBy: z.array(z.string()).optional(),
    groupBy: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  })
  .optional();

export const exportCsvInput = z
  .object({
    options: getAllOptions,
    columns: z.array(z.string()).optional(),
    fileName: z.string().optional(),
  })
  .optional();

export const exportCsvResponse = z.object({
  csv: z.string(),
  fileName: z.string(),
  columns: z.array(z.string()),
  rowCount: z.number(),
});
