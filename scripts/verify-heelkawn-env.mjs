import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const fileChecks = [
  {
    file: '.env.example',
    keys: [
      'VITE_HEELKAWN_DOWNLOAD_URL',
      'VITE_HEELKAWN_PC_DOWNLOAD_URL',
      'VITE_HEELKAWN_REPO_URL',
      'NEXT_PUBLIC_HEELKAWN_DOWNLOAD_URL',
      'NEXT_PUBLIC_HEELKAWN_PC_DOWNLOAD_URL',
      'NEXT_PUBLIC_HEELKAWN_REPO_URL',
    ],
  },
  {
    file: '.env.local.example',
    keys: [
      'VITE_HEELKAWN_DOWNLOAD_URL',
      'VITE_HEELKAWN_PC_DOWNLOAD_URL',
      'VITE_HEELKAWN_REPO_URL',
      'NEXT_PUBLIC_HEELKAWN_DOWNLOAD_URL',
      'NEXT_PUBLIC_HEELKAWN_PC_DOWNLOAD_URL',
      'NEXT_PUBLIC_HEELKAWN_REPO_URL',
    ],
  },
  {
    file: 'Frontend/.env.example',
    keys: [
      'VITE_HEELKAWN_DOWNLOAD_URL',
      'VITE_HEELKAWN_PC_DOWNLOAD_URL',
      'VITE_HEELKAWN_REPO_URL',
    ],
  },
  {
    file: 'apps/pva-bazaar-web/.env.example',
    keys: [
      'NEXT_PUBLIC_HEELKAWN_DOWNLOAD_URL',
      'NEXT_PUBLIC_HEELKAWN_PC_DOWNLOAD_URL',
      'NEXT_PUBLIC_HEELKAWN_REPO_URL',
    ],
  },
];

let failed = false;

for (const check of fileChecks) {
  const absolute = path.join(root, check.file);
  const content = fs.readFileSync(absolute, 'utf8');
  for (const key of check.keys) {
    if (!content.includes(`${key}=`)) {
      failed = true;
      console.error(`Missing ${key} in ${check.file}`);
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log('HeelKawn env templates are complete.');
