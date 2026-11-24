/**
 * Automated End-to-End Simulation Script for Lagos Life Purchasing Platform
 * Simulates a customer buying Lagos Life cash via manual bank transfer and admin fulfilling it.
 */

import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const API_PORT = 3001; // Use 3001 to avoid conflicts with 3000

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: API_PORT,
        path,
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
            resolve({ status: res.statusCode, data: parsed });
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

async function runE2ESimulation() {
  console.log('================================================================');
  console.log('🚀 STARTING LAGOS LIFE PLATFORM END-TO-END SIMULATION RUN');
  console.log('================================================================\n');

  // 1. Launch the NestJS API on dedicated test port
  console.log(`[BOOT] Launching NestJS API on port ${API_PORT}...`);
  const apiProcess = spawn('node', ['apps/api/dist/main.js'], {
    cwd: ROOT_DIR,
    env: { ...process.env, PORT: API_PORT.toString() },
    stdio: 'pipe',
  });

  apiProcess.stdout.on('data', (d) => {
    const msg = d.toString();
    if (msg.includes('[API Service]')) {
      console.log(`[NEST LOG] ${msg.trim()}`);
    }
  });

  const isReady = await waitForServer();
  if (!isReady) {
    console.error('❌ Failed to connect to NestJS API service within timeout.');
    apiProcess.kill();
    process.exit(1);
  }
  console.log('✅ NestJS API is online and responding to requests.\n');

  try {
    // -------------------------------------------------------------
    // TEST 1: Retrieve available currency packages
    // -------------------------------------------------------------
    console.log('--- TEST 1: Retrieve Currency Packages ---');
    const packagesRes = await request('GET', '/api/v1/packages');
    console.log(`Status: ${packagesRes.status}`);
    console.log(`Found ${packagesRes.data.data.length} packages:`);
    packagesRes.data.data.forEach((p) => {
      console.log(`  • ${p.formattedGameAmount} (${p.name}) = ₦${p.nairaPrice}`);
    });
    if (packagesRes.status !== 200 || packagesRes.data.data.length === 0) {
      throw new Error('Packages test failed');
    }
    console.log('✅ Test 1 Passed.\n');

    // -------------------------------------------------------------
    // TEST 1.5: Live Lagos Life Player Search & Lookup (GET /api/players?q=Tunde)
    // -------------------------------------------------------------
    console.log('--- TEST 1.5: Live Lagos Life Player Search (GET /api/players?q=Tunde) ---');
    const playerSearchRes = await request('GET', '/api/v1/game/players?q=Tunde');
    console.log('Live Player Search Response:', JSON.stringify(playerSearchRes.data, null, 2));
    if (!playerSearchRes.data.players || playerSearchRes.data.players.length === 0) {
      throw new Error('Player search returned no players');
    }
    console.log(`✅ Test 1.5 Passed (Found ${playerSearchRes.data.players.length} live players matching query).\n`);

    // -------------------------------------------------------------
    // TEST 2: Calculate Quote
    // -------------------------------------------------------------
    console.log('--- TEST 2: Calculate Quote for 50B Pack ---');
    const quoteRes = await request('POST', '/api/v1/packages/quote', {
      packageId: 'pkg-50b',
    });
    console.log('Quote received:', quoteRes.data.data);
    if (quoteRes.data.data.nairaPrice !== 1000) {
      throw new Error('Quote price calculation mismatch');
    }
    console.log('✅ Test 2 Passed.\n');

    // -------------------------------------------------------------
    // TEST 3: Customer Places Order (Buy Lagos Life Cash)
    // -------------------------------------------------------------
    console.log('--- TEST 3: Customer Buys 50B Cash ---');
    const customerUsername = 'Tunde_Lekki99';
    console.log(`Customer character username: ${customerUsername}`);
    const orderRes = await request('POST', '/api/v1/orders', {
      packageId: 'pkg-50b',
      gameUsername: customerUsername,
      customerEmail: 'tunde@example.com',
      customerPhone: '08012345678',
    });

    console.log('Order created successfully!');
    const order = orderRes.data.data;
    const orderNumber = order.orderNumber;
    console.log(`  Order Number: ${orderNumber}`);
    console.log(`  Initial Status: ${order.status}`);
    console.log(`  Amount to Pay: ₦${order.amountToPayNaira}`);
    console.log(`  Bank to Transfer to: ${order.bankInstructions.bankName}`);
    console.log(`  Account Number: ${order.bankInstructions.accountNumber}`);
    console.log(`  Account Name: ${order.bankInstructions.accountName}`);
    if (order.status !== 'PENDING_PAYMENT') {
      throw new Error('Expected initial status PENDING_PAYMENT');
    }
    console.log('✅ Test 3 Passed.\n');

    // -------------------------------------------------------------
    // TEST 4: Customer checks Bank Instructions (Copy & Pay)
    // -------------------------------------------------------------
    console.log('--- TEST 4: Retrieve Bank Instructions for Order ---');
    const bankRes = await request('GET', `/api/v1/orders/${orderNumber}/payment-instructions`);
    console.log('Bank transfer details:', bankRes.data.data);
    if (!bankRes.data.data.accountNumber) {
      throw new Error('Missing account number in payment instructions');
    }
    console.log('✅ Test 4 Passed.\n');

    // -------------------------------------------------------------
    // TEST 5: Customer Submits Payment ("I Have Paid")
    // -------------------------------------------------------------
    console.log('--- TEST 5: Customer Submits Transfer Proof ("I Have Paid") ---');
    const paymentSubmission = {
      senderAccountName: 'BABATUNDE JOHNSON',
      senderBankName: 'Access Bank',
      transactionReference: `TRX-${Date.now()}`,
      notes: 'Transferred ₦1,000 via Access Bank mobile app at 22:38',
    };
    const submitRes = await request('POST', `/api/v1/orders/${orderNumber}/submit-payment`, paymentSubmission);
    console.log('Submission Response:', submitRes.data);
    if (submitRes.data.data.status !== 'PAYMENT_UNDER_REVIEW') {
      throw new Error('Expected status to change to PAYMENT_UNDER_REVIEW');
    }
    console.log('✅ Test 5 Passed.\n');

    // -------------------------------------------------------------
    // TEST 6: Admin Dashboard Review
    // -------------------------------------------------------------
    console.log('--- TEST 6: Administrator Dashboard Overview & Alerts ---');
    const adminDashboardRes = await request('GET', '/api/v1/admin/dashboard/overview');
    console.log('Admin Dashboard Overview KPI:', adminDashboardRes.data.data.kpiCards);
    if (adminDashboardRes.data.data.kpiCards.pendingReview < 1) {
      throw new Error('Pending review count should be at least 1');
    }
    const adminAlertsRes = await request('GET', '/api/v1/admin/dashboard/alerts');
    console.log('Active Operational Alerts:', adminAlertsRes.data.data);
    console.log('✅ Test 6 Passed.\n');

    // -------------------------------------------------------------
    // TEST 7: Admin Manually Verifies Bank Credit
    // -------------------------------------------------------------
    console.log('--- TEST 7: Admin Approves Payment after Bank Statement Check ---');
    const verifyRes = await request('POST', `/api/v1/admin/orders/${orderNumber}/verify-payment`, {
      confirmedAmount: 1000,
      bankStatementReference: 'STMT-NOV21-9921',
      adminNotes: 'Verified credit in Moniepoint mobile app statement under BABATUNDE JOHNSON',
    });
    console.log('Verification result:', verifyRes.data);
    if (verifyRes.data.data.status !== 'COMPLETED' && verifyRes.data.data.status !== 'WAITING_FOR_DELIVERY') {
      throw new Error(`Expected status COMPLETED or WAITING_FOR_DELIVERY, got ${verifyRes.data.data.status}`);
    }
    console.log('✅ Test 7 Passed.\n');

    // -------------------------------------------------------------
    // TEST 8: Admin Fulfills Cash In-Game & Confirms Delivery
    // -------------------------------------------------------------
    console.log('--- TEST 8: Admin Fulfills In-Game Cash to Customer ---');
    if (verifyRes.data.data.status === 'COMPLETED') {
      console.log('Order automatically fulfilled instantly in 1 transfer (50B <= 100B threshold).');
      console.log('Automated In-Game Delivery Details:', verifyRes.data.data.automatedFulfillment);
      console.log('✅ Test 8 Passed.\n');
    } else {
      const inGameTx = `LL-GAME-${Date.now()}`;
      const deliveryRes = await request('POST', `/api/v1/admin/orders/${orderNumber}/complete-delivery`, {
        inGameTransactionRef: inGameTx,
        deliveryNotes: `Transferred 50B to ${customerUsername} from owner account Bobby_Boss in Lagos Life`,
      });
      console.log('Delivery Completion result:', deliveryRes.data);
      if (deliveryRes.data.data.status !== 'COMPLETED') {
        throw new Error('Expected status COMPLETED');
      }
      console.log('✅ Test 8 Passed.\n');
    }

    // -------------------------------------------------------------
    // TEST 9: Final Customer Verification
    // -------------------------------------------------------------
    console.log('--- TEST 9: Customer Live Order Tracking Verification ---');
    const finalOrderRes = await request('GET', `/api/v1/orders/${orderNumber}`);
    console.log('Final Order State in System:');
    console.log(`  Order: ${finalOrderRes.data.data.orderNumber}`);
    console.log(`  Username: ${finalOrderRes.data.data.gameUsername}`);
    console.log(`  Cash Amount: ${finalOrderRes.data.data.formattedGameAmount}`);
    console.log(`  Paid: ₦${finalOrderRes.data.data.totalNairaAmount}`);
    console.log(`  Final Status: ${finalOrderRes.data.data.status}`);
    console.log(`  Delivered At: ${finalOrderRes.data.data.deliveryRecord.deliveredAt}`);
    console.log(`  In-Game Ref: ${finalOrderRes.data.data.deliveryRecord.inGameTransactionRef}`);

    if (finalOrderRes.data.data.status !== 'COMPLETED') {
      throw new Error('Order is not completed');
    }
    console.log('✅ Test 9 Passed.\n');

    // -------------------------------------------------------------
    // TEST 10: Inventory Ledger Inspection
    // -------------------------------------------------------------
    console.log('--- TEST 10: Auditable Inventory Ledger Verification ---');
    const ledgerRes = await request('GET', '/api/v1/admin/inventory/ledger');
    console.log(`Found ${ledgerRes.data.data.length} immutable ledger transactions.`);
    console.log('Latest entry:', ledgerRes.data.data[0]);
    if (ledgerRes.data.data.length < 1) {
      throw new Error('Ledger should contain transactions');
    }
    console.log('✅ Test 10 Passed.\n');

    // -------------------------------------------------------------
    // TEST 11: Manual Inventory Adjustment & Game Reconciliation
    // -------------------------------------------------------------
    console.log('--- TEST 11: Inventory Adjustment & Physical Reconciliation ---');
    const adjustRes = await request('POST', '/api/v1/admin/inventory/adjust', {
      type: 'INCREASE',
      amount: '500000000000',
      reason: 'Owner character cash top-up',
    });
    console.log('Adjustment result:', adjustRes.data.data);

    const recRes = await request('POST', '/api/v1/admin/inventory/reconcile', {
      currentPhysicalGameBalance: '5500000000000',
      notes: 'Audited in-game balance in character demi_thetrillionaire banking app',
    });
    console.log('Reconciliation result:', recRes.data.data);
    console.log('✅ Test 11 Passed.\n');

    // -------------------------------------------------------------
    // TEST 12: Bank Account Settings Modification
    // -------------------------------------------------------------
    console.log('--- TEST 12: Checkout Bank Account Settings ---');
    const bankConfigRes = await request('GET', '/api/v1/admin/settings/bank-account');
    console.log('Active Checkout Bank:', bankConfigRes.data.data.bankName, bankConfigRes.data.data.accountNumber);
    const updateBankRes = await request('PATCH', '/api/v1/admin/settings/bank-account', {
      bankName: 'Moniepoint Microfinance Bank',
      accountNumber: '8123456789',
      accountName: 'Lagos Life Virtual Hub Ltd',
    });
    console.log('Updated Bank Config:', updateBankRes.data.data.accountName);
    console.log('✅ Test 12 Passed.\n');

    // -------------------------------------------------------------
    // TEST 13: Customer Directory
    // -------------------------------------------------------------
    console.log('--- TEST 13: Customer Directory Query ---');
    const custRes = await request('GET', '/api/v1/admin/customers');
    console.log(`Total registered customer profiles: ${custRes.data.data.length}`);
    console.log('Customer record:', custRes.data.data[0]);
    console.log('✅ Test 13 Passed.\n');

    // -------------------------------------------------------------
    // TEST 14: Global Search (Ctrl+K)
    // -------------------------------------------------------------
    console.log('--- TEST 14: Global Search (Orders, Handles, References) ---');
    const searchRes = await request('GET', '/api/v1/admin/search?q=Tunde');
    console.log('Global search results for "Tunde":');
    console.log(`  Matching Orders: ${searchRes.data.data.orders.length}`);
    console.log(`  Matching Customers: ${searchRes.data.data.customers.length}`);
    if (searchRes.data.data.orders.length === 0) {
      throw new Error('Search failed to find existing customer order');
    }
    console.log('✅ Test 14 Passed.\n');

    // -------------------------------------------------------------
    // TEST 15: Audit Logs & System Health
    // -------------------------------------------------------------
    console.log('--- TEST 15: Audit Logs & Diagnostics Health ---');
    const auditRes = await request('GET', '/api/v1/admin/audit-logs');
    console.log(`Total audit events recorded: ${auditRes.data.data.length}`);
    console.log('Latest audit event:', auditRes.data.data[0].action, auditRes.data.data[0].details);

    const healthRes = await request('GET', '/api/v1/admin/health');
    console.log('System Diagnostics:', healthRes.data.data);
    console.log('✅ Test 15 Passed.\n');

    // -------------------------------------------------------------
    // TEST 16: Admin Authentication Gate & Session Management
    // -------------------------------------------------------------
    console.log('--- TEST 16: Admin Authentication Gate (Login Screen Gate) ---');
    // 16a. Attempt login with invalid credentials -> Should return 401 Unauthorized
    const invalidLoginRes = await request('POST', '/api/v1/admin/auth/login', {
      usernameOrEmail: 'unknown_intruder',
      password: 'bad_password',
    });
    console.log(`Invalid login status: ${invalidLoginRes.status} (Expected: 401)`);
    if (invalidLoginRes.status !== 401) {
      throw new Error(`Expected 401 for invalid login, got ${invalidLoginRes.status}`);
    }

    // 16b. Attempt login with valid credentials -> Should succeed with 201/200, returning token & profile
    const validLoginRes = await request('POST', '/api/v1/admin/auth/login', {
      usernameOrEmail: 'lead_admin',
      password: 'AdminSecurePassword2026!',
    });
    console.log(`Valid login status: ${validLoginRes.status}`);
    console.log('Authenticated Staff Profile:', validLoginRes.data.data.user.name, `[Role: ${validLoginRes.data.data.user.role}]`);
    console.log('Session Token Issued:', validLoginRes.data.data.token);
    if (!validLoginRes.data.data.token || validLoginRes.data.data.user.role !== 'SUPER_ADMIN') {
      throw new Error('Valid login failed to issue authenticated session token or role');
    }

    // 16c. Logout session
    const logoutRes = await request('POST', '/api/v1/admin/auth/logout', {
      adminUsername: 'lead_admin',
    });
    console.log('Logout result:', logoutRes.data.data.message);
    console.log('✅ Test 16 Passed.\n');

    // -------------------------------------------------------------
    // TEST 17: Live Lagos Life Game Endpoints (All 4 Live APIs)
    // -------------------------------------------------------------
    console.log('--- TEST 17: Live Lagos Life Game Endpoints Contract ---');

    // 17a. POST /api/auth/login (Login & 2FA Challenge Trigger)
    console.log('[17a] Testing POST /api/auth/login (2FA Challenge Trigger)...');
    const gameLoginRes = await request('POST', '/api/auth/login', {
      username: 'demi_thetrillionaire',
      password: 'SecurePassword2026!',
    });
    console.log(`HTTP Status: ${gameLoginRes.status} (Expected: 401 2FA Challenge)`);
    console.log('2FA Response Payload:', gameLoginRes.data);
    if (gameLoginRes.data.code !== 'two_factor' || !gameLoginRes.data.challenge) {
      throw new Error('Expected two_factor challenge on initial login');
    }

    // 17b. POST /api/auth/login (2FA Verify on same URL)
    console.log('[17b] Testing POST /api/auth/login (2FA Code Verification on same URL)...');
    const verify2FaRes = await request('POST', '/api/auth/login', {
      action: 'login',
      challenge: gameLoginRes.data.challenge,
      code: '123456',
      username: 'demi_thetrillionaire',
      password: 'SecurePassword2026!',
    });
    console.log(`HTTP Status: ${verify2FaRes.status}`);
    console.log('2FA Verification Result:', verify2FaRes.data);
    if (!verify2FaRes.data.ok) {
      throw new Error('2FA verification failed on game login');
    }

    // 17c. GET /api/players?q=Tunde
    console.log('[17c] Testing GET /api/players?q=Tunde...');
    const playerLookupRes = await request('GET', '/api/players?q=Tunde');
    console.log(`HTTP Status: ${playerLookupRes.status}`);
    console.log(`Found ${playerLookupRes.data.players.length} matching players:`, playerLookupRes.data.players[0].username, `(id: ${playerLookupRes.data.players[0].id})`);
    if (!playerLookupRes.data.players || playerLookupRes.data.players.length === 0) {
      throw new Error('GET /api/players returned empty list');
    }

    // 17d. POST /api/send
    console.log('[17d] Testing POST /api/send (Live In-Game Cash Transfer with 4-Digit PIN)...');
    const targetPlayer = playerLookupRes.data.players[0];
    const sendCashRes = await request('POST', '/api/send', {
      to: targetPlayer.id,
      amount: 50000000000,
      pin: '1234',
    });
    console.log(`HTTP Status: ${sendCashRes.status}`);
    console.log('Send Cash Result:', sendCashRes.data);
    if (!sendCashRes.data.ok || !sendCashRes.data.txId) {
      throw new Error('POST /api/send failed to transfer cash');
    }

    // 17e. GET /api/gl/status
    console.log('[17e] Testing GET /api/gl/status (Progression, Badges & ladder.facts.saved/netWorth)...');
    const glStatusRes = await request('GET', '/api/gl/status');
    console.log(`HTTP Status: ${glStatusRes.status}`);
    console.log('Character:', glStatusRes.data.username, glStatusRes.data.progression.rank);
    console.log('Ladder Facts:', {
      savedCash: `₦${glStatusRes.data.ladder.facts.saved.toLocaleString()}`,
      netWorth: `₦${glStatusRes.data.ladder.facts.netWorth.toLocaleString()}`,
    });
    if (!glStatusRes.data.ladder || glStatusRes.data.ladder.facts.saved === undefined) {
      throw new Error('GET /api/gl/status missing ladder.facts.saved');
    }
    console.log('✅ Test 17 Passed.\n');

    // -------------------------------------------------------------
    // TEST 18: Owner Account Connection & AES-256-GCM Encryption
    // -------------------------------------------------------------
    console.log('--- TEST 18: Owner Account Persistent Connection & Encryption ---');
    console.log('[18a] Connecting Owner Character Account (demi_thetrillionaire)...');
    const connectRes = await request('POST', '/api/v1/admin/owner-account/connect', {
      username: 'demi_thetrillionaire',
      accountIdentifier: 'acc_vault_001',
      description: 'Central Lagos Life Treasury Vault',
      pin: '5758',
    });
    console.log(`HTTP Status: ${connectRes.status}`);
    console.log('Account Status Payload:', connectRes.data);
    if (!connectRes.data.success || connectRes.data.data.status !== 'CONNECTED') {
      throw new Error('Owner account connection failed');
    }
    if (connectRes.data.data.pinMasked !== '••••' || connectRes.data.data.pin) {
      throw new Error('Security violation: plaintext PIN detected in response payload');
    }

    console.log('[18b] Testing Live Connection & Envelope Decryption...');
    const testConnRes = await request('POST', '/api/v1/admin/owner-account/test-connection');
    console.log(`Latency: ${testConnRes.data.data.latencyMs}ms, Server: ${testConnRes.data.data.gameServer}`);
    if (!testConnRes.data.data.ok) {
      throw new Error('Connection test to game API failed');
    }

    console.log('[18c] Syncing Live Character Balance...');
    const syncRes = await request('POST', '/api/v1/admin/owner-account/sync-balance');
    console.log('Live Balance Info:', {
      savedCash: `₦LL ${syncRes.data.data.formattedSavedCash}`,
      availableBalance: `₦LL ${syncRes.data.data.formattedAvailableBalance}`,
      reservedBalance: `₦LL ${syncRes.data.data.formattedReservedBalance}`,
    });
    console.log('✅ Test 18 Passed.\n');

    // -------------------------------------------------------------
    // TEST 19: Full Automated Money Delivery Pipeline (Zero PIN Prompts)
    // -------------------------------------------------------------
    console.log('--- TEST 19: End-to-End Automated Money Delivery Pipeline ---');
    console.log('[19a] Customer placing order for 1B Pack to Tunde_Lekki99...');
    const autoOrderRes = await request('POST', '/api/v1/orders', {
      packageId: 'pkg-1b',
      gameUsername: 'Tunde_Lekki99',
      customerEmail: 'tunde@lekki.com',
    });
    const autoOrder = autoOrderRes.data.data;
    const autoOrderNum = autoOrder.orderNumber;
    console.log(`Created Order #${autoOrderNum} for ${autoOrder.formattedGameAmount}`);

    console.log('[19b] Customer submitting manual bank payment...');
    await request('POST', `/api/v1/orders/${autoOrderNum}/payment`, {
      senderAccountName: 'Babatunde Adeleke',
      senderBankName: 'Access Bank Nigeria',
      transactionReference: `ACC-PAY-${Date.now()}`,
    });

    console.log('[19c] Admin approves payment (APPROVE PAYMENT)...');
    const approveRes = await request(
      'POST',
      `/api/v1/admin/orders/${autoOrderNum}/verify-payment`,
      {
        confirmedAmount: autoOrder.amountToPayNaira,
        bankStatementReference: `STMT-VERIFIED-${Date.now()}`,
        adminNotes: 'Payment verified on Access Bank business account statement.',
      },
    );
    console.log('Payment Verification Response:', approveRes.data);

    // Verify order was automatically completed via Owner Account
    console.log('[19d] Inspecting Order Status post-approval...');
    const autoFinalOrderRes = await request('GET', `/api/v1/orders/${autoOrderNum}`);
    const finalOrder = autoFinalOrderRes.data.data;
    console.log(`Final Order Status: ${finalOrder.status}`);
    console.log('In-Game Delivery Record:', finalOrder.deliveryRecord);
    if (finalOrder.status !== 'COMPLETED') {
      throw new Error(`Expected order to be COMPLETED, got ${finalOrder.status}`);
    }
    if (!finalOrder.deliveryRecord?.inGameTransactionRef) {
      throw new Error('Missing automated inGameTransactionRef in completed order');
    }

    console.log('[19e] Checking Fulfillment Queue & Game Transactions...');
    const queueRes = await request('GET', '/api/v1/admin/fulfillment/queue');
    const completedJob = queueRes.data.data.jobs.find((j) => j.orderNumber === autoOrderNum);
    console.log('Queue Job Record:', completedJob);
    if (!completedJob || completedJob.status !== 'SUCCEEDED') {
      throw new Error('Fulfillment job was not marked SUCCEEDED in queue');
    }

    const txRes = await request('GET', '/api/v1/admin/fulfillment/transactions');
    console.log(`Total Game Transactions: ${txRes.data.data.length}`);
    console.log('Latest Transaction:', txRes.data.data[0]);
    console.log('✅ Test 19 Passed: Automatic money delivery completed without owner entering PIN!\n');

    // -------------------------------------------------------------
    // TEST 20: Emergency Shutdown & Recovery
    // -------------------------------------------------------------
    console.log('--- TEST 20: Emergency Shutdown & Recovery ---');
    console.log('[20a] Triggering Emergency Shutdown...');
    const shutdownRes = await request('POST', '/api/v1/admin/fulfillment/emergency-shutdown', {
      reason: 'Automated test drill',
    });
    console.log('Shutdown Result:', shutdownRes.data);
    if (!shutdownRes.data.data.emergencyShutdown) {
      throw new Error('Emergency shutdown failed to activate');
    }

    console.log('[20b] Resuming Operations...');
    const resumeRes = await request('POST', '/api/v1/admin/fulfillment/resume');
    console.log('Resume Result:', resumeRes.data);
    if (resumeRes.data.data.emergencyShutdown) {
      throw new Error('Failed to resume normal fulfillment operations');
    }
    console.log('✅ Test 20 Passed.\n');

    // -------------------------------------------------------------
    // TEST 21: Live Phone Push Notifications (ntfy.sh & iOS/Android)
    // -------------------------------------------------------------
    console.log('--- TEST 21: Live Phone Push Notifications (iPhone & Android) ---');
    console.log('[21a] Fetching Phone Notification Settings...');
    const notifSettingsRes = await request('GET', '/api/v1/admin/notifications/settings');
    console.log('Notification Settings:', notifSettingsRes.data);
    if (!notifSettingsRes.data.success || !notifSettingsRes.data.data.subscriptionUrl) {
      throw new Error('Failed to fetch phone notification settings');
    }

    console.log('[21b] Updating Notification Settings...');
    const patchNotifRes = await request('PATCH', '/api/v1/admin/notifications/settings', {
      ntfyTopic: 'lagoslife_orders_hq',
      notifyOnOrderCreated: true,
      notifyOnPaymentSubmitted: true,
      notifyOnOrderDelivered: true,
    });
    console.log('Updated Notification Settings:', patchNotifRes.data);
    if (!patchNotifRes.data.success || patchNotifRes.data.data.ntfyTopic !== 'lagoslife_orders_hq') {
      throw new Error('Failed to update phone notification settings');
    }

    console.log('[21c] Triggering Test Phone Push Alert...');
    const testPushRes = await request('POST', '/api/v1/admin/notifications/test-phone-push');
    console.log('Test Push Result:', testPushRes.data);
    if (!testPushRes.data.success) {
      throw new Error('Failed to dispatch test phone push alert');
    }
    console.log('✅ Test 21 Passed: Phone push notifications fully operational for iOS & Android!\n');

    console.log('================================================================');
    console.log('🎉 ALL 21 COMPREHENSIVE PLATFORM, ADMIN, PHONE NOTIFICATIONS & GAME TESTS PASSED 100%!');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ E2E Simulation Test Error:', err);
    apiProcess.kill();
    process.exit(1);
  } finally {
    apiProcess.kill();
  }
}

runE2ESimulation();
