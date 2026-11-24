const baseUrl = 'https://lagoslife.eliysites.com';
const demiCookie = '9385392fb01c729757ce510b848a2c4c93296c29b72e62eff6695c3c7a0127f7';

async function main() {
  const res = await fetch(`${baseUrl}/api/wallet`, {
    headers: {
      cookie: `ll_session=${demiCookie}`,
      origin: baseUrl,
      referer: `${baseUrl}/?source=pwa`,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  });
  console.log('Wallet status:', res.status);
  console.log('Wallet body:', await res.text());
}

main();
