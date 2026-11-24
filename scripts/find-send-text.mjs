const baseUrl = 'https://lagoslife.eliysites.com';

const scripts = [
  '/_next/static/chunks/23-uaoyvuwkyp.js',
  '/_next/static/chunks/1fpw2swm5hm2e.js',
  '/_next/static/chunks/0_wk2zi08y8ak.js',
  '/_next/static/chunks/1jrjy9h5cakdv.js',
  '/_next/static/chunks/turbopack-2uca_u_b_i9ru.js',
  '/_next/static/chunks/06ryq--ym31d3.js',
  '/_next/static/chunks/0ad71shpgy1ro.js',
  '/_next/static/chunks/1iap4lem44x-5.js',
  '/_next/static/chunks/30m99gyoxl9mf.js',
  '/_next/static/chunks/440j7sndoob0i.js',
  '/_next/static/chunks/244__i34wvev7.js',
  '/_next/static/chunks/3p_hv-l4ljxv4.js',
  '/_next/static/chunks/3qxh2o14sl7ih.js',
  '/_next/static/chunks/09z-vckxzvs6x.js',
  '/_next/static/chunks/2szxsktz9f8lj.js',
  '/_next/static/chunks/27_6curbicqo9.js',
  '/_next/static/chunks/218p1vh9_l-sl.js',
  '/_next/static/chunks/360fciig8hte5.js',
  '/_next/static/chunks/3agovsy8h_-7u.js',
  '/_next/static/chunks/1r50imnb7rwki.js',
  '/_next/static/chunks/2lsd3fv_91w2-.js',
  '/_next/static/chunks/3-g-ghc0361de.js',
  '/_next/static/chunks/1-uftqc6ouh22.js',
  '/_next/static/chunks/0cz1d0mv5g_q7.js',
  '/_next/static/chunks/3zcc99rj2ixn3.js'
];

async function main() {
  for (const s of scripts) {
    const res = await fetch(`${baseUrl}${s}`);
    const code = await res.text();
    const idx = code.indexOf('Send money');
    const idx2 = code.indexOf('Send Money');
    const idx3 = code.indexOf('Send cash');
    const idx4 = code.indexOf('Send Cash');
    const found = [idx, idx2, idx3, idx4].filter(i => i !== -1);
    if (found.length) {
      console.log(`Found send text in ${s} at:`, found);
      for (const i of found) {
        console.log(code.slice(Math.max(0, i - 100), Math.min(code.length, i + 300)));
      }
    }
  }
}

main();
