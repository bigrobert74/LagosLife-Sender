import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { DatabaseService } = require('../apps/api/dist/database/database.service.js');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'll-db-test-'));
const origCwd = process.cwd();

try {
  // Isolate working directory so test writes only to tmpDir/apps/api/data
  fs.mkdirSync(path.join(tmpDir, 'apps', 'api', 'data'), { recursive: true });
  process.chdir(tmpDir);

  // Mock PrismaService that records upserts in an in-memory map simulating persistent_table_store
  const pgTable = new Map();
  const mockPrisma = {
    isConnected: true,
    async ensureReady() {
      return true;
    },
    async $queryRawUnsafe() {
      return Array.from(pgTable.entries()).map(([table_name, payload]) => ({
        table_name,
        payload,
      }));
    },
    async $executeRawUnsafe(sql, key, payload) {
      if (sql.includes('INSERT INTO persistent_table_store')) {
        pgTable.set(key, payload);
      } else if (sql.includes('DELETE FROM persistent_table_store')) {
        pgTable.delete(key);
      }
    },
  };

  // Boot instance 1 -> save order & bank KV
  const db1 = new DatabaseService(mockPrisma);
  await db1.onModuleInit();
  assert.strictEqual(db1.isPostgresConnected(), true);

  db1.saveOrder({
    id: 'ord-test-1',
    orderNumber: 'LL-999111',
    gameUsername: 'test_cloud_user',
    totalGameCurrency: '500000000000',
    formattedGameAmount: '500 Billion',
    totalNairaAmount: 5000,
    status: 'DELIVERY_PROCESSING',
    bankNameSnapshot: 'OPAY',
    accountNameSnapshot: 'KELVIN',
    accountNumberSnapshot: '9036627043',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    createdAt: new Date().toISOString(),
  });
  db1.setKV('bank_settings', { bankName: 'OPAY', accountName: 'KELVIN', accountNumber: '9036627043' });
  await db1.onModuleDestroy();

  // Wipe local disk files to simulate Render ephemeral container restart!
  fs.rmSync(path.join(tmpDir, 'apps', 'api', 'data'), { recursive: true, force: true });
  fs.mkdirSync(path.join(tmpDir, 'apps', 'api', 'data'), { recursive: true });

  // Boot instance 2 with empty disk -> must restore order & bank KV from PostgreSQL!
  const db2 = new DatabaseService(mockPrisma);
  await db2.onModuleInit();

  const restoredOrder = db2.getOrder('LL-999111');
  assert(restoredOrder, 'Order must be restored from PostgreSQL after ephemeral disk wipe');
  assert.strictEqual(restoredOrder.status, 'DELIVERY_PROCESSING');
  assert.strictEqual(restoredOrder.gameUsername, 'test_cloud_user');

  const restoredBank = db2.getKV('bank_settings');
  assert(restoredBank, 'KV bank_settings must be restored from PostgreSQL after ephemeral disk wipe');
  assert.strictEqual(restoredBank.accountNumber, '9036627043');

  console.log('✅ Verified PostgreSQL hydration restores orders & KV settings after simulated container wipe!');
} finally {
  try {
    process.chdir(os.tmpdir());
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (_) {}
}
