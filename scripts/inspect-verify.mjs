const baseUrl = 'https://lagoslife.eliysites.com';

async function main() {
  const res = await fetch(`${baseUrl}/_next/static/chunks/3agovsy8h_-7u.js`);
  const code = await res.text();
  let idx = 0;
  while ((idx = code.indexOf('/api/verify', idx)) !== -1) {
    console.log(`Found /api/verify at ${idx}:`);
    console.log(code.slice(Math.max(0, idx - 100), Math.min(code.length, idx + 300)));
    idx += 11;
  }
}

main();
