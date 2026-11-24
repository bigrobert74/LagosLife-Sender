import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const API_DIR = path.resolve('C:/Users/OLADELE AKINTOLA/lagos-life-platform/apps/api');
const DATA_DIR = fs.existsSync(path.resolve('C:/Users/OLADELE AKINTOLA/lagos-life-platform/apps/api/data'))
  ? path.resolve('C:/Users/OLADELE AKINTOLA/lagos-life-platform/apps/api/data')
  : path.resolve('C:/Users/OLADELE AKINTOLA/lagos-life-platform/data');
const TEST_PORT = 3088;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function waitForServerReady(port, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await httpRequest({
        hostname: '127.0.0.1',
        port,
        path: '/api/v1/packages',
        method: 'GET',
      });
      if (res.status === 200) {
        return true;
      }
    } catch (e) {
      if (i % 5 === 0) {
        console.log(`[WAIT] Attempt ${i} failed: ${e.message}`);
      }
    }
    await wait(1000);
  }
  throw new Error(`Server failed to boot on port ${port} within timeout`);
}

function startApiServer(port) {
  console.log(`[TEST] Starting API process on port ${port}...`);
  const child = spawn('node', ['dist/main.js'], {
    cwd: API_DIR,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'production' },
    stdio: 'pipe',
  });

  child.stdout.on('data', (d) => {
    console.log(`[API ${port}]`, d.toString().trim());
  });
  child.stderr.on('data', (d) => {
    console.error(`[API ${port} ERR]`, d.toString().trim());
  });

  return child;
}

