import { db } from '../server/db';
import { complianceRules, compliancePenaltyDefinitions } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { seedComplianceRules, seedCompliancePenalties } from '../server/compliance-rules-seeder';

const storageAdapter = {
  async getComplianceRuleByCode(ruleCode: string) {
    const [rule] = await db
      .select()
      .from(complianceRules)
      .where(eq(complianceRules.ruleCode, ruleCode))
      .limit(1);
    return rule;
  },
  async createComplianceRule(rule: any) {
    const [created] = await db
      .insert(complianceRules)
      .values(rule)
      .returning();
    return created;
  },
  async createCompliancePenalty(penalty: any) {
    const [existing] = await db
      .select({ id: compliancePenaltyDefinitions.id })
      .from(compliancePenaltyDefinitions)
      .where(
        and(
          eq(compliancePenaltyDefinitions.complianceRuleId, penalty.complianceRuleId),
          eq(compliancePenaltyDefinitions.penaltyType, penalty.penaltyType),
          eq(compliancePenaltyDefinitions.calculationType, penalty.calculationType)
        )
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(compliancePenaltyDefinitions)
      .values(penalty)
      .returning();
    return created;
  }
} as any;

async function run() {
  await seedComplianceRules(storageAdapter);
  await seedCompliancePenalties(storageAdapter);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Compliance library seeding failed:', error);
    process.exit(1);
  });
