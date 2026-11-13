import { readdir } from 'node:fs/promises';
import { basename, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import dataSource from './data-source.js';
import type { Seed } from './seed.interface.js';

const featuresDir = join(import.meta.dirname, '..', '..', 'features');

async function findSeedFiles(): Promise<string[]> {
  const files = await readdir(featuresDir, { recursive: true });
  return files
    .filter((file) => file.endsWith('.seed.js'))
    .filter((file) => file.split(sep).includes('seeds'))
    .map((file) => join(featuresDir, file))
    .sort((a, b) => basename(a).localeCompare(basename(b)));
}

if (process.env.NODE_ENV === 'production') {
  throw new Error('Seeds are for local development only');
}

await dataSource.initialize();
try {
  for (const file of await findSeedFiles()) {
    const { default: seed } = (await import(pathToFileURL(file).href)) as {
      default: Seed;
    };
    console.log(`Seeding ${basename(file)}`);
    await dataSource.transaction((manager) => seed.run(manager));
  }
} finally {
  await dataSource.destroy();
}