async function run() {
  console.log('===============================================================');
  console.log('🚀 LAGOS LIFE DATABASE PERSISTENCE & CRASH-RECOVERY TEST SUITE');
  console.log('===============================================================');

  // Verify data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (_) {}
  }

  // Phase 1: Boot First API Instance
  let apiProc1 = startApiServer(TEST_PORT);
  await waitForServerReady(TEST_PORT);
  console.log('✅ Instance 1 is UP and healthy on port', TEST_PORT);

  // Phase 2: Create a 1.5 Trillion Naira Order
  const createRes = await httpRequest({
    hostname: '127.0.0.1',
    port: TEST_PORT,
    path: '/api/v1/orders',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    gameUsername: 'persisted_trillionaire',
    totalGameCurrency: '1500000000000',
    formattedGameAmount: '1.5 Trillion',
    totalNairaAmount: 12000,
    customerEmail: 'persist@test.com',
    customerPhone: '08099998888',
  });

  if (createRes.status !== 201) {
    throw new Error(`Failed to create order: ${JSON.stringify(createRes.body)}`);
  }

  const orderNumber = createRes.body.data?.orderNumber || createRes.body.orderNumber;
  console.log(`✅ Created Order #${orderNumber} for 1.5 Trillion to @persisted_trillionaire`);

  // Phase 3: Submit Payment Proof
  const payRes = await httpRequest({
    hostname: '127.0.0.1',
    port: TEST_PORT,
    path: `/api/v1/orders/${orderNumber}/submit-payment`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    senderAccountName: 'Chief Oladele Persistent',
    senderBankName: 'Guaranty Trust Bank',
    transactionReference: 'GTB-PERSIST-999888',
    notes: 'Payment for 1.5 Trillion cash',
  });

  if (payRes.status !== 200 && payRes.status !== 201) {
    throw new Error(`Failed to submit payment: ${JSON.stringify(payRes.body)}`);
  }
  console.log(`✅ Submitted payment proof for #${orderNumber}. Status: ${payRes.body.status}`);

  // Phase 4: Admin Payment Approval (instant completion without waiting delivery)
  const verifyRes = await httpRequest({
    hostname: '127.0.0.1',
    port: TEST_PORT,
    path: `/api/v1/admin/orders/${orderNumber}/verify-payment`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    confirmedAmount: 12000,
    bankStatementReference: 'BANK-STMT-GTB-999888',
    adminNotes: 'Verified directly against bank feed',
  });

  if (verifyRes.status !== 200 && verifyRes.status !== 201) {
    throw new Error(`Failed to verify payment: ${JSON.stringify(verifyRes.body)}`);
  }
  console.log(`✅ Admin approved payment! Result: status=${verifyRes.body.status}, msg=${verifyRes.body.message}`);

  // Phase 5: Inspect Disk Storage
  const possibleDataDirs = [
    path.resolve('C:/Users/OLADELE AKINTOLA/lagos-life-platform/apps/api/data'),
    path.resolve('C:/Users/OLADELE AKINTOLA/lagos-life-platform/data'),
  ];
  let resolvedDataDir = DATA_DIR;
  for (const d of possibleDataDirs) {
    if (fs.existsSync(path.join(d, 'orders.json'))) {
      resolvedDataDir = d;
      break;
    }
  }
  const ordersDiskPath = path.join(resolvedDataDir, 'orders.json');
  const ledgerDiskPath = path.join(resolvedDataDir, 'inventory_ledger.json');
  console.log('[TEST] Checking disk files in:', resolvedDataDir);
  if (!fs.existsSync(ordersDiskPath)) {
    throw new Error(`orders.json not found at ${ordersDiskPath}`);
  }
  const diskOrders = JSON.parse(fs.readFileSync(ordersDiskPath, 'utf-8'));
  const foundOnDisk = diskOrders.find((o) => o.orderNumber === orderNumber);
  if (!foundOnDisk) {
    throw new Error(`Order #${orderNumber} not found in ${ordersDiskPath}`);
  }
  console.log(`✅ Verified: Order #${orderNumber} is physically written to ${ordersDiskPath}`);
  console.log(`   On-disk status: ${foundOnDisk.status}, Delivery Ref: ${foundOnDisk.deliveryRecord?.inGameTransactionRef}`);

  // Phase 6: SIMULATE CRASH / RESTART
  console.log('\n💥 SIMULATING SERVER CRASH & COMPLETE REBOOT...');
  console.log('   Killing API process 1...');
  apiProc1.kill('SIGKILL');
  await wait(2000);
  console.log('   Instance 1 is DEAD.');

  // Phase 7: Boot a Brand New API Instance (Fresh Process Memory)
  console.log('   Booting fresh API instance 2 on port', TEST_PORT);
  const apiProc2 = startApiServer(TEST_PORT);
  await waitForServerReady(TEST_PORT);
  console.log('✅ Instance 2 is UP and hydrated from disk!\n');

  // Phase 8: Query the New Instance to Verify Data Survived Restart
  console.log(`[TEST] Querying GET /api/v1/orders/${orderNumber} from NEW instance...`);
  const getOrderRes = await httpRequest({
    hostname: '127.0.0.1',
    port: TEST_PORT,
    path: `/api/v1/orders/${orderNumber}`,
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (getOrderRes.status !== 200) {
    throw new Error(`New instance could not find order: ${JSON.stringify(getOrderRes.body)}`);
  }

  const restoredOrder = getOrderRes.body.data || getOrderRes.body;
  console.log(`✅ RESTORED ORDER FROM NEW INSTANCE:`);
  console.log(`   Order Number: ${restoredOrder.orderNumber}`);
  console.log(`   Game Username: ${restoredOrder.gameUsername}`);
  console.log(`   Amount: ${restoredOrder.formattedGameAmount} (${restoredOrder.totalGameCurrency})`);
  console.log(`   Status: ${restoredOrder.status}`);
  console.log(`   Sender: ${restoredOrder.submittedPayment?.senderAccountName}`);
  console.log(`   Bank Reference: ${restoredOrder.submittedPayment?.transactionReference}`);
  console.log(`   Delivery Ref: ${restoredOrder.deliveryRecord?.inGameTransactionRef}`);

  if (restoredOrder.status !== 'COMPLETED') {
    throw new Error(`Order status was expected to be COMPLETED, got ${restoredOrder.status}`);
  }
  if (!restoredOrder.deliveryRecord?.inGameTransactionRef) {
    throw new Error('Delivery record was lost after restart!');
  }

  // Phase 9: Verify Inventory Ledger Timeline Survived Restart
  console.log('\n[TEST] Querying GET /api/v1/admin/inventory/ledger from NEW instance...');
  const ledgerRes = await httpRequest({
    hostname: '127.0.0.1',
    port: TEST_PORT,
    path: '/api/v1/admin/inventory/ledger',
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (ledgerRes.status !== 200) {
    throw new Error(`Failed to fetch ledger: ${JSON.stringify(ledgerRes.body)}`);
  }

  const restoredLedger = ledgerRes.body.data || ledgerRes.body;
  const deliveryEntry = restoredLedger.find((l) => l.relatedOrderId === orderNumber);
  if (!deliveryEntry) {
    throw new Error(`Ledger entry for #${orderNumber} was lost after restart!`);
  }
  console.log(`✅ RESTORED INVENTORY LEDGER ENTRY:`);
  console.log(`   Type: ${deliveryEntry.type}`);
  console.log(`   Amount: ${deliveryEntry.formattedAmount}`);
  console.log(`   Balance After: ${deliveryEntry.balanceAfter}`);
  console.log(`   Reason: ${deliveryEntry.reason}`);

  // Clean up test process
  apiProc2.kill('SIGKILL');
  console.log('\n===============================================================');
  console.log('🏆 100% PERSISTENCE TEST PASSED! ZERO DATA LOSS ACROSS RESTARTS');
  console.log('===============================================================');
}

run().catch((err) => {
  console.error('❌ Persistence test failed:', err);
  process.exit(1);
});
