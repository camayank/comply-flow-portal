-- =======================================================================
-- Seed Data: Email and Notification Templates
-- File: 003-seed-templates.sql
-- Description: Email, SMS, and notification templates
-- Date: November 2025
-- =======================================================================

-- =======================================================================
-- EMAIL TEMPLATES
-- =======================================================================

INSERT INTO templates (name, type, subject, content, variables, is_active) VALUES
-- Welcome Email
('welcome_email', 'email', 'Welcome to Comply Flow Portal!',
'<h1>Welcome {{firstName}}!</h1>
<p>Thank you for registering with Comply Flow Portal. We''re excited to have you onboard.</p>
<p>Your account has been successfully created with email: <strong>{{email}}</strong></p>
<p>You can now:</p>
<ul>
  <li>Browse our comprehensive service catalog</li>
  <li>Book compliance services</li>
  <li>Track your service requests</li>
  <li>Access your compliance dashboard</li>
</ul>
<p>If you have any questions, our support team is here to help!</p>
<p>Best regards,<br>Comply Flow Team</p>',
'{"firstName": "string", "email": "string"}'::jsonb, true),

-- OTP Verification
('otp_verification', 'email', 'Your OTP for Comply Flow Portal',
'<h2>Verification Code</h2>
<p>Hello {{firstName}},</p>
<p>Your One-Time Password (OTP) for login verification is:</p>
<h1 style="color: #4F46E5; font-size: 36px; letter-spacing: 8px;">{{otp}}</h1>
<p>This OTP is valid for <strong>10 minutes</strong>.</p>
<p>If you didn''t request this OTP, please ignore this email or contact our support team.</p>
<p>Best regards,<br>Comply Flow Security Team</p>',
'{"firstName": "string", "otp": "string"}'::jsonb, true),

-- Service Booking Confirmation
('service_booking_confirmation', 'email', 'Service Booking Confirmed - {{serviceName}}',
'<h2>Service Booking Confirmation</h2>
<p>Dear {{clientName}},</p>
<p>Your service booking has been successfully confirmed!</p>
<h3>Booking Details:</h3>
<table style="width: 100%; border-collapse: collapse;">
  <tr><td><strong>Service:</strong></td><td>{{serviceName}}</td></tr>
  <tr><td><strong>Booking ID:</strong></td><td>{{bookingId}}</td></tr>
  <tr><td><strong>Amount:</strong></td><td>₹{{amount}}</td></tr>
  <tr><td><strong>Status:</strong></td><td>{{status}}</td></tr>
</table>
<p>Our team will start working on your request shortly. You''ll receive updates via email and in your dashboard.</p>
<p>Track your service: <a href="{{dashboardLink}}">View Dashboard</a></p>
<p>Best regards,<br>Comply Flow Operations Team</p>',
'{"clientName": "string", "serviceName": "string", "bookingId": "string", "amount": "number", "status": "string", "dashboardLink": "string"}'::jsonb, true),

-- Payment Success
('payment_success', 'email', 'Payment Received - ₹{{amount}}',
'<h2>Payment Confirmation</h2>
<p>Dear {{clientName}},</p>
<p>We have successfully received your payment.</p>
<h3>Payment Details:</h3>
<table style="width: 100%; border-collapse: collapse;">
  <tr><td><strong>Transaction ID:</strong></td><td>{{transactionId}}</td></tr>
  <tr><td><strong>Amount:</strong></td><td>₹{{amount}}</td></tr>
  <tr><td><strong>Payment Method:</strong></td><td>{{paymentMethod}}</td></tr>
  <tr><td><strong>Date:</strong></td><td>{{paymentDate}}</td></tr>
</table>
<p>Invoice has been generated and attached to this email.</p>
<p>Thank you for your payment!</p>
<p>Best regards,<br>Comply Flow Accounts Team</p>',
'{"clientName": "string", "transactionId": "string", "amount": "number", "paymentMethod": "string", "paymentDate": "string"}'::jsonb, true),

-- Document Request
('document_request', 'email', 'Documents Required - {{serviceName}}',
'<h2>Document Request</h2>
<p>Dear {{clientName}},</p>
<p>To proceed with your service request for <strong>{{serviceName}}</strong>, we need the following documents:</p>
{{documentList}}
<p>Please upload these documents through your dashboard:</p>
<p><a href="{{uploadLink}}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Upload Documents</a></p>
<p>If you have any questions about the required documents, please contact your assigned operations executive.</p>
<p>Best regards,<br>Comply Flow Operations Team</p>',
'{"clientName": "string", "serviceName": "string", "documentList": "string", "uploadLink": "string"}'::jsonb, true),

