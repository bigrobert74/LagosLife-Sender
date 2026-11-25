import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';
import path from 'path';

const dir = path.resolve('C:/Users/OLADELE AKINTOLA/lagos-life-platform');

async function pushRepo() {
  console.log('Attempting push to https://github.com/bigrobert74/LagosLife-Sender.git...');

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  const pushResult = await git.push({
    fs,
    http,
    dir,
    remote: 'origin',
    ref: 'main',
    force: true,
    onAuth: () => {
      if (token) {
        return { username: token };
      }
      return undefined;
    },
  });

  console.log('Push result:', JSON.stringify(pushResult, null, 2));
}

pushRepo().catch((err) => {
  console.error('Push error:', err.message, err.data || '');
});
