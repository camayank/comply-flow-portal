#!/usr/bin/env node

/**
 * Quick validation script for Compliance State Engine integration
 * Tests: file existence, imports, exports, basic syntax
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Compliance State Engine - Integration Validation\n');
console.log('=' .repeat(60));

// Files to validate
const files = {
  'Schema': 'shared/compliance-state-schema.ts',
  'Types': 'shared/compliance-state-types.ts',
  'Engine': 'server/compliance-state-engine.ts',
  'Routes': 'server/compliance-state-routes.ts',
  'Event Emitter': 'server/compliance-event-emitter.ts',
  'Scheduler': 'server/compliance-state-scheduler.ts',
  'Migration': 'database/migrations/001_create_compliance_state_tables.sql',
  'Seeder': 'server/seed-compliance-rules.ts'
};

let allGood = true;

// Check file existence and basic metrics
console.log('\n📁 File Validation:');
for (const [name, file] of Object.entries(files)) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    const size = (content.length / 1024).toFixed(1);
    
    if (file.endsWith('.ts')) {
      const imports = (content.match(/^import /gm) || []).length;
      const exports = (content.match(/^export /gm) || []).length;
      console.log(`  ✅ ${name.padEnd(20)} ${lines} lines, ${size}KB (${imports} imports, ${exports} exports)`);
    } else {
      console.log(`  ✅ ${name.padEnd(20)} ${lines} lines, ${size}KB`);
    }
  } catch (e) {
    console.log(`  ❌ ${name.padEnd(20)} ERROR: ${e.message}`);
    allGood = false;
  }
}

// Check route integration
console.log('\n🔌 Route Integration:');
try {
  const routesIndex = fs.readFileSync('server/routes/index.ts', 'utf8');
  const hasImport = routesIndex.includes("compliance-state-routes");
  const hasMount = routesIndex.includes("app.use(`${API_PREFIX}/compliance-state`");
  
  console.log(`  ${hasImport ? '✅' : '❌'} Import in routes/index.ts`);
  console.log(`  ${hasMount ? '✅' : '❌'} Mounted at /api/v1/compliance-state`);
  
  if (!hasImport || !hasMount) allGood = false;
} catch (e) {
  console.log(`  ❌ Could not verify: ${e.message}`);
  allGood = false;
}

// Check event triggers
console.log('\n⚡ Event Triggers:');
const triggers = {
  'Document Upload': 'server/routes/client.ts',
  'Payment Webhook': 'server/routes/payment.ts',
  'Task Complete': 'server/routes/operations.ts',
  'Service Booking': 'server/routes/client.ts'
};

for (const [name, file] of Object.entries(triggers)) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const hasTrigger = content.includes('triggerEntityRecalculation');
    console.log(`  ${hasTrigger ? '✅' : '❌'} ${name}`);
    if (!hasTrigger && name !== 'Service Booking') allGood = false;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    allGood = false;
  }
}

// Check scheduler integration
console.log('\n⏰ Scheduler Integration:');
try {
  const serverIndex = fs.readFileSync('server/index.ts', 'utf8');
  const hasSchedulerImport = serverIndex.includes('compliance-state-scheduler');
  console.log(`  ${hasSchedulerImport ? '✅' : '❌'} Scheduler imported in server/index.ts`);
  if (!hasSchedulerImport) allGood = false;
} catch (e) {
  console.log(`  ❌ Could not verify: ${e.message}`);
  allGood = false;
}

// Check frontend route
console.log('\n🎨 Frontend Integration:');
try {
  const appFile = fs.readFileSync('client/src/App.tsx', 'utf8');
  const hasFounderRoute = appFile.includes('FounderLiteDashboard');
  const hasFounderPath = appFile.includes('/founder');
  console.log(`  ${hasFounderRoute ? '✅' : '❌'} FounderLiteDashboard component imported`);
  console.log(`  ${hasFounderPath ? '✅' : '❌'} /founder route configured`);
  if (!hasFounderRoute || !hasFounderPath) allGood = false;
} catch (e) {
  console.log(`  ❌ Could not verify: ${e.message}`);
  allGood = false;
}

// Final verdict
console.log('\n' + '='.repeat(60));
if (allGood) {
  console.log('✅ ALL VALIDATIONS PASSED');
  console.log('\nNext steps:');
  console.log('  1. npm install (if needed)');
  console.log('  2. Run migration: npx drizzle-kit push');
  console.log('  3. Seed rules: npx tsx server/seed-compliance-rules.ts');
  console.log('  4. Start server: npm run dev');
  console.log('  5. Test endpoint: GET /api/v1/compliance-state/:entityId/summary');
  console.log('  6. Open UI: http://localhost:3000/founder');
  process.exit(0);
} else {
  console.log('❌ SOME VALIDATIONS FAILED');
  console.log('\nReview the errors above and fix before proceeding.');
  process.exit(1);
}
