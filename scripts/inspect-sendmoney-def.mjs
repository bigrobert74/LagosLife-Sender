const baseUrl = 'https://lagoslife.eliysites.com';

async function main() {
  const res = await fetch(`${baseUrl}/_next/static/chunks/3agovsy8h_-7u.js`);
  const code = await res.text();
  const idx = code.indexOf('sendMoney');
  console.log(code.slice(idx - 100, idx + 300));
}

main();
