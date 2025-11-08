/**
 * Seed file for email and notification templates
 * Creates templates for automated communications
 */

exports.seed = async function(knex) {
  // Clear existing templates
  await knex('templates').del();

  const templates = [
    // Email Templates
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Welcome Email',
      type: 'email',
      subject: 'Welcome to Comply Flow Portal',
      content: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Welcome to Comply Flow Portal!</h2>
    <p>Dear {{first_name}},</p>
    <p>Thank you for registering with Comply Flow Portal. Your account has been successfully created.</p>
    <p>Your login credentials:</p>
    <ul>
      <li>Email: {{email}}</li>
      <li>Temporary Password: {{temp_password}}</li>
    </ul>
    <p>Please login and change your password for security.</p>
    <a href="{{login_url}}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Login Now</a>
    <p style="margin-top: 20px;">Best regards,<br>Comply Flow Team</p>
  </div>
</body>
</html>`,
      variables: JSON.stringify(['first_name', 'email', 'temp_password', 'login_url']),
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'OTP Verification',
      type: 'email',
      subject: 'Your OTP for Comply Flow Portal',
      content: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Email Verification</h2>
    <p>Dear {{first_name}},</p>
    <p>Your OTP for email verification is:</p>
    <h1 style="background: #f3f4f6; padding: 20px; text-align: center; letter-spacing: 5px; color: #2563eb;">{{otp}}</h1>
    <p>This OTP is valid for 10 minutes.</p>
    <p>If you didn't request this, please ignore this email.</p>
    <p>Best regards,<br>Comply Flow Team</p>
  </div>
</body>
</html>`,
      variables: JSON.stringify(['first_name', 'otp']),
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Password Reset',
      type: 'email',
      subject: 'Reset Your Password',
      content: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Password Reset Request</h2>
    <p>Dear {{first_name}},</p>
    <p>We received a request to reset your password. Click the button below to reset it:</p>
    <a href="{{reset_url}}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
    <p style="margin-top: 20px;">This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email or contact support.</p>
    <p>Best regards,<br>Comply Flow Team</p>
  </div>
</body>
</html>`,
      variables: JSON.stringify(['first_name', 'reset_url']),
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Service Booking Confirmation',
      type: 'email',
      subject: 'Service Booking Confirmation - {{service_name}}',
      content: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Service Booking Confirmed</h2>
    <p>Dear {{client_name}},</p>
    <p>Thank you for booking our service. Your booking details:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Service</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">{{service_name}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Booking ID</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">{{booking_id}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">₹{{amount}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Status</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">{{status}}</td>
      </tr>
    </table>
    <p>Our team will contact you shortly with the required documents list.</p>
    <p>Best regards,<br>Comply Flow Team</p>
  </div>
</body>
</html>`,
      variables: JSON.stringify(['client_name', 'service_name', 'booking_id', 'amount', 'status']),
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Task Assignment',
      type: 'email',
      subject: 'New Task Assigned - {{task_title}}',
      content: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">New Task Assigned</h2>
    <p>Dear {{assignee_name}},</p>
    <p>A new task has been assigned to you:</p>
    <div style="background: #f3f4f6; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0;">
      <h3 style="margin-top: 0;">{{task_title}}</h3>
      <p>{{task_description}}</p>
      <p><strong>Priority:</strong> {{priority}}</p>
      <p><strong>Due Date:</strong> {{due_date}}</p>
      <p><strong>Client:</strong> {{client_name}}</p>
    </div>
    <a href="{{task_url}}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">View Task</a>
    <p style="margin-top: 20px;">Best regards,<br>Comply Flow Team</p>
  </div>
</body>
</html>`,
      variables: JSON.stringify(['assignee_name', 'task_title', 'task_description', 'priority', 'due_date', 'client_name', 'task_url']),
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Invoice Generated',
      type: 'email',
      subject: 'Invoice {{invoice_number}} - Amount ₹{{total_amount}}',
      content: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Invoice Generated</h2>
    <p>Dear {{client_name}},</p>
    <p>A new invoice has been generated for your account.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Invoice Number</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">{{invoice_number}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">₹{{total_amount}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Issue Date</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">{{issue_date}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Due Date</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">{{due_date}}</td>
      </tr>
    </table>
    <a href="{{payment_url}}" style="display: inline-block; padding: 10px 20px; background: #16a34a; color: white; text-decoration: none; border-radius: 5px;">Pay Now</a>
    <p style="margin-top: 20px;">Best regards,<br>Comply Flow Team</p>
  </div>
</body>
</html>`,
      variables: JSON.stringify(['client_name', 'invoice_number', 'total_amount', 'issue_date', 'due_date', 'payment_url']),
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Payment Confirmation',
      type: 'email',
      subject: 'Payment Received - ₹{{amount}}',
      content: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #16a34a;">Payment Received Successfully</h2>
    <p>Dear {{client_name}},</p>
    <p>We have received your payment. Thank you!</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Transaction ID</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">{{transaction_id}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">₹{{amount}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Payment Method</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">{{payment_method}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">{{payment_date}}</td>
      </tr>
    </table>
    <p>A receipt has been sent to your email.</p>
    <p>Best regards,<br>Comply Flow Team</p>
  </div>
</body>
</html>`,
      variables: JSON.stringify(['client_name', 'transaction_id', 'amount', 'payment_method', 'payment_date']),
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Document Upload Request',
      type: 'email',
      subject: 'Document Required - {{service_name}}',
      content: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Documents Required</h2>
    <p>Dear {{client_name}},</p>
    <p>We need the following documents to process your service: <strong>{{service_name}}</strong></p>
    <div style="background: #f3f4f6; padding: 15px; margin: 20px 0;">
      {{document_list}}
    </div>
    <p>Please upload the documents through your client portal.</p>
    <a href="{{upload_url}}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Upload Documents</a>
    <p style="margin-top: 20px;">Best regards,<br>Comply Flow Team</p>
  </div>
</body>
</html>`,
      variables: JSON.stringify(['client_name', 'service_name', 'document_list', 'upload_url']),
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Service Completion',
      type: 'email',
      subject: 'Service Completed - {{service_name}}',
      content: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #16a34a;">Service Completed Successfully</h2>
    <p>Dear {{client_name}},</p>
    <p>We are pleased to inform you that your service <strong>{{service_name}}</strong> has been completed successfully.</p>
    <p>All deliverables are now available in your client portal.</p>
    <a href="{{portal_url}}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">View Deliverables</a>
    <p style="margin-top: 20px;">Thank you for choosing Comply Flow Portal!</p>
    <p>Best regards,<br>Comply Flow Team</p>
  </div>
</body>
</html>`,
      variables: JSON.stringify(['client_name', 'service_name', 'portal_url']),
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Deadline Reminder',
      type: 'email',
      subject: 'Reminder: {{compliance_name}} Due on {{due_date}}',
      content: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #dc2626;">Compliance Deadline Reminder</h2>
    <p>Dear {{client_name}},</p>
    <p>This is a reminder that your compliance deadline is approaching:</p>
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #dc2626;">{{compliance_name}}</h3>
      <p><strong>Due Date:</strong> {{due_date}}</p>
      <p><strong>Days Remaining:</strong> {{days_remaining}}</p>
    </div>
    <p>Please ensure timely compliance to avoid penalties.</p>
    <a href="{{compliance_url}}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">View Details</a>
    <p style="margin-top: 20px;">Best regards,<br>Comply Flow Team</p>
  </div>
</body>
</html>`,
      variables: JSON.stringify(['client_name', 'compliance_name', 'due_date', 'days_remaining', 'compliance_url']),
      is_active: true
    },

    // SMS Templates
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'OTP SMS',
      type: 'sms',
      subject: null,
      content: 'Your OTP for Comply Flow Portal is {{otp}}. Valid for 10 minutes. Do not share with anyone.',
      variables: JSON.stringify(['otp']),
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Payment Reminder SMS',
      type: 'sms',
      subject: null,
      content: 'Dear {{client_name}}, your invoice {{invoice_number}} of Rs.{{amount}} is due on {{due_date}}. Pay now: {{payment_link}}',
      variables: JSON.stringify(['client_name', 'invoice_number', 'amount', 'due_date', 'payment_link']),
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Service Update SMS',
      type: 'sms',
      subject: null,
      content: 'Hi {{client_name}}, your service {{service_name}} status: {{status}}. Login to view details: {{portal_url}}',
      variables: JSON.stringify(['client_name', 'service_name', 'status', 'portal_url']),
      is_active: true
    },

    // WhatsApp Templates
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Welcome WhatsApp',
      type: 'whatsapp',
      subject: null,
      content: `Welcome to Comply Flow Portal! 🎉

Hi {{client_name}},

Thank you for choosing us. Your account is now active.

Login: {{login_url}}

Need help? Reply to this message.`,
      variables: JSON.stringify(['client_name', 'login_url']),
      is_active: true
    },
    {
      id: knex.raw('uuid_generate_v4()'),
      name: 'Document Request WhatsApp',
      type: 'whatsapp',
      subject: null,
      content: `📄 Documents Required

Hi {{client_name}},

We need documents for: {{service_name}}

Upload here: {{upload_url}}

Questions? Reply to chat with our team.`,
      variables: JSON.stringify(['client_name', 'service_name', 'upload_url']),
      is_active: true
    }
  ];

  await knex('templates').insert(templates);

  console.log(`✓ Templates seed completed: ${templates.length} templates created`);
};
