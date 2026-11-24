const baseUrl = 'https://lagoslife.eliysites.com';
const demiCookie = '9385392fb01c729757ce510b848a2c4c93296c29b72e62eff6695c3c7a0127f7';
const demiPin = '5758';

const headers = {
  origin: baseUrl,
  referer: `${baseUrl}/?source=pwa`,
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  accept: '*/*',
  'content-type': 'application/json',
  cookie: `ll_session=${demiCookie}`,
};

async function testLimits() {
  const target = 'd42fb0d8c15d4b878ed7'; // sellinglagolifemoney
  const testAmounts = [100000000, 20000000, 15000000, 10000000, 9998000];

  for (const amt of testAmounts) {
    console.log(`\nTrying ${amt} to sellinglagolifemoney...`);
    const res = await fetch(`${baseUrl}/api/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to: target, amount: amt, pin: demiPin }),
    });
    console.log('Status:', res.status);
    const body = await res.text();
    console.log('Body:', body);
    if (res.ok) {
      console.log('Success with amount:', amt);
      break;
    }
  }
}

testLimits();
