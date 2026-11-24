const baseUrl = 'https://lagoslife.eliysites.com';

async function main() {
  const res = await fetch(`${baseUrl}/_next/static/chunks/3agovsy8h_-7u.js`);
  const code = await res.text();
  console.log(code.slice(11300, 12200));
}

main();
