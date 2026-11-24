import fs from 'fs';

const baseUrl = 'https://lagoslife.eliysites.com';

async function main() {
  const r = await fetch(baseUrl + '/_next/static/chunks/3agovsy8h_-7u.js');
  const code = await r.text();
  const idx = code.indexOf('"canSendValue",0,()=>');
  console.log('Snippet around canSendValue:');
  console.log(code.slice(Math.max(0, idx - 1500), Math.min(code.length, idx + 500)));
}

main().catch(console.error);
