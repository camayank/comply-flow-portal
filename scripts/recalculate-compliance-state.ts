import { stateEngine } from '../server/compliance-state-engine';

async function run() {
  console.log('🔄 Starting compliance state recalculation for all entities...');
  const result = await stateEngine.recalculateAllEntities();
  console.log(`✅ Recalculation complete. Success: ${result.success}, Failed: ${result.failed}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Recalculation failed:', error);
    process.exit(1);
  });
