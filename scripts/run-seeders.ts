/**
 * Run Backend Seeders
 *
 * Invokes the existing backend seeders directly.
 *
 * Run: npx tsx scripts/run-seeders.ts
 */

import { serviceSeeder } from '../server/service-seeder';

async function main() {
  console.log('🚀 Running Backend Seeders...\n');

  try {
    // Seed all services (uses SERVER_CATALOG + workflows + doc types + due dates + notifications)
    await serviceSeeder.seedAllServices();

    console.log('\n✨ All seeders completed successfully!');
  } catch (error) {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
