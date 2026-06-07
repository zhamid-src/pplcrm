import type {
  AddTaskType,
  ExportCsvInputType,
  ExportCsvResponseType,
  UpdateTaskType,
  getAllOptionsType,
} from '@common';

import type { IAuthKeyPayload } from 'common/src/lib/auth';
import { BaseController } from '../../lib/base.controller';
import { TasksRepo } from './repositories/tasks.repo';
import type { OperationDataType } from 'common/src/lib/kysely.models';
import { NotificationsRepo } from '../notifications/repositories/notifications.repo';
import { TransactionalEmailService } from '../../lib/mail/transactional-mail.service';
import { ImportsRepo } from '../imports/repositories/imports.repo';
import { StorageService } from '../../lib/storage.service';
import { TRPCError } from '@trpc/server';

export class TasksController extends BaseController<'tasks', TasksRepo> {
  private mailService = new TransactionalEmailService();

  constructor() {
    super(new TasksRepo());
  }

  public async addTask(payload: AddTaskType, auth: IAuthKeyPayload) {
    const row = {
      name: payload.name,
      details: payload.details,
      due_at: payload.due_at ?? null,
      status: payload.status ?? 'todo',
      priority: payload.priority ?? null,
      completed_at: payload.completed_at ?? null,
      position: payload.position ?? 0,
      assigned_to: payload.assigned_to ?? null,
      team_id: payload.team_id ?? null,
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
    } as OperationDataType<'tasks', 'insert'>;
    const task = await this.add(row);
    if (task && payload.assigned_to) {
      try {
        const notificationsRepo = new NotificationsRepo();
        await notificationsRepo.pushNotification({
          tenant_id: auth.tenant_id,
          user_id: payload.assigned_to,
          title: 'Task Assigned',
          message: `You have been assigned the task: "${payload.name}"`,
          type: 'task',
          link: `/tasks/${task.id}`,
        });

        const assignedToNum = Number(payload.assigned_to);
        if (!isNaN(assignedToNum)) {
          const assignee = await this.getRepo()
            .db.selectFrom('authusers')
            .leftJoin('profiles', 'profiles.auth_id', 'authusers.id')
            .select(['authusers.email', 'authusers.first_name', 'profiles.json as profile_json'])
            .where('authusers.id', '=', assignedToNum as any)
            .executeTakeFirst();
          if (assignee && assignee.email) {
            let optedIn = true;
            const profileJson = assignee.profile_json;
            if (profileJson) {
              try {
                const json = typeof profileJson === 'string' ? JSON.parse(profileJson) : profileJson;
                if (json?.notifications?.task_assigned === false) {
                  optedIn = false;
                }
              } catch (e) {
                console.error('Failed to parse profile json in addTask', e);
              }
            }

            if (optedIn) {
              await this.mailService.sendMail({
                to: assignee.email,
                subject: `New Task Assigned: ${payload.name}`,
                text: `Hi ${assignee.first_name},\n\nYou have been assigned the task: "${payload.name}" by ${auth.name}.\n\nDetails:\n${payload.details || 'None'}\n\nView details: http://localhost:4200/tasks/${task.id}`,
                html: `<p>Hi ${assignee.first_name},</p><p>You have been assigned the task: <strong>"${payload.name}"</strong> by ${auth.name}.</p><p><strong>Details:</strong><br>${payload.details || 'None'}</p><p><a href="http://localhost:4200/tasks/${task.id}">View Task Details</a></p>`,
              });
            }
          }
        }
      } catch (nErr) {
        console.error('Failed to process task assignment alert/notification', nErr);
      }
    }
    return task;
  }

  public async getAllTasks(auth: IAuthKeyPayload, options?: getAllOptionsType) {
    return this.getRepo().getAllExcludingArchivedWithCount(auth.tenant_id, options as any);
  }

  public async getArchivedTasks(auth: IAuthKeyPayload, options?: getAllOptionsType) {
    return this.getRepo().getAllArchivedWithCount(auth.tenant_id, options as any);
  }

