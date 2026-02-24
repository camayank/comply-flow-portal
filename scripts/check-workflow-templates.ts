/**
 * Script to check workflow templates in the database
 */
import { db } from '../server/db';
import { workflowTemplates, serviceCatalogue } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function checkWorkflowTemplates() {
  console.log('=== WORKFLOW TEMPLATES CHECK ===\n');

  // Check workflow_templates table
  try {
    const templates = await db.select().from(workflowTemplates);
    console.log(`Found ${templates.length} workflow templates:\n`);

    if (templates.length === 0) {
      console.log('❌ No workflow templates found in workflow_templates table');
    } else {
      templates.forEach((t, i) => {
        const steps = t.workflowSteps as any[];
        console.log(`${i + 1}. ${t.templateName}`);
        console.log(`   Service Code: ${t.serviceCode}`);
        console.log(`   Version: ${t.version}`);
        console.log(`   Steps: ${Array.isArray(steps) ? steps.length : 'N/A'}`);
        if (Array.isArray(steps) && steps.length > 0) {
          steps.forEach((step, j) => {
            console.log(`     Step ${j + 1}: ${step.name || step.stepName} (${step.assignedRole || step.role})`);
          });
        }
        console.log('');
      });
    }
  } catch (error) {
    console.log('Error querying workflow_templates:', error);
  }

  // Check workflow_templates_admin table
  try {
    const adminTemplates = await db.execute(sql`
      SELECT id, service_key, version, is_published,
             LENGTH(template_json) as json_length
      FROM workflow_templates_admin
      LIMIT 10
    `);
    console.log(`\nFound ${adminTemplates.rows.length} admin workflow templates`);
    if (adminTemplates.rows.length > 0) {
      adminTemplates.rows.forEach((t: any) => {
        console.log(`  - ${t.service_key} (v${t.version}, published: ${t.is_published})`);
      });
    }
  } catch (error) {
    console.log('workflow_templates_admin table may not exist or is empty');
  }

  // Check services that could have templates
  try {
    const services = await db.select({
      id: serviceCatalogue.id,
      serviceKey: serviceCatalogue.serviceKey,
      serviceName: serviceCatalogue.serviceName,
      category: serviceCatalogue.category,
    }).from(serviceCatalogue).limit(10);

    console.log(`\n=== SAMPLE SERVICES (${services.length} shown) ===`);
    services.forEach(s => {
      console.log(`  - [${s.serviceKey}] ${s.serviceName} (${s.category})`);
    });
  } catch (error) {
    console.log('Error querying services:', error);
  }

  process.exit(0);
}

checkWorkflowTemplates().catch(console.error);
