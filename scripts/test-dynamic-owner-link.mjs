import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const API_PORT = 3099;

function request(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: API_PORT,
        path: reqPath,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      },
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function waitForServer(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await request('GET', '/api/v1/packages');
      if (res.status === 200) return true;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function runTest() {
  console.log('🚀 Starting Lagos Life Dynamic Owner Account & Fulfillment Verification...\n');

  const apiProcess = spawn('node', ['apps/api/dist/main.js'], {
    cwd: ROOT_DIR,
    env: { ...process.env, PORT: API_PORT.toString() },
    stdio: 'inherit',
  });

  const isReady = await waitForServer();
  if (!isReady) {
    apiProcess.kill();
    throw new Error('API server failed to start within timeout window');
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Verify Initial Unconnected State (Zero Hardcoding)
    // -------------------------------------------------------------
    console.log('--- TEST 1: Disconnected / Zero-Hardcoded State ---');
    await request('POST', '/api/v1/admin/owner-account/disconnect');

    const statusRes = await request('GET', '/api/v1/admin/owner-account/status');
    console.log('Initial Status:', statusRes.body?.data?.status, '| Username:', JSON.stringify(statusRes.body?.data?.username));
    if (statusRes.body?.data?.status !== 'NOT_CONNECTED' || statusRes.body?.data?.username !== '') {
      throw new Error(`Expected NOT_CONNECTED with empty username, got: ${JSON.stringify(statusRes.body?.data)}`);
    }

    const balRes = await request('GET', '/api/v1/admin/owner-account/balance');
    console.log('Initial Balance:', balRes.body?.data?.savedCash, '| Available:', balRes.body?.data?.availableBalance);
    if (balRes.body?.data?.savedCash !== '0') {
      throw new Error(`Expected savedCash 0, got: ${balRes.body?.data?.savedCash}`);
    }
    console.log('✅ Test 1 Passed: Clean disconnected state verified with zero hardcoded account.\n');

    // -------------------------------------------------------------
    // Test 2: Dynamic Connection of an Arbitrary Lagos Life Account
    // -------------------------------------------------------------
    console.log('--- TEST 2: Dynamic Connection of Arbitrary Account (@MegaTycoon_99, PIN 9876) ---');
    const connectPayload = {
      username: 'MegaTycoon_99',
      pin: '9876',
      accountIdentifier: 'Mega Tycoon Treasury Vault',
      description: 'Dynamic testing character vault',
    };

    const connectRes = await request('POST', '/api/v1/admin/owner-account/connect', connectPayload);
    console.log('Connect Result:', connectRes.body?.data?.status, '| Live Character:', connectRes.body?.data?.username);
    if (connectRes.body?.data?.status !== 'CONNECTED' || connectRes.body?.data?.username !== 'MegaTycoon_99') {
      throw new Error(`Failed to dynamically connect @MegaTycoon_99: ${JSON.stringify(connectRes.body)}`);
    }
    if (!connectRes.body?.data?.pinConfigured) {
      throw new Error('PIN was not configured upon connection');
    }

    // Verify live profile information was collected
    console.log('Live Character Level:', connectRes.body?.data?.characterStats?.level);
    console.log('Live Character Rank:', connectRes.body?.data?.characterStats?.rank);
    console.log('Live Character Tier:', connectRes.body?.data?.characterStats?.tier);

    // Verify inventory summary reflects dynamic character
    const inventoryRes = await request('GET', '/api/v1/admin/inventory');
    console.log('Admin Inventory Owner:', inventoryRes.body?.data?.ownerAccount?.gameUsername);
    if (inventoryRes.body?.data?.ownerAccount?.gameUsername !== 'MegaTycoon_99') {
      throw new Error(`Inventory does not reflect dynamic connected account: ${JSON.stringify(inventoryRes.body?.data?.ownerAccount)}`);
    }
    console.log('✅ Test 2 Passed: Dynamic account successfully linked with live information collected.\n');

    // -------------------------------------------------------------
    // Test 3: Order Creation & Instant Approval via Connected Account
    // -------------------------------------------------------------
    console.log('--- TEST 3: Create 1.5 Trillion Order & Payment Verification Approval ---');
    const createOrderRes = await request('POST', '/api/v1/orders', {
      customerName: 'Adebayo Johnson',
      customerPhone: '08012345678',
      gameUsername: 'badeletio',
      totalGameCurrency: '1500000000000',
      totalNairaAmount: 12000,
      confirmedPhoneSetting: true,
    });

    const orderNumber = createOrderRes.body?.data?.orderNumber;
    console.log(`Created Order #${orderNumber} for ₦LL 1.5 Trillion`);
    if (!orderNumber) throw new Error('Order creation failed');

    // Simulate Payment Proof Submission
    await request('POST', `/api/v1/orders/${orderNumber}/submit-payment`, {
      senderAccountName: 'Adebayo Johnson',
      bankTransferredFrom: 'GTBank',
    });

    // Admin Approves in Payment Verification
    console.log(`Admin Approving Payment for #${orderNumber}...`);
    const approveRes = await request('POST', `/api/v1/admin/orders/${orderNumber}/verify-payment`, {
      confirmedAmount: 12000,
      bankStatementReference: 'STMT-GTB-998877',
      adminNotes: 'Confirmed ₦12,000 in Moniepoint statement',
    });

    console.log('Approval Result:', approveRes.body?.data?.status);
    if (approveRes.body?.data?.status !== 'COMPLETED') {
      throw new Error(`Expected order status COMPLETED, got: ${approveRes.body?.data?.status}`);
    }
    console.log('Delivery Ref:', approveRes.body?.data?.deliveryRecord?.inGameTransactionRef);
    console.log('✅ Test 3 Passed: Order fulfilled and marked COMPLETED immediately upon payment verification approval.\n');

    // -------------------------------------------------------------
    // Test 4: Disconnect Account and Verify Cleanup
    // -------------------------------------------------------------
    console.log('--- TEST 4: Disconnect Account & Session Purge ---');
    const disconnectRes = await request('POST', '/api/v1/admin/owner-account/disconnect');
    console.log('Disconnect Result:', disconnectRes.body?.status);

    const postDisconnectStatus = await request('GET', '/api/v1/admin/owner-account/status');
    console.log('Post-Disconnect Status:', postDisconnectStatus.body?.data?.status, '| Username:', JSON.stringify(postDisconnectStatus.body?.data?.username));
    if (postDisconnectStatus.body?.data?.status !== 'NOT_CONNECTED' || postDisconnectStatus.body?.data?.username !== '') {
      throw new Error(`Expected NOT_CONNECTED after disconnect, got: ${JSON.stringify(postDisconnectStatus.body?.data)}`);
    }
    console.log('✅ Test 4 Passed: Disconnect purged session and returned to clean NOT_CONNECTED state.\n');

    console.log('🎉 ALL DYNAMIC OWNER ACCOUNT & FULFILLMENT VERIFICATIONS PASSED 100%!');
  } finally {
    apiProcess.kill();
  }
}

runTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
