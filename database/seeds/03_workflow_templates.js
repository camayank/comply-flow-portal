/**
 * Seed file for workflow templates
 * Creates predefined workflow templates for common business processes
 */

exports.seed = async function(knex) {
  // Note: Workflows table requires created_by user reference
  // This is a simplified version - actual workflows would be created dynamically

  console.log('✓ Workflow templates seed - workflows are created dynamically per client');

  // In a real implementation, you might want to insert default workflow templates
  // that can be cloned for each client. For now, we'll skip this as workflows
  // are typically created based on services assigned to clients.

  // Example workflow template structure (commented out):
  /*
  const workflowTemplates = [
    {
      name: 'Private Limited Company Incorporation',
      description: 'Standard workflow for Pvt Ltd company registration',
      steps: [
        { step: 1, name: 'Name Approval (RUN)', duration: '2 days' },
        { step: 2, name: 'Document Collection', duration: '1 day' },
        { step: 3, name: 'SPICe+ Filing', duration: '3 days' },
        { step: 4, name: 'Certificate Issuance', duration: '1 day' },
        { step: 5, name: 'PAN & TAN', duration: '2 days' }
      ]
    },
    {
      name: 'GST Registration',
      description: 'GST registration workflow',
      steps: [
        { step: 1, name: 'Document Collection', duration: '1 day' },
        { step: 2, name: 'GST Application Filing', duration: '2 days' },
        { step: 3, name: 'ARN Generation', duration: '1 day' },
        { step: 4, name: 'Certificate Download', duration: '3 days' }
      ]
    }
  ];
  */
};
