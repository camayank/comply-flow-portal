/**
 * Script to check workflow_templates_admin format
 */
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkAdminTemplates() {
  console.log('=== CHECKING ADMIN WORKFLOW TEMPLATES ===\n');

  try {
    // Get one template to see its structure
    const result = await db.execute(sql`
      SELECT id, service_key, version, is_published, template_json
      FROM workflow_templates_admin
      WHERE service_key = 'pvt_ltd_incorporation'
      LIMIT 1
    `);

    if (result.rows.length > 0) {
      const template = result.rows[0] as any;
      console.log(`Template: ${template.service_key}`);
      console.log(`Version: ${template.version}`);
      console.log(`Published: ${template.is_published}`);
      console.log('\nTemplate JSON structure:');

      try {
        const templateData = JSON.parse(template.template_json);
        console.log(JSON.stringify(templateData, null, 2).substring(0, 3000));

        // Check if it has steps
        if (templateData.steps) {
          console.log(`\n\n=== STEPS (${templateData.steps.length}) ===`);
          templateData.steps.forEach((step: any, i: number) => {
            console.log(`Step ${i + 1}: ${step.name || step.stepName}`);
            console.log(`  - ID: ${step.id || step.stepId}`);
            console.log(`  - Role: ${step.assignedRole || step.role}`);
            console.log(`  - Type: ${step.taskType || step.type}`);
            console.log(`  - Dependencies: ${JSON.stringify(step.dependsOn || step.dependencies || [])}`);
            console.log(`  - Requires QC: ${step.requiresQc || step.requires_qc || false}`);
          });
        }
      } catch (e) {
        console.log('Raw template_json:', template.template_json?.substring(0, 2000));
      }
    } else {
      console.log('No templates found');
    }

    // List all service keys
    const allKeys = await db.execute(sql`
      SELECT service_key FROM workflow_templates_admin ORDER BY service_key
    `);
    console.log('\n=== ALL SERVICE KEYS ===');
    allKeys.rows.forEach((r: any) => console.log(`  - ${r.service_key}`));

  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

checkAdminTemplates().catch(console.error);
