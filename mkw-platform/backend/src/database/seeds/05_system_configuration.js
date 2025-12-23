/**
 * Seed System Configuration
 * Creates default system configuration and notification templates
 */

exports.seed = async function(knex) {
  // Clear existing entries
  await knex('notification_templates').del();
  await knex('system_config').del();
  
  // System Configuration
  const systemConfig = [
    // Company Information
    {
      category: 'company',
      key: 'name',
      value: 'MKW Advisors',
      data_type: 'string',
      description: 'Company name displayed in documents and communications',
      is_public: true,
      is_editable: true
    },
    {
      category: 'company',
      key: 'email',
      value: 'info@mkwadvisors.com',
      data_type: 'string',
      description: 'Primary company email address',
      is_public: true,
      is_editable: true
    },
    {
      category: 'company',
      key: 'phone',
      value: '+91-11-4567-8900',
      data_type: 'string',
      description: 'Primary company phone number',
      is_public: true,
      is_editable: true
    },
    {
      category: 'company',
      key: 'address',
      value: 'MKW Tower, Connaught Place, New Delhi - 110001',
      data_type: 'string',
      description: 'Company registered address',
      is_public: true,
      is_editable: true
    },
    {
      category: 'company',
      key: 'website',
      value: 'https://mkwadvisors.com',
      data_type: 'string',
      description: 'Company website URL',
      is_public: true,
      is_editable: true
    },
    {
      category: 'company',
      key: 'gstin',
      value: '07XXXXX1234X1ZX',
      data_type: 'string',
      description: 'Company GST identification number',
      is_public: false,
      is_editable: true
    },
    
    // Platform Settings
    {
      category: 'platform',
      key: 'timezone',
      value: 'Asia/Kolkata',
      data_type: 'string',
      description: 'Default platform timezone',
      is_public: true,
      is_editable: true
    },
    {
      category: 'platform',
      key: 'currency',
      value: 'INR',
      data_type: 'string',
      description: 'Default currency for transactions',
      is_public: true,
      is_editable: true
    },
    {
      category: 'platform',
      key: 'language',
      value: 'en',
      data_type: 'string',
      description: 'Default platform language',
      is_public: true,
      is_editable: true
    },
    {
      category: 'platform',
      key: 'maintenance_mode',
      value: 'false',
      data_type: 'boolean',
      description: 'Enable maintenance mode to restrict access',
      is_public: true,
      is_editable: true
    },
    
    // Email Configuration
    {
      category: 'email',
      key: 'smtp_enabled',
      value: 'true',
      data_type: 'boolean',
      description: 'Enable SMTP email sending',
      is_public: false,
      is_editable: true
    },
    {
      category: 'email',
      key: 'from_name',
      value: 'MKW Advisors',
      data_type: 'string',
      description: 'Default sender name for emails',
      is_public: false,
      is_editable: true
    },
    {
      category: 'email',
      key: 'from_email',
      value: 'noreply@mkwadvisors.com',
      data_type: 'string',
      description: 'Default sender email address',
      is_public: false,
      is_editable: true
    },
    
    // File Upload Settings
    {
      category: 'files',
      key: 'max_file_size',
      value: '10485760',
      data_type: 'number',
      description: 'Maximum file size in bytes (10MB)',
      is_public: true,
      is_editable: true
    },
    {
      category: 'files',
      key: 'allowed_extensions',
      value: 'pdf,doc,docx,jpg,jpeg,png,xls,xlsx,zip',
      data_type: 'string',
      description: 'Allowed file extensions (comma separated)',
      is_public: true,
      is_editable: true
    },
    {
      category: 'files',
      key: 'storage_path',
      value: './uploads',
      data_type: 'string',
      description: 'Local storage path for uploaded files',
      is_public: false,
      is_editable: true
    },
    
    // Business Rules
    {
      category: 'business',
      key: 'auto_assign_requests',
      value: 'true',
      data_type: 'boolean',
      description: 'Automatically assign service requests to available executives',
      is_public: false,
      is_editable: true
    },
    {
      category: 'business',
      key: 'require_payment_before_delivery',
      value: 'false',
      data_type: 'boolean',
      description: 'Require full payment before final delivery',
      is_public: false,
      is_editable: true
    },
    {
      category: 'business',
      key: 'default_sla_hours',
      value: '48',
      data_type: 'number',
      description: 'Default SLA in hours for service requests',
      is_public: true,
      is_editable: true
    },
    
    // Security Settings
    {
      category: 'security',
      key: 'session_timeout',
      value: '3600',
      data_type: 'number',
      description: 'Session timeout in seconds (1 hour)',
      is_public: false,
      is_editable: true
    },
    {
      category: 'security',
      key: 'max_login_attempts',
      value: '5',
      data_type: 'number',
      description: 'Maximum login attempts before account lockout',
      is_public: false,
      is_editable: true
    },
    {
      category: 'security',
      key: 'password_min_length',
      value: '8',
      data_type: 'number',
      description: 'Minimum password length requirement',
      is_public: false,
      is_editable: true
    }
  ];
  
  await knex('system_config').insert(systemConfig);
  
  // Notification Templates
  const notificationTemplates = [
    {
      name: 'Service Request Received',
      code: 'service_request_received',
      type: 'email',
      subject: 'Service Request Received - {{request_number}}',
      content: `Dear {{client_name}},

Thank you for choosing MKW Advisors for your {{service_name}} requirements.

Your service request has been received and assigned request number: {{request_number}}

Request Details:
- Service: {{service_name}}
- Expected Delivery: {{expected_delivery_date}}
- Assigned Executive: {{assigned_executive}}

We will keep you updated on the progress. If you have any questions, please contact us at {{company_email}} or call {{company_phone}}.

Best regards,
MKW Advisors Team`,
      variables: JSON.stringify([
        'client_name', 'service_name', 'request_number', 'expected_delivery_date',
        'assigned_executive', 'company_email', 'company_phone'
      ]),
      trigger: 'status_change',
      trigger_conditions: JSON.stringify({
        from_status: 'draft',
        to_status: 'submitted'
      }),
      is_active: true
    },
    
    {
      name: 'Document Required',
      code: 'document_required',
      type: 'email',
      subject: 'Additional Documents Required - {{request_number}}',
      content: `Dear {{client_name}},

To proceed with your {{service_name}} request ({{request_number}}), we need the following documents:

{{required_documents}}

Please upload these documents through our client portal or email them to {{company_email}}.

If you have any questions about the required documents, please contact your assigned executive {{assigned_executive}} or call {{company_phone}}.

Thank you for your cooperation.

Best regards,
MKW Advisors Team`,
      variables: JSON.stringify([
        'client_name', 'service_name', 'request_number', 'required_documents',
        'assigned_executive', 'company_email', 'company_phone'
      ]),
      trigger: 'status_change',
      trigger_conditions: JSON.stringify({
        to_status: 'pending_documents'
      }),
      is_active: true
    },
    
    {
      name: 'Service Completed',
      code: 'service_completed',
      type: 'email',
      subject: 'Service Completed - {{request_number}}',
      content: `Dear {{client_name}},

Great news! Your {{service_name}} request ({{request_number}}) has been completed successfully.

Deliverables:
{{deliverables_list}}

You can download your documents from the client portal or they will be sent to you via email.

Payment Details:
- Total Amount: ₹{{final_amount}}
- Payment Status: {{payment_status}}

We would appreciate your feedback on our service. Please rate your experience in the client portal.

Thank you for choosing MKW Advisors!

Best regards,
MKW Advisors Team`,
      variables: JSON.stringify([
        'client_name', 'service_name', 'request_number', 'deliverables_list',
        'final_amount', 'payment_status'
      ]),
      trigger: 'status_change',
      trigger_conditions: JSON.stringify({
        to_status: 'completed'
      }),
      is_active: true
    },
    
    {
      name: 'Payment Reminder',
      code: 'payment_reminder',
      type: 'email',
      subject: 'Payment Reminder - {{request_number}}',
      content: `Dear {{client_name}},

This is a friendly reminder that payment for your {{service_name}} request ({{request_number}}) is pending.

Payment Details:
- Amount Due: ₹{{pending_amount}}
- Due Date: {{due_date}}
- Service: {{service_name}}

Please make the payment at your earliest convenience through our client portal or contact our accounts team at {{company_email}}.

For any payment-related queries, please call {{company_phone}}.

Thank you for your prompt attention.

Best regards,
MKW Advisors Team`,
      variables: JSON.stringify([
        'client_name', 'service_name', 'request_number', 'pending_amount',
        'due_date', 'company_email', 'company_phone'
      ]),
      trigger: 'custom',
      trigger_conditions: JSON.stringify({
        payment_status: 'pending',
        days_overdue: 7
      }),
      is_active: true
    },
    
    {
      name: 'Quality Review Required',
      code: 'quality_review_required',
      type: 'email',
      subject: 'Quality Review Required - {{request_number}}',
      content: `Dear {{reviewer_name}},

A quality review is required for the following service request:

- Request Number: {{request_number}}
- Service: {{service_name}}
- Client: {{client_name}}
- Assigned Executive: {{assigned_executive}}
- Completed Date: {{completion_date}}

Please review the deliverables and provide your feedback in the admin portal.

Thank you.

Best regards,
MKW Platform`,
      variables: JSON.stringify([
        'reviewer_name', 'request_number', 'service_name', 'client_name',
        'assigned_executive', 'completion_date'
      ]),
      trigger: 'status_change',
      trigger_conditions: JSON.stringify({
        to_status: 'quality_check'
      }),
      is_active: true
    },
    
    {
      name: 'Task Reminder',
      code: 'task_reminder',
      type: 'email',
      subject: 'Task Due Reminder - {{task_title}}',
      content: `Dear {{assignee_name}},

This is a reminder that the following task is due:

- Task: {{task_title}}
- Service Request: {{request_number}}
- Due Date: {{due_date}}
- Priority: {{priority}}

Please complete this task at your earliest convenience.

You can update the task status in the admin portal.

Thank you.

Best regards,
MKW Platform`,
      variables: JSON.stringify([
        'assignee_name', 'task_title', 'request_number', 'due_date', 'priority'
      ]),
      trigger: 'custom',
      trigger_conditions: JSON.stringify({
        task_status: 'pending',
        due_in_hours: 24
      }),
      is_active: true
    }
  ];
  
  await knex('notification_templates').insert(notificationTemplates);
  
  console.log(`✅ Seeded ${systemConfig.length} system configuration items`);
  console.log(`✅ Seeded ${notificationTemplates.length} notification templates`);
};