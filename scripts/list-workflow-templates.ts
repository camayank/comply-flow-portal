/**
 * Script to list all workflow templates from the workflow engine
 */
import { workflowEngine } from '../server/workflow-engine';

async function listTemplates() {
  console.log('=== WORKFLOW ENGINE TEMPLATES ===\n');

  const templates = workflowEngine.getTemplates();
  console.log(`Found ${templates.length} templates in workflow engine\n`);

  // Show first 10 with details
  templates.slice(0, 15).forEach((t, i) => {
    console.log(`${i + 1}. ${t.name} (id: ${t.id})`);
    console.log(`   Category: ${t.category}, Type: ${t.type}`);
    console.log(`   Steps: ${t.steps.length}`);
    t.steps.forEach((step, j) => {
      console.log(`     ${j + 1}. ${step.name} [${step.type}] - depends: ${step.dependencies.join(', ') || 'none'}`);
    });
    console.log('');
  });

  // Show all template IDs
  console.log('\n=== ALL TEMPLATE IDs ===');
  templates.forEach(t => console.log(`  - ${t.id}`));

  process.exit(0);
}

listTemplates().catch(console.error);
