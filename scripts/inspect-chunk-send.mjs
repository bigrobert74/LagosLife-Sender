const baseUrl = 'https://lagoslife.eliysites.com';

async function main() {
  const res = await fetch(`${baseUrl}/_next/static/chunks/1r50imnb7rwki.js`);
  const code = await res.text();
  console.log('Size:', code.length);

  let idx = 0;
  while ((idx = code.indexOf('/api/send', idx)) !== -1) {
    console.log(`\nFound /api/send at ${idx}:`);
    console.log(code.slice(Math.max(0, idx - 200), Math.min(code.length, idx + 400)));
    idx += 9;
  }

  let idx2 = 0;
  while ((idx2 = code.indexOf('send', idx2)) !== -1) {
    const snip = code.slice(Math.max(0, idx2 - 50), Math.min(code.length, idx2 + 100));
    if (snip.includes('amount') || snip.includes('recipient') || snip.includes('transfer')) {
      console.log(`\nFound send context at ${idx2}:`);
      console.log(snip);
    }
    idx2 += 4;
  }
}

main();
