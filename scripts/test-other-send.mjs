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

async function testSendOther() {
  const target = 'd42fb0d8c15d4b878ed7'; // sellinglagolifemoney
  console.log('Sending 1,000 to sellinglagolifemoney...');
  const res = await fetch(`${baseUrl}/api/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ to: target, amount: 1000, pin: demiPin }),
  });
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
}

testSendOther();
