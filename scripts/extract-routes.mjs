const baseUrl = 'https://lagoslife.eliysites.com';

async function main() {
  const res = await fetch(`${baseUrl}/_next/static/chunks/3agovsy8h_-7u.js`);
  const code = await res.text();
  const routes = [...code.matchAll(/\/api\/[a-zA-Z0-9\-_?=&]+/g)].map(m => m[0]);
  const uniqueRoutes = [...new Set(routes)];
  console.log('Unique API routes in 3agovsy8h_-7u.js:');
  console.log(uniqueRoutes.sort());
}

main();
