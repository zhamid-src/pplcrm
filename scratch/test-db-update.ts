import { TasksController } from '../apps/backend/src/app/modules/tasks/controller';
import { TasksRepo } from '../apps/backend/src/app/modules/tasks/repositories/tasks.repo';

const controller = new TasksController();
const repo = new TasksRepo();

async function run() {
  const auth = { tenant_id: '1', user_id: '1', name: 'Zee' } as any;
  try {
    // Find an existing task to test update
    const task = await repo.db.selectFrom('tasks')
      .selectAll()
      .where('tenant_id', '=', '1')
      .limit(1)
      .executeTakeFirst();

    if (!task) {
      console.log('No task found in DB to test update');
      return;
    }

    console.log('Found task:', task);
    console.log('Attempting to update task ID:', task.id, 'with assigned_to: "1"');

    const result = await controller.updateTask(String(task.id), {
      assigned_to: '1'
    }, auth);

    console.log('Update success!', result);
  } catch (err: any) {
    console.error('Error during updateTask:', err);
  } finally {
    await repo.db.destroy();
  }
}

run();
