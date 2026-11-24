import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const API_PORT = 3003;

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

async function runTest() {
  console.log('--- Testing Custom Large Orders (> 1 Trillion) ---');
  const apiProcess = spawn('node', ['apps/api/dist/main.js'], {
    cwd: ROOT_DIR,
    env: { ...process.env, PORT: API_PORT.toString() },
    stdio: 'inherit',
  });

  const isReady = await waitForServer();
  if (!isReady) {
    console.error('API failed to start');
    apiProcess.kill();
    process.exit(1);
  }

  try {
    // 1. Calculate quote for 2.5 Trillion (2,500,000,000,000)
    console.log('Step 1: Calculate quote for 2.5 Trillion');
    const quoteRes = await request('POST', '/api/v1/packages/quote', {
      customAmount: '2500000000000',
    });
    console.log('Quote:', quoteRes.data.data);
    if (quoteRes.data.data.nairaPrice !== 20000) {
      throw new Error(`Expected ₦20,000 for 2.5 Trillion, got ${quoteRes.data.data.nairaPrice}`);
    }
    if (quoteRes.data.data.formattedGameAmount !== '2.5 Trillion') {
      throw new Error(`Expected "2.5 Trillion", got ${quoteRes.data.data.formattedGameAmount}`);
    }
    console.log('✅ Quote calculation verified (2.5 Trillion = ₦20,000)');

    // 2. Place Custom Order
    console.log('\nStep 2: Place Custom Order for 2.5 Trillion to @highroller99');
    const orderRes = await request('POST', '/api/v1/orders', {
      customAmount: '2500000000000',
      packageId: 'custom',
      gameUsername: 'highroller99',
    });
    console.log('Order created:', orderRes.data.data);
    const order = orderRes.data.data;
    if (order.totalNairaAmount !== 20000 || order.gameCurrencyAmount !== '2500000000000') {
      throw new Error('Order amounts mismatch');
    }
    console.log('✅ Order placed correctly with exact 2.5 Trillion currency and ₦20,000 price');

    // 3. Customer submits payment
    console.log('\nStep 3: Customer submits payment reference');
    const payRes = await request('POST', `/api/v1/orders/${order.orderNumber}/submit-payment`, {
      senderAccountName: 'ALIKO DANGOTE',
      senderBankName: 'Zenith Bank',
      transactionReference: 'ZEN-99887766',
    });
    console.log('Payment submitted:', payRes.data.data.status);
    if (payRes.data.data.status !== 'PAYMENT_UNDER_REVIEW') {
      throw new Error('Status not PAYMENT_UNDER_REVIEW');
    }
    console.log('✅ Payment submitted for review');

    // 4. Admin approves payment
    console.log('\nStep 4: Admin approves payment and fulfills 2.5 Trillion');
    const approveRes = await request('POST', `/api/v1/admin/orders/${order.orderNumber}/verify-payment`, {
      confirmedAmount: 20000,
      bankStatementReference: 'ZEN-99887766-CLEARED',
      adminNotes: 'Cleared in Zenith Corporate account',
    });
    console.log('Approval result:', approveRes.data.data);
    if (approveRes.data.data.status !== 'COMPLETED') {
      throw new Error('Status not COMPLETED');
    }
    console.log('✅ Payment approved, order COMPLETED');

    // 5. Inspect final order state
    console.log('\nStep 5: Verifying final order state in system');
    const finalRes = await request('GET', `/api/v1/orders/${order.orderNumber}`);
    const finalOrder = finalRes.data.data;
    console.log('Final Order:', {
      orderNumber: finalOrder.orderNumber,
      username: finalOrder.gameUsername,
      gameCurrency: finalOrder.totalGameCurrency,
      formattedAmount: finalOrder.formattedGameAmount,
      totalNaira: finalOrder.totalNairaAmount,
      status: finalOrder.status,
      inGameRef: finalOrder.deliveryRecord?.inGameTransactionRef,
    });
    if (finalOrder.totalGameCurrency !== '2500000000000') {
      throw new Error('Exact currency amount was not preserved');
    }
    console.log('✅ Exact 2.5 Trillion order was fulfilled and confirmed!');

    console.log('\n🎉 ALL CUSTOM TRILLION CHECKS PASSED SUCCESSFULLY!');
  } finally {
    apiProcess.kill();
  }
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
