import { HouseholdRepo } from './apps/backend/src/app/modules/households/repositories/households.repo';

process.env.DB_USER = 'zeehamid';
process.env.DB_NAME = 'pplcrm';
process.env.DB_PASSWORD = 'Eternity#1';
process.env.DB_PORT = '5432';
process.env.DB_HOST = 'localhost';
process.env.SHARED_SECRET = 'dev-secret';

async function run() {
  const repo = new HouseholdRepo();
  try {
    const tenants = await (repo as any).getSelect()
      .select('tenant_id')
      .limit(1)
      .execute();
    
    const tenantId = tenants[0]?.tenant_id || '1';
    console.log(`Using tenantId: ${tenantId}`);

    const result = await repo.getAllWithPeopleCount({
      tenant_id: tenantId,
      options: { startRow: 0, endRow: 100 }
    });

    console.log('Rows count:', result.rows.length);
    for (const r of result.rows) {
      console.log(`id: ${r.id}, persons_count: ${r.persons_count} (${typeof r.persons_count})`);
    }
  } catch (err) {
    console.error('Query failed:', err);
  } finally {
    process.exit(0);
  }
}

run();
