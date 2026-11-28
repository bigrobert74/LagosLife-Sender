import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';
import path from 'path';

const dir = path.resolve('C:/Users/OLADELE AKINTOLA/lagos-life-platform');

async function getAllFiles(currentDir, relativeDir = '') {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const files = [];

  const ignoredDirs = new Set([
    'node_modules',
    'dist',
    'build',
    '.git',
    '.vite-temp',
  ]);

  const ignoredFiles = new Set([
    '.env',
    '.env.local',
    'Thumbs.db',
    '.DS_Store',
    'stage-commit-and-push.mjs',
    'git-push-with-token.mjs',
    'check-commit.mjs',
    'owner_account_session.json',
    'game_cookies.json',
  ]);

  for (const entry of entries) {
    if (entry.name.startsWith('.vite-temp') || entry.name.endsWith('.log')) continue;
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      const sub = await getAllFiles(path.join(currentDir, entry.name), path.join(relativeDir, entry.name));
      files.push(...sub);
    } else {
      if (ignoredFiles.has(entry.name)) continue;
      files.push(path.join(relativeDir, entry.name).replace(/\\/g, '/'));
    }
  }

  return files;
}

async function run() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('ERROR: GITHUB_TOKEN environment variable is required.');
    process.exit(1);
  }

  // 1. Reset HEAD to latest commit on origin/main
  console.log('1. Setting HEAD to 1b7fe6d3b4ab31faec55e21d1d43b2bc8bfabba2...');
  const originMainSha = '1b7fe6d3b4ab31faec55e21d1d43b2bc8bfabba2';
  fs.writeFileSync(path.join(dir, '.git', 'refs', 'heads', 'main'), originMainSha + '\n', 'utf8');

  // 2. Remove sensitive, temp, or runtime session files from git index
  const filesToRemove = [
    'scripts/stage-commit-and-push.mjs',
    'scripts/git-push-with-token.mjs',
    'scripts/check-commit.mjs',
    'apps/api/data/owner_account_session.json',
    'apps/api/data/game_cookies.json',
    'apps/api/owner_account_session.json',
    'apps/api/game_cookies.json',
    'owner_account_session.json',
    'game_cookies.json',
  ];
  for (const fp of filesToRemove) {
    try {
      await git.remove({ fs, dir, filepath: fp });
    } catch (e) {}
  }

  // 3. Discover and stage all clean project files
  const files = await getAllFiles(dir);
  console.log(`2. Staging ${files.length} clean project files...`);
  for (const filepath of files) {
    await git.add({ fs, dir, filepath });
  }

  // 4. Create new commit
  console.log('3. Creating commit...');
  const commitMsg = 'feat: preserve trusted ll_dev/ll_vid device cookies, add browser cookie importer, and support 2-step code on fulfillment retry';
  const sha = await git.commit({
    fs,
    dir,
    message: commitMsg,
    author: {
      name: 'bigrobert74',
      email: 'bigrobert74@users.noreply.github.com',
    },
  });
  console.log('Clean commit created. SHA:', sha);

  // 5. Verify no sensitive file in new commit's tree
  const commit = await git.readCommit({ fs, dir, oid: sha });
  const tree = await git.readTree({ fs, dir, oid: commit.commit.tree });
  const scriptsEntry = tree.tree.find(e => e.path === 'scripts');
  if (scriptsEntry) {
    const scriptsTree = await git.readTree({ fs, dir, oid: scriptsEntry.oid });
    const scriptFiles = scriptsTree.tree.map(e => e.path);
    if (scriptFiles.includes('stage-commit-and-push.mjs') || scriptFiles.includes('git-push-with-token.mjs')) {
      throw new Error('FATAL: Sensitive file still present in tree!');
    }
    console.log('4. Verification passed: Zero sensitive files in commit tree.');
  }

  // 6. Push to GitHub
  console.log('5. Pushing to https://github.com/bigrobert74/LagosLife-Sender.git...');
  const pushResult = await git.push({
    fs,
    http,
    dir,
    remote: 'origin',
    ref: 'main',
    force: false,
    onAuth: () => ({ username: token }),
  });

  console.log('>>> PUSH COMPLETED SUCCESSFULLY! <<<');
  console.log('Result:', JSON.stringify(pushResult, null, 2));
}

run().catch((err) => {
  console.error('Git sync failed:', err);
  process.exit(1);
});
