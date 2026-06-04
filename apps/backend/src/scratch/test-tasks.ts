import { TasksRepo } from '../app/modules/tasks/repositories/tasks.repo';

async function test() {
  const repo = new TasksRepo();
  const res = await repo.getAllExcludingArchivedWithCount('1');
  console.log('ROWS:', JSON.stringify(res.rows.slice(0, 3), null, 2));
  process.exit(0);
}

test().catch(console.error);
