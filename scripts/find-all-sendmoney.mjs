const baseUrl = 'https://lagoslife.eliysites.com';

async function main() {
  const res = await fetch(baseUrl);
  const html = await res.text();
  const scripts = [...html.matchAll(/src=["']([^"']+)["']/g)].map(m => m[1]);

  for (const s of scripts) {
    const fullUrl = s.startsWith('http') ? s : `${baseUrl}${s.startsWith('/') ? '' : '/'}${s}`;
    const sRes = await fetch(fullUrl);
    const code = await sRes.text();
    const regex = /[a-zA-Z0-9_]+\.sendMoney\(/g;
    let m;
    while ((m = regex.exec(code)) !== null) {
      console.log(`Found ${m[0]} in ${s} at ${m.index}:`);
      console.log(code.slice(Math.max(0, m.index - 300), Math.min(code.length, m.index + 600)));
    }
  }
}

main();
