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
  console.log('1. Initializing Git repository in:', dir);
  await git.init({ fs, dir, defaultBranch: 'main' });

  console.log('2. Discovering project files...');
  const files = await getAllFiles(dir);
  console.log(`Found ${files.length} project files to stage.`);

  console.log('3. Staging all files...');
  for (const filepath of files) {
    await git.add({ fs, dir, filepath });
  }

  console.log('4. Creating commit...');
  const sha = await git.commit({
    fs,
    dir,
    message: 'feat: adaptive fulfillment engine with 70s cooldown, live API proxy cache, zero data loss database, custom trillion orders',
    author: {
      name: 'bigrobert74',
      email: 'bigrobert74@users.noreply.github.com',
    },
  });

  console.log('Commit created with SHA:', sha);

  console.log('5. Configuring remote origin...');
  await git.addRemote({
    fs,
    dir,
    remote: 'origin',
    url: 'https://github.com/bigrobert74/LagosLife-Sender.git',
    force: true,
  });

  console.log('Remote origin configured: https://github.com/bigrobert74/LagosLife-Sender.git');
}

run().catch(console.error);
