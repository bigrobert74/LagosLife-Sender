import fs from 'fs';
import path from 'path';

const sessionPath = path.resolve('C:/Users/OLADELE AKINTOLA/lagos-life-platform/apps/api/owner_account_session.json');
const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));

console.log('--- OWNER SESSION DATA ---');
console.log('Username:', session.username);
console.log('Status:', session.status);
console.log('Saved Cash:', session.savedCash);
console.log('PIN:', session.pin);
console.log('Cookies:', session.cookies);

const baseUrl = 'https://lagoslife.eliysites.com';
const cookieHeader = Object.entries(session.cookies || {})
  .map(([k, v]) => `${k}=${v}`)
  .join('; ');

const headers = {
  origin: baseUrl,
  referer: `${baseUrl}/?source=pwa`,
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',
  accept: '*/*',
  'content-type': 'application/json',
  ...(cookieHeader ? { cookie: cookieHeader } : {}),
};

async function testStatus() {
  console.log('\n--- TESTING GET /api/gl/status ---');
  try {
    const res = await fetch(`${baseUrl}/api/gl/status`, {
      method: 'GET',
      headers,
    });
    console.log('Status code:', res.status, res.statusText);
    const text = await res.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Status fetch error:', err);
  }
}

async function testSendProbe() {
  console.log('\n--- TESTING POST /api/send with Probe ---');
  // Target recipient from screenshot: a999a47af3d14c57bd65 (Kelvin / badeletio)
  const recipient = 'a999a47af3d14c57bd65';
  
  // Test with different amounts to find exact live server limit
  // 100B, 50B, 20B, 10B, 5B, 1B
  const testAmounts = [100000000000, 50000000000, 20000000000, 10000000000, 5000000000, 1000000000];
  
  for (const amt of testAmounts) {
    console.log(`\nTesting POST /api/send with amount: ${amt} (${amt / 1e9} Billion) to ${recipient}...`);
    try {
      const res = await fetch(`${baseUrl}/api/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ to: recipient, amount: amt, pin: session.pin }),
      });
      console.log('Response status:', res.status, res.statusText);
      const text = await res.text();
      console.log('Response text:', text);
      if (res.ok) {
        console.log(`>>> SUCCESS at amount: ${amt}! Breaking.`);
        break;
      }
    } catch (err) {
      console.error('Send fetch error:', err);
    }
  }
}

async function main() {
  await testStatus();
  await testSendProbe();
}

main();