  public async updateTask(id: string, row: UpdateTaskType, auth: IAuthKeyPayload) {
    const existingTask = (await this.getOneById({ tenant_id: auth.tenant_id, id })) as any;
    const rowWithUpdatedBy = { ...row, updatedby_id: auth.user_id } as OperationDataType<'tasks', 'update'>;
    const updated = await this.update({ tenant_id: auth.tenant_id, id, row: rowWithUpdatedBy });

    if (updated && row.assigned_to && row.assigned_to !== existingTask?.assigned_to) {
      try {
        const notificationsRepo = new NotificationsRepo();
        await notificationsRepo.pushNotification({
          tenant_id: auth.tenant_id,
          user_id: row.assigned_to,
          title: 'Task Assigned',
          message: `You have been assigned the task: "${updated.name}"`,
          type: 'task',
          link: `/tasks/${id}`,
        });

        const assignedToNum = Number(row.assigned_to);
        if (!isNaN(assignedToNum)) {
          const assignee = await this.getRepo()
            .db.selectFrom('authusers')
            .leftJoin('profiles', 'profiles.auth_id', 'authusers.id')
            .select(['authusers.email', 'authusers.first_name', 'profiles.json as profile_json'])
            .where('authusers.id', '=', assignedToNum as any)
            .executeTakeFirst();
          if (assignee && assignee.email) {
            let optedIn = true;
            const profileJson = assignee.profile_json;
            if (profileJson) {
              try {
                const json = typeof profileJson === 'string' ? JSON.parse(profileJson) : profileJson;
                if (json?.notifications?.task_assigned === false) {
                  optedIn = false;
                }
              } catch (e) {
                console.error('Failed to parse profile json in updateTask', e);
              }
            }

            if (optedIn) {
              await this.mailService.sendMail({
                to: assignee.email,
                subject: `Task Assigned: ${updated.name}`,
                text: `Hi ${assignee.first_name},\n\nYou have been assigned the task: "${updated.name}" by ${auth.name}.\n\nDetails:\n${updated.details || 'None'}\n\nView details: http://localhost:4200/tasks/${id}`,
                html: `<p>Hi ${assignee.first_name},</p><p>You have been assigned the task: <strong>"${updated.name}"</strong> by ${auth.name}.</p><p><strong>Details:</strong><br>${updated.details || 'None'}</p><p><a href="http://localhost:4200/tasks/${id}">View Task Details</a></p>`,
              });
            }
          }
        }
      } catch (nErr) {
        console.error('Failed to process task assignment alert/notification', nErr);
      }
    }
    return updated;
  }

  public override async exportCsv(
    input: ExportCsvInputType & { tenant_id: string },
    auth?: IAuthKeyPayload,
  ): Promise<ExportCsvResponseType> {
    if (auth) {
      const includeArchived = Boolean(input?.options && (input.options as any)?.includeArchived);
      const result = includeArchived
        ? await this.getArchivedTasks(auth, input?.options)
        : await this.getAllTasks(auth, input?.options);
      const rows = (result?.rows ?? []).map((row) => ({ ...(row as Record<string, unknown>) }));
      const response = this.buildCsvResponse(rows, input);
      await this.userActivity.log({
        tenant_id: auth.tenant_id,
        user_id: auth.user_id,
        activity: 'export',
        entity: includeArchived ? 'tasks_archived' : 'tasks',
        quantity: response.rowCount,
        metadata: {
          requested_columns: Array.isArray(input.columns) ? input.columns.slice(0, 12) : [],
          returned_columns: response.columns.slice(0, 12),
          file_name: response.fileName,
          include_archived: includeArchived,
        },
      });
      return response;
    }
    return super.exportCsv(input, auth);
  }

  private readonly importsRepo = new ImportsRepo();
  private readonly storageService = new StorageService();