-- Task Assignment
('task_assignment', 'email', 'New Task Assigned - {{taskTitle}}',
'<h2>Task Assignment Notification</h2>
<p>Hello {{assigneeName}},</p>
<p>A new task has been assigned to you:</p>
<h3>Task Details:</h3>
<table style="width: 100%; border-collapse: collapse;">
  <tr><td><strong>Task:</strong></td><td>{{taskTitle}}</td></tr>
  <tr><td><strong>Client:</strong></td><td>{{clientName}}</td></tr>
  <tr><td><strong>Priority:</strong></td><td>{{priority}}</td></tr>
  <tr><td><strong>Due Date:</strong></td><td>{{dueDate}}</td></tr>
</table>
<p>{{taskDescription}}</p>
<p><a href="{{taskLink}}">View Task Details</a></p>
<p>Best regards,<br>Comply Flow System</p>',
'{"assigneeName": "string", "taskTitle": "string", "clientName": "string", "priority": "string", "dueDate": "string", "taskDescription": "string", "taskLink": "string"}'::jsonb, true),

-- Lead Assignment
('lead_assignment', 'email', 'New Lead Assigned - {{leadName}}',
'<h2>Lead Assignment</h2>
<p>Hello {{salesPersonName}},</p>
<p>A new lead has been assigned to you:</p>
<h3>Lead Details:</h3>
<table>
  <tr><td><strong>Company:</strong></td><td>{{companyName}}</td></tr>
  <tr><td><strong>Contact Person:</strong></td><td>{{contactPerson}}</td></tr>
  <tr><td><strong>Email:</strong></td><td>{{leadEmail}}</td></tr>
  <tr><td><strong>Phone:</strong></td><td>{{leadPhone}}</td></tr>
  <tr><td><strong>Source:</strong></td><td>{{leadSource}}</td></tr>
</table>
<p><a href="{{leadLink}}">View Lead in CRM</a></p>
<p>Best regards,<br>Comply Flow Sales Team</p>',
'{"salesPersonName": "string", "companyName": "string", "contactPerson": "string", "leadEmail": "string", "leadPhone": "string", "leadSource": "string", "leadLink": "string"}'::jsonb, true),

-- Deadline Reminder
('deadline_reminder', 'email', 'Compliance Deadline Reminder - {{complianceItem}}',
'<h2 style="color: #DC2626;">Compliance Deadline Reminder</h2>
<p>Dear {{clientName}},</p>
<p>This is a reminder that you have an upcoming compliance deadline:</p>
<table>
  <tr><td><strong>Compliance Item:</strong></td><td>{{complianceItem}}</td></tr>
  <tr><td><strong>Due Date:</strong></td><td>{{dueDate}}</td></tr>
  <tr><td><strong>Days Remaining:</strong></td><td>{{daysRemaining}}</td></tr>
  <tr><td><strong>Status:</strong></td><td>{{status}}</td></tr>
</table>
<p>Please ensure timely compliance to avoid penalties.</p>
<p>If you need assistance, book this service from your dashboard.</p>
<p>Best regards,<br>Comply Flow Compliance Team</p>',
'{"clientName": "string", "complianceItem": "string", "dueDate": "string", "daysRemaining": "number", "status": "string"}'::jsonb, true),

-- Password Reset
('password_reset', 'email', 'Password Reset Request',
'<h2>Password Reset</h2>
<p>Hello {{firstName}},</p>
<p>We received a request to reset your password for your Comply Flow account.</p>
<p>Click the button below to reset your password:</p>
<p><a href="{{resetLink}}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
<p>This link will expire in <strong>1 hour</strong>.</p>
<p>If you didn''t request a password reset, please ignore this email or contact our support team if you have concerns.</p>
<p>Best regards,<br>Comply Flow Security Team</p>',
'{"firstName": "string", "resetLink": "string"}'::jsonb, true),

-- Invoice Generated
('invoice_generated', 'email', 'Invoice #{{invoiceNumber}} - ₹{{amount}}',
'<h2>Invoice Generated</h2>
<p>Dear {{clientName}},</p>
<p>A new invoice has been generated for your account.</p>
<h3>Invoice Details:</h3>
<table>
  <tr><td><strong>Invoice Number:</strong></td><td>{{invoiceNumber}}</td></tr>
  <tr><td><strong>Date:</strong></td><td>{{invoiceDate}}</td></tr>
  <tr><td><strong>Amount:</strong></td><td>₹{{amount}}</td></tr>
  <tr><td><strong>Due Date:</strong></td><td>{{dueDate}}</td></tr>
  <tr><td><strong>Status:</strong></td><td>{{status}}</td></tr>
</table>
<p>Please find the invoice attached to this email.</p>
<p><a href="{{paymentLink}}">Make Payment</a></p>
<p>Best regards,<br>Comply Flow Accounts Team</p>',
'{"clientName": "string", "invoiceNumber": "string", "invoiceDate": "string", "amount": "number", "dueDate": "string", "status": "string", "paymentLink": "string"}'::jsonb, true)
ON CONFLICT DO NOTHING;

-- =======================================================================
-- SMS TEMPLATES
-- =======================================================================

