import { z } from 'zod';
import { nameSchema, notesSchema, idSchema } from './core.schema';

/**
 * Canonical task status vocabulary (spec §4). This is the single source of truth —
 * every layer (DB check constraint, Zod schemas, backend queries, frontend board/list)
 * derives from this list. Do not hand-roll a parallel status array anywhere.
 *
 * `waiting` replaces the old `blocked` name (board column is "Waiting", with an
 * optional waiting-reason line on the card/row). `archived` absorbs the old `canceled`
 * state — a canceled task is, in practice, a task nobody is coming back to, which is
 * exactly what "archived" already means in this app (hidden from the active views,
 * reachable via the grid's Archived toggle). See the 2026-07-07 migration that
 * normalizes existing rows to this vocabulary.
 */
export const TASK_STATUSES = ['todo', 'in_progress', 'waiting', 'done', 'archived'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** The four board columns (spec §4) — `archived` sits outside the active workflow. */
export const TASK_BOARD_STATUSES = ['todo', 'in_progress', 'waiting', 'done'] as const;
export type TaskBoardStatus = (typeof TASK_BOARD_STATUSES)[number];

/** Statuses that count as "open" for SLA-breach and count-sentence purposes. */
export const TASK_OPEN_STATUSES = ['todo', 'in_progress', 'waiting'] as const;

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  waiting: 'Waiting',
  done: 'Done',
  archived: 'Archived',
};

/** Type guard — narrows an unknown/loosely-typed status string to the canonical vocabulary. */
export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value);
}

/** Type guard for the four board columns specifically (excludes `archived`). */
export function isTaskBoardStatus(value: unknown): value is TaskBoardStatus {
  return typeof value === 'string' && (TASK_BOARD_STATUSES as readonly string[]).includes(value);
}

const taskStatusEnum = z.enum(TASK_STATUSES);
const taskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);

export const AddTaskObj = z.object({
  name: nameSchema('Task name', 200),
  details: z.string().trim().max(10000, 'Details too long').optional(),
  due_at: z.preprocess((val) => (val === '' || val === null ? undefined : val), z.coerce.date().optional()),
  status: taskStatusEnum.default('todo').optional(),
  priority: taskPriorityEnum.optional(),
  completed_at: z.preprocess((val) => (val === '' || val === null ? undefined : val), z.coerce.date().optional()),
  position: z.number().int().optional(),
  assigned_to: idSchema.or(z.literal('')).nullable().optional(),
  team_id: idSchema.or(z.literal('')).nullable().optional(),
});

export const TasksObj = z.object({
  id: z.string(),
  name: z.string(),
  details: z.string().optional(),
  due_at: z.coerce.date().optional(),
  status: taskStatusEnum.nullable().optional(),
  priority: taskPriorityEnum.nullable().optional(),
  completed_at: z.coerce.date().optional(),
  position: z.number().int().optional(),
  assigned_to: z.string().nullable().optional(),
  team_id: z.string().nullable().optional(),
});

export const UpdateTaskObj = z.object({
  name: nameSchema('Task name', 200).optional(),
  details: notesSchema,
  due_at: z.preprocess((val) => (val === '' || val === null ? undefined : val), z.coerce.date().optional()),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  completed_at: z.preprocess((val) => (val === '' || val === null ? undefined : val), z.coerce.date().optional()),
  position: z.number().int().optional(),
  assigned_to: idSchema.or(z.literal('')).nullable().optional(),
  team_id: idSchema.or(z.literal('')).nullable().optional(),
});

/**
 * Board drag-and-drop persistence (spec §4). One drop touches one or two board
 * columns: dragging within a column re-seats that single column; dragging across
 * two columns re-seats the source and target. Each column lists its cards in the
 * new top-to-bottom order — the backend writes `position = index` per id and sets
 * every id's `status` to its column, all in one transaction. `archived` is not a
 * board column, so only the four `TASK_BOARD_STATUSES` are accepted.
 */
export const ReorderTasksObj = z.object({
  columns: z
    .array(
      z.object({
        status: z.enum(TASK_BOARD_STATUSES),
        ids: z.array(idSchema).min(1, 'A column must list at least one task').max(1000, 'Too many tasks in one column'),
      }),
    )
    .min(1, 'At least one column is required')
    .max(2, 'A single drop touches at most two columns'),
});

/** Subtask drag-to-reorder (task detail): the full ordered id list for one task. */
export const ReorderSubtasksObj = z.object({
  task_id: idSchema,
  ids: z.array(idSchema).min(1, 'At least one subtask is required').max(1000, 'Too many subtasks'),
});

export type ReorderTasksType = z.infer<typeof ReorderTasksObj>;
export type ReorderSubtasksType = z.infer<typeof ReorderSubtasksObj>;
