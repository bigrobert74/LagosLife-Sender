const baseUrl = 'https://lagoslife.eliysites.com';

async function main() {
  const res = await fetch(baseUrl);
  const html = await res.text();
  console.log('HTML length:', html.length);
  const scripts = [...html.matchAll(/src=["']([^"']+)["']/g)].map(m => m[1]);
  console.log('Scripts found:', scripts);

  for (const src of scripts) {
    const fullUrl = src.startsWith('http') ? src : `${baseUrl}${src.startsWith('/') ? '' : '/'}${src}`;
    console.log('\nFetching script:', fullUrl);
    const sRes = await fetch(fullUrl);
    const code = await sRes.text();
    console.log('Script size:', code.length);

    // Search for send, restricted, cooldown, 70, etc.
    const sendIdx = code.indexOf('/api/send');
    if (sendIdx !== -1) {
      console.log('Found /api/send at index:', sendIdx);
      console.log('Snippet around /api/send:\n', code.slice(Math.max(0, sendIdx - 300), Math.min(code.length, sendIdx + 500)));
    }

    const restrictIdx = code.indexOf('restricted');
    if (restrictIdx !== -1) {
      console.log('Found "restricted" at index:', restrictIdx);
      console.log('Snippet around "restricted":\n', code.slice(Math.max(0, restrictIdx - 300), Math.min(code.length, restrictIdx + 500)));
    }

    const limitIdx = code.indexOf('send up to');
    if (limitIdx !== -1) {
      console.log('Found "send up to" at index:', limitIdx);
      console.log('Snippet around "send up to":\n', code.slice(Math.max(0, limitIdx - 300), Math.min(code.length, limitIdx + 500)));
    }

    const sec70Idx = code.indexOf('70');
    if (sec70Idx !== -1) {
      console.log('Found 70 in script');
    }
  }
}

main();
