-- Seed demo client data for development

-- Insert demo client
INSERT INTO clients (
  user_id, 
  business_name, 
  business_type, 
  gstin, 
  pan, 
  email, 
  phone, 
  address, 
  city, 
  state, 
  pincode,
  industry,
  incorporation_date,
  status
) VALUES (
  'dev-user-123',
  'TechStart Solutions Pvt Ltd',
  'pvt_ltd',
  '29AABCT1234E1Z5',
  'AABCT1234E',
  'contact@techstart.com',
  '+91 9876543210',
  '123, MG Road, Koramangala',
  'Bangalore',
  'Karnataka',
  '560034',
  'IT Services',
  '2023-06-15',
  'active'
) ON CONFLICT (user_id) DO NOTHING;

-- Insert compliance state
INSERT INTO client_compliance_state (
  client_id,
  overall_state,
  days_until_critical,
  next_critical_deadline,
  total_penalty_exposure,
  compliant_items,
  pending_items,
  overdue_items,
  calculation_metadata
)
SELECT 
  id,
  'AMBER',
  12,
  '2026-02-05',
  5000.00,
  15,
  2,
  0,
  '{"last_calculation": "2026-01-22T00:00:00Z", "items_checked": 17}'::jsonb
FROM clients WHERE user_id = 'dev-user-123'
ON CONFLICT (client_id) DO UPDATE SET
  overall_state = EXCLUDED.overall_state,
  days_until_critical = EXCLUDED.days_until_critical,
  next_critical_deadline = EXCLUDED.next_critical_deadline,
  total_penalty_exposure = EXCLUDED.total_penalty_exposure,
  compliant_items = EXCLUDED.compliant_items,
  pending_items = EXCLUDED.pending_items,
  overdue_items = EXCLUDED.overdue_items,
  updated_at = CURRENT_TIMESTAMP;

-- Insert compliance actions
INSERT INTO compliance_actions (
  client_id,
  action_type,
  title,
  description,
  document_type,
  due_date,
  priority,
  status,
  penalty_amount,
  estimated_time_minutes,
  benefits,
  instructions
)
SELECT 
  id,
  'upload',
  'Upload January 2026 GST documents',
  'Upload GST return documents for January 2026 filing period',
  'GST Return Documents',
  '2026-02-05',
  'high',
  'pending',
  5000.00,
  5,
  ARRAY[
    'Complete your GST filing before deadline',
    'Avoid ₹5,000 late filing penalty',
    'Maintain good compliance record',
    'Enable ITC claims for next month'
  ],
  ARRAY[
    'Gather all sales invoices for January 2026',
    'Prepare purchase invoices and input credit documents',
    'Ensure all documents are in PDF format (max 10MB each)',
    'Click the upload button below to attach files',
    'Review and submit for processing'
  ]
FROM clients WHERE user_id = 'dev-user-123';

INSERT INTO compliance_actions (
  client_id,
  action_type,
  title,
  description,
  document_type,
  due_date,
  priority,
  status,
  penalty_amount,
  estimated_time_minutes
)
SELECT 
  id,
  'pay',
  'Pay TDS for Q3 FY 2025-26',
  'Submit TDS payment for third quarter',
  'TDS Payment Receipt',
  '2026-02-15',
  'medium',
  'pending',
  2000.00,
  10
FROM clients WHERE user_id = 'dev-user-123';

-- Insert activity log
INSERT INTO client_activities (
  client_id,
  activity_type,
  description,
  actor_id,
  actor_type,
  entity_type,
  metadata
)
SELECT 
  id,
  'document_uploaded',
  'December 2025 GST returns filed successfully',
  'dev-user-123',
  'user',
  'document',
  '{"document_type": "GST Return", "month": "December 2025"}'::jsonb
FROM clients WHERE user_id = 'dev-user-123';

INSERT INTO client_activities (
  client_id,
  activity_type,
  description,
  actor_id,
  actor_type,
  entity_type,
  metadata,
  created_at
)
SELECT 
  id,
  'payment_completed',
  'GST payment of ₹45,000 completed',
  'dev-user-123',
  'user',
  'payment',
  '{"amount": 45000, "payment_method": "bank_transfer"}'::jsonb,
  CURRENT_TIMESTAMP - INTERVAL '6 days'
FROM clients WHERE user_id = 'dev-user-123';

INSERT INTO client_activities (
  client_id,
  activity_type,
  description,
  actor_id,
  actor_type,
  entity_type,
  created_at
)
SELECT 
  id,
  'document_approved',
  'TDS return for Q3 FY 2025-26 approved',
  'system',
  'system',
  'document',
  CURRENT_TIMESTAMP - INTERVAL '10 days'
FROM clients WHERE user_id = 'dev-user-123';

INSERT INTO client_activities (
  client_id,
  activity_type,
  description,
  actor_id,
  actor_type,
  created_at
)
SELECT 
  id,
  'filing_initiated',
  'Professional tax filing initiated',
  'dev-user-123',
  'user',
  CURRENT_TIMESTAMP - INTERVAL '14 days'
FROM clients WHERE user_id = 'dev-user-123';

INSERT INTO client_activities (
  client_id,
  activity_type,
  description,
  actor_id,
  actor_type,
  entity_type,
  created_at
)
SELECT 
  id,
  'document_uploaded',
  'Bank statement for December uploaded',
  'dev-user-123',
  'user',
  'document',
  CURRENT_TIMESTAMP - INTERVAL '15 days'
FROM clients WHERE user_id = 'dev-user-123';
