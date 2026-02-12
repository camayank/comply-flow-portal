import { db } from '../server/db';
import { complianceRules } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function run() {
  const result = await db
    .update(complianceRules)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(complianceRules.regulationCategory, 'GENERAL'))
    .returning({ id: complianceRules.id, ruleCode: complianceRules.ruleCode });

  console.log(`✅ Deactivated ${result.length} GENERAL rules.`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed to deactivate GENERAL rules:', error);
    process.exit(1);
  });
