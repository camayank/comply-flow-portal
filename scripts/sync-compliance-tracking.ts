import { syncComplianceTracking } from '../server/compliance-tracking-sync';

async function run() {
  const result = await syncComplianceTracking();
  console.log(`✅ Compliance tracking sync complete. Created ${result.created} items.`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Compliance tracking sync failed:', error);
    process.exit(1);
  });
