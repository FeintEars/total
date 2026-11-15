import dataSource from './data-source.js';

const environment = process.env.VERCEL_ENV;

if (environment && environment !== 'production') {
  console.log(`Skipping migrations on the ${environment} deployment`);
} else {
  await dataSource.initialize();
  try {
    const migrations = await dataSource.runMigrations({ transaction: 'all' });
    console.log(
      migrations.length
        ? `Applied migrations: ${migrations.map(({ name }) => name).join(', ')}`
        : 'No pending migrations',
    );
  } finally {
    await dataSource.destroy();
  }
}
