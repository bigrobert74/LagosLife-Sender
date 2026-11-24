import fs from 'fs';
import path from 'path';

const baseUrl = 'https://lagoslife.eliysites.com';

async function testAknJesse10M() {
  const sessionPath = path.resolve('C:/Users/OLADELE AKINTOLA/lagos-life-platform/apps/api/owner_account_session.json');
  const session = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
  const cookieHeader = Object.entries(session.cookies || {})
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

  const headers = {
    origin: baseUrl,
    referer: `${baseUrl}/?source=pwa`,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    accept: '*/*',
    'content-type': 'application/json',
    ...(cookieHeader ? { cookie: cookieHeader } : {}),
  };

  console.log('\n--- TESTING Akn_Jesse with 10,000,000 (10 Million) ---');
  try {
    const res = await fetch(`${baseUrl}/api/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to: 'a999a47af3d14c57bd65', amount: 10000000, pin: session.pin }),
    });
    console.log('10M send status:', res.status, res.statusText);
    const text = await res.text();
    console.log('10M send response:', text);
  } catch (err) {
    console.error('Err:', err);
  }
}

async function testDemiLogin() {
  console.log('\n--- TESTING LOGIN FOR demi_thetrillionaire ---');
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        origin: baseUrl,
        referer: `${baseUrl}/?source=pwa`,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        accept: '*/*',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        username: 'demi_thetrillionaire',
        password: 'April@22',
      }),
    });
    console.log('Login status:', res.status, res.statusText);
    const cookies = res.headers.get('set-cookie');
    console.log('Set-Cookie:', cookies);
    const text = await res.text();
    console.log('Login response:', text);
  } catch (err) {
    console.error('Login err:', err);
  }
}

async function main() {
  await testAknJesse10M();
  await testDemiLogin();
}

main();
