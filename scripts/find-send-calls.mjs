const baseUrl = 'https://lagoslife.eliysites.com';

const scripts = [
  '/_next/static/chunks/360fciig8hte5.js',
  '/_next/static/chunks/0cz1d0mv5g_q7.js',
  '/_next/static/chunks/1fpw2swm5hm2e.js',
  '/_next/static/chunks/0_wk2zi08y8ak.js',
  '/_next/static/chunks/2szxsktz9f8lj.js',
  '/_next/static/chunks/2lsd3fv_91w2-.js',
  '/_next/static/chunks/3-g-ghc0361de.js',
  '/_next/static/chunks/1-uftqc6ouh22.js',
];

async function main() {
  for (const s of scripts) {
    const res = await fetch(`${baseUrl}${s}`);
    const code = await res.text();
    const matches = [...code.matchAll(/sendMoney/g)];
    if (matches.length) {
      console.log(`Found ${matches.length} matches in ${s}`);
      for (const m of matches) {
        console.log(code.slice(Math.max(0, m.index - 200), Math.min(code.length, m.index + 300)));
      }
    }
  }
}

main();
