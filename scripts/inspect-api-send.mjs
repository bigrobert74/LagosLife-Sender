const baseUrl = 'https://lagoslife.eliysites.com';

async function main() {
  const res = await fetch(`${baseUrl}/_next/static/chunks/3agovsy8h_-7u.js`);
  const code = await res.text();
  const idx = code.indexOf('/api/send');
  console.log('Context around /api/send:');
  console.log(code.slice(Math.max(0, idx - 1000), Math.min(code.length, idx + 1000)));
}

main();
