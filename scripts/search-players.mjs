const baseUrl = 'https://lagoslife.eliysites.com';
const demiCookie = '9385392fb01c729757ce510b848a2c4c93296c29b72e62eff6695c3c7a0127f7';

async function search(q) {
  const res = await fetch(`${baseUrl}/api/players?q=${encodeURIComponent(q)}`, {
    headers: {
      cookie: `ll_session=${demiCookie}`,
      origin: baseUrl,
      referer: `${baseUrl}/?source=pwa`,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  });
  console.log(`Search '${q}':`, res.status);
  try {
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.log(await res.text());
  }
}

async function main() {
  await search('badeletio');
  await search('selling');
}

main();