INSERT INTO templates (name, type, subject, content, variables, is_active) VALUES
('otp_sms', 'sms', NULL,
'Your Comply Flow OTP is {{otp}}. Valid for 10 minutes. Do not share this code with anyone.',
'{"otp": "string"}'::jsonb, true),

('booking_confirmation_sms', 'sms', NULL,
'Dear {{clientName}}, your service booking for {{serviceName}} is confirmed. Booking ID: {{bookingId}}. Track at: {{shortLink}}',
'{"clientName": "string", "serviceName": "string", "bookingId": "string", "shortLink": "string"}'::jsonb, true),

('payment_success_sms', 'sms', NULL,
'Payment of Rs.{{amount}} received successfully. Transaction ID: {{transactionId}}. Thank you! - Comply Flow',
'{"amount": "number", "transactionId": "string"}'::jsonb, true),

('deadline_reminder_sms', 'sms', NULL,
'Reminder: Your {{complianceItem}} deadline is on {{dueDate}} ({{daysRemaining}} days left). Take action now. - Comply Flow',
'{"complianceItem": "string", "dueDate": "string", "daysRemaining": "number"}'::jsonb, true),

('document_request_sms', 'sms', NULL,
'Dear {{clientName}}, please upload required documents for {{serviceName}}. Visit: {{shortLink}} - Comply Flow',
'{"clientName": "string", "serviceName": "string", "shortLink": "string"}'::jsonb, true)
ON CONFLICT DO NOTHING;

-- =======================================================================
-- WHATSAPP TEMPLATES (Template names registered with WhatsApp Business API)
-- =======================================================================

INSERT INTO templates (name, type, subject, content, variables, is_active) VALUES
('welcome_whatsapp', 'whatsapp', NULL,
'Welcome to *Comply Flow Portal* {{firstName}}! 🎉

Your account is now active. Access your dashboard to:
✅ Browse 131+ compliance services
✅ Track service requests
✅ Upload documents
✅ Make payments

Need help? Reply to this message!',
'{"firstName": "string"}'::jsonb, true),

('booking_confirmation_whatsapp', 'whatsapp', NULL,
'✅ *Booking Confirmed*

Service: {{serviceName}}
Booking ID: {{bookingId}}
Amount: ₹{{amount}}
Status: {{status}}

We''ll keep you updated on the progress!',
'{"serviceName": "string", "bookingId": "string", "amount": "number", "status": "string"}'::jsonb, true),

('payment_success_whatsapp', 'whatsapp', NULL,
'💰 *Payment Received*

Amount: ₹{{amount}}
Transaction ID: {{transactionId}}
Date: {{paymentDate}}

Thank you for your payment! 🙏',
'{"amount": "number", "transactionId": "string", "paymentDate": "string"}'::jsonb, true)
ON CONFLICT DO NOTHING;

-- =======================================================================
-- SYSTEM SETTINGS
-- =======================================================================

INSERT INTO settings (key, value, category, description) VALUES
('smtp_host', 'smtp.gmail.com', 'email', 'SMTP server host'),
('smtp_port', '587', 'email', 'SMTP server port'),
('smtp_secure', 'false', 'email', 'Use TLS for SMTP'),
('email_from_name', 'Comply Flow Portal', 'email', 'Default sender name'),
('email_from_address', 'noreply@complyflow.com', 'email', 'Default sender email'),
('sms_provider', 'twilio', 'sms', 'SMS service provider'),
('sms_enabled', 'true', 'sms', 'Enable SMS notifications'),
('whatsapp_enabled', 'true', 'whatsapp', 'Enable WhatsApp notifications'),
('otp_expiry_minutes', '10', 'security', 'OTP validity in minutes'),
('session_expiry_hours', '24', 'security', 'Session validity in hours'),
('max_login_attempts', '5', 'security', 'Maximum failed login attempts'),
('jwt_access_expiry', '15m', 'security', 'JWT access token expiry'),
('jwt_refresh_expiry', '7d', 'security', 'JWT refresh token expiry'),
('file_upload_max_size', '10485760', 'uploads', 'Max file size in bytes (10MB)'),
('allowed_file_types', 'pdf,jpg,jpeg,png,doc,docx,xls,xlsx', 'uploads', 'Allowed file extensions'),
('razorpay_enabled', 'true', 'payment', 'Enable Razorpay payments'),
('default_currency', 'INR', 'payment', 'Default currency code'),
('tax_rate_gst', '18', 'payment', 'Default GST rate percentage'),
('commission_rate_agent', '10', 'agent', 'Default agent commission percentage'),
('notification_email_enabled', 'true', 'notification', 'Enable email notifications'),
('notification_sms_enabled', 'true', 'notification', 'Enable SMS notifications'),
('notification_whatsapp_enabled', 'true', 'notification', 'Enable WhatsApp notifications'),
('notification_in_app_enabled', 'true', 'notification', 'Enable in-app notifications')
ON CONFLICT (key) DO NOTHING;

-- =======================================================================
-- SEED COMPLETE
-- =======================================================================
