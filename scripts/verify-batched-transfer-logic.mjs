// Verification script: Multi-Batch Transfer Engine (100B per 70s)
import assert from 'assert';

console.log('--- TESTING MULTI-BATCH TRANSFER LOGIC (100B PER 70s) ---');

function calculateBatches(orderAmountBig, chunkAmountBig = 100000000000n, cooldownSec = 70) {
  const MAX_LIMIT = 100000000000n; // 100 Billion
  const effectiveChunk = chunkAmountBig > MAX_LIMIT ? MAX_LIMIT : chunkAmountBig;
  const isBatched = orderAmountBig > MAX_LIMIT;
  const totalBatches = isBatched
    ? Number((orderAmountBig + effectiveChunk - 1n) / effectiveChunk)
    : 1;

  const plan = [];
  let remaining = orderAmountBig;
  for (let b = 1; b <= totalBatches; b++) {
    const batchAmount = remaining > effectiveChunk ? effectiveChunk : remaining;
    const hasCooldownAfter = remaining - batchAmount > 0n;
    plan.push({
      batchNumber: b,
      totalBatches,
      batchAmount: batchAmount.toString(),
      formatted: `${Number(batchAmount) / 1e9} Billion`,
      cooldownSeconds: hasCooldownAfter ? cooldownSec : 0,
    });
    remaining -= batchAmount;
  }
  return { isBatched, totalBatches, plan };
}

// Test Case 1: 500 Billion (User's Exact Order)
console.log('\n[TEST 1] 500 Billion Order (500,000,000,000):');
const res500B = calculateBatches(500000000000n);
console.log(`- Is Batched: ${res500B.isBatched}`);
console.log(`- Total Batches: ${res500B.totalBatches}`);
assert.strictEqual(res500B.isBatched, true);
assert.strictEqual(res500B.totalBatches, 5);
assert.strictEqual(res500B.plan.length, 5);
res500B.plan.forEach((p) => {
  console.log(`  Batch ${p.batchNumber}/${p.totalBatches}: ${p.formatted} (Cooldown: ${p.cooldownSeconds}s)`);
  assert.strictEqual(p.batchAmount, '100000000000');
  if (p.batchNumber < 5) assert.strictEqual(p.cooldownSeconds, 70);
  else assert.strictEqual(p.cooldownSeconds, 0); // No delay after last batch
});

// Test Case 2: 100 Billion (Exact Limit: Single instant transfer, 0s delay)
console.log('\n[TEST 2] 100 Billion Order (100,000,000,000):');
const res100B = calculateBatches(100000000000n);
console.log(`- Is Batched: ${res100B.isBatched}`);
console.log(`- Total Batches: ${res100B.totalBatches}`);
assert.strictEqual(res100B.isBatched, false);
assert.strictEqual(res100B.totalBatches, 1);
assert.strictEqual(res100B.plan[0].cooldownSeconds, 0);

// Test Case 3: 1 Trillion (1,000,000,000,000 -> 10 batches of 100B)
console.log('\n[TEST 3] 1 Trillion Order (1,000,000,000,000):');
const res1T = calculateBatches(1000000000000n);
console.log(`- Is Batched: ${res1T.isBatched}`);
console.log(`- Total Batches: ${res1T.totalBatches}`);
assert.strictEqual(res1T.totalBatches, 10);
assert.strictEqual(res1T.plan.length, 10);

// Test Case 4: 250 Billion (3 batches: 100B, 100B, 50B)
console.log('\n[TEST 4] 250 Billion Order (250,000,000,000):');
const res250B = calculateBatches(250000000000n);
console.log(`- Total Batches: ${res250B.totalBatches}`);
assert.strictEqual(res250B.totalBatches, 3);
assert.strictEqual(res250B.plan[0].batchAmount, '100000000000');
assert.strictEqual(res250B.plan[1].batchAmount, '100000000000');
assert.strictEqual(res250B.plan[2].batchAmount, '50000000000'); // final 50B

// Test Case 5: Safe balance formatting without crash
console.log('\n[TEST 5] Safe Balance Formatting:');
const sendResultNoBalance = { ok: true, txId: '34c24bf9d6424a7d8f42' };
const safeBalance = sendResultNoBalance?.balance != null
  ? String(sendResultNoBalance.balance)
  : sendResultNoBalance?.newBalance != null
  ? String(sendResultNoBalance.newBalance)
  : 'N/A';
console.log(`- Remaining balance string: ${safeBalance}`);
assert.strictEqual(safeBalance, 'N/A');

console.log('\n>>> ALL 5 MULTI-BATCH TRANSFER TESTS PASSED PERFECTLY! <<<');