  public async importRows(
    input: {
      rows: Array<{
        name: string;
        details?: string | null;
        status?: string | null;
        priority?: string | null;
        due_at?: string | null;
        assigned_to?: string | null;
      }>;
      skipped?: number;
      file_name?: string | null;
    },
    auth: IAuthKeyPayload,
  ) {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const autoTag = `Imported-Tasks-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

    const skippedFromClient = Math.max(0, Math.floor(input.skipped ?? 0));
    const requestedFileName = (input.file_name ?? '').trim();
    const baseFileName = requestedFileName || `${autoTag}.csv`;
    const totalRows = input.rows.length + skippedFromClient;

    const importRow = {
      tenant_id: auth.tenant_id,
      createdby_id: auth.user_id,
      updatedby_id: auth.user_id,
      file_name: baseFileName,
      source: 'tasks',
      tag_name: null,
      tag_id: null,
      row_count: totalRows,
      inserted_count: 0,
      error_count: 0,
      skipped_count: skippedFromClient,
      households_created: 0,
      status: 'pending',
      metadata: null,
      processed_at: now,
    } as any;

    const savedImport = await this.importsRepo.add({ row: importRow });
    if (!savedImport || !savedImport.id) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create data import record',
      });
    }

    const importRecordId = String(savedImport.id);
    const storageKey = `imports/payloads/${auth.tenant_id}/${importRecordId}.json`;

    try {
      const payloadBuffer = Buffer.from(JSON.stringify(input.rows), 'utf8');
      await this.storageService.upload(storageKey, payloadBuffer, 'application/json');
    } catch (err) {
      console.error('Failed to upload import payload to storage', err);
      await this.importsRepo.delete({ tenant_id: auth.tenant_id as any, id: importRecordId as any });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to store import payload on server storage',
      });
    }

    await this.importsRepo.update({
      tenant_id: auth.tenant_id as any,
      id: importRecordId as any,
      row: {
        metadata: JSON.stringify({ storage_key: storageKey }),
      } as any,
    });

    await this.importsRepo.db
      .insertInto('background_jobs' as any)
      .values({
        tenant_id: auth.tenant_id,
        queue: 'default',
        status: 'pending',
        payload: JSON.stringify({
          import_id: importRecordId,
          storage_key: storageKey,
          skipped: skippedFromClient,
          tenant_id: auth.tenant_id,
          user_id: auth.user_id,
          file_name: baseFileName,
          source: 'tasks',
        }),
        run_at: new Date(),
      } as any)
      .execute();

    return {
      inserted: 0,
      errors: 0,
      skipped: skippedFromClient,
      file_name: baseFileName,
      import_id: importRecordId,
      tenant_id: auth.tenant_id,
      status: 'pending',
    } as any;
  }

  public async processImportRows(
    import_id: string,
    tenant_id: string,
    user_id: string,
    skipped: number,
    rows: any[],
  ) {
    const results = { inserted: 0, errors: 0, skipped: 0 };
    const errorMessages: string[] = [];

    // Parse status and priority to validate choices
    const normalize = (v?: string) => (v || '').toLowerCase().trim().replace(/[_\s-]+/g, '');
    const validStatuses = ['todo', 'in_progress', 'blocked', 'done', 'canceled'];
    const validPriorities = ['low', 'medium', 'high', 'urgent'];

    // Map names to users for assigned_to
    const users = await this.getRepo().db.selectFrom('authusers')
      .select(['id', 'first_name', 'last_name', 'email'])
      .where('tenant_id', '=', tenant_id)
      .execute();

    const userMap = new Map<string, string>();
    for (const u of users) {
      const idStr = String(u.id);
      userMap.set(idStr, idStr);
      if (u.email) userMap.set(u.email.toLowerCase().trim(), idStr);
      if (u.first_name) {
        userMap.set(u.first_name.toLowerCase().trim(), idStr);
        if (u.last_name) {
          userMap.set(`${u.first_name.toLowerCase().trim()} ${u.last_name.toLowerCase().trim()}`, idStr);
        }
      }
    }

    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);

      // 1. Normalize and filter valid rows upfront
      const taskRows: any[] = [];
      for (const raw of chunk) {
        if (!raw.name || !raw.name.trim()) {
          results.skipped += 1;
          continue;
        }

        let status: any = 'todo';
        if (raw.status) {
          const normStatus = normalize(raw.status);
          const matchedStatus = validStatuses.find((s) => normalize(s) === normStatus);
          if (matchedStatus) status = matchedStatus;
        }

        let priority: any = null;
        if (raw.priority) {
          const normPriority = normalize(raw.priority);
          const matchedPriority = validPriorities.find((p) => normalize(p) === normPriority);
          if (matchedPriority) priority = matchedPriority;
        }

        let assigned_to: string | null = null;
        if (raw.assigned_to) {
          assigned_to = userMap.get(raw.assigned_to.toLowerCase().trim()) ?? null;
        }

        let due_at: Date | null = null;
        if (raw.due_at) {
          const parsedDate = new Date(raw.due_at);
          if (!isNaN(parsedDate.getTime())) due_at = parsedDate;
        }

        taskRows.push({
          tenant_id,
          createdby_id: user_id,
          updatedby_id: user_id,
          name: raw.name.trim(),
          details: raw.details ?? null,
          status,
          priority,
          assigned_to,
          due_at,
          file_id: import_id,
        });
      }

      if (taskRows.length > 0) {
        try {
          // 2. Batch insert all valid task rows in one statement
          await this.getRepo().transaction().execute(async (trx) => {
            await (trx as any).insertInto('tasks').values(taskRows).execute();
          });
          results.inserted += taskRows.length;
        } catch (err: any) {
          results.errors += taskRows.length;
          errorMessages.push(err?.message || String(err));
        }
      }

      await this.importsRepo.update({
        tenant_id: tenant_id as any,
        id: import_id as any,
        row: {
          inserted_count: results.inserted,
          error_count: results.errors,
          skipped_count: skipped + results.skipped,
          updatedby_id: user_id,
          updated_at: new Date(),
        } as any,
      });
    }

    return {
      inserted: results.inserted,
      errors: results.errors,
      skipped: skipped + results.skipped,
      errorMessages,
    };
  }
}
