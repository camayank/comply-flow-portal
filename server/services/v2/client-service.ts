/**
 * Client Service
 * Following Stripe/Vanta patterns for customer management:
 * - Centralized client data access
 * - Validation and business rules
 * - Audit logging
 */

import { pool } from '../../db';

export interface Client {
  id: number;
  userId: string;
  businessName: string;
  businessType: string;
  gstin?: string;
  pan?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  industry?: string;
  incorporationDate?: Date;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get client by user ID
 * Primary method for fetching client data after authentication
 * Uses business_entities table which is the primary entity store
 */
export async function getClientByUserId(userId: string): Promise<Client | null> {
  const result = await pool.query(
    `SELECT
      be.id, be.owner_id as user_id, be.name as business_name,
      be.entity_type as business_type, be.gstin, be.pan,
      u.email, u.phone, be.address, be.city, be.state,
      be.industry_type as industry, be.registration_date as incorporation_date,
      be.client_status as status, be.is_active,
      be.created_at, be.updated_at
    FROM business_entities be
    JOIN users u ON be.owner_id = u.id
    WHERE be.owner_id = $1 AND be.is_active = true`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    userId: String(row.user_id),
    businessName: row.business_name,
    businessType: row.business_type,
    gstin: row.gstin,
    pan: row.pan,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: null,
    industry: row.industry,
    incorporationDate: row.incorporation_date,
    status: row.status || 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Get client by ID
 */
export async function getClientById(id: number): Promise<Client | null> {
  const result = await pool.query(
    `SELECT 
      id, user_id, business_name, business_type, gstin, pan,
      email, phone, address, city, state, pincode, industry,
      incorporation_date, status, created_at, updated_at
    FROM clients
    WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    businessName: row.business_name,
    businessType: row.business_type,
    gstin: row.gstin,
    pan: row.pan,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    industry: row.industry,
    incorporationDate: row.incorporation_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Create new client
 * Validates GSTIN and PAN format before insertion
 */
export async function createClient(clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  // Validate GSTIN format (15 characters)
  if (clientData.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(clientData.gstin)) {
    throw new Error('Invalid GSTIN format');
  }

  // Validate PAN format (10 characters)
  if (clientData.pan && !/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(clientData.pan)) {
    throw new Error('Invalid PAN format');
  }

  const result = await pool.query(
    `INSERT INTO clients 
     (user_id, business_name, business_type, gstin, pan, email, phone, address, 
      city, state, pincode, industry, incorporation_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING id`,
    [
      clientData.userId,
      clientData.businessName,
      clientData.businessType,
      clientData.gstin,
      clientData.pan,
      clientData.email,
      clientData.phone,
      clientData.address,
      clientData.city,
      clientData.state,
      clientData.pincode,
      clientData.industry,
      clientData.incorporationDate,
      clientData.status || 'active'
    ]
  );

  return result.rows[0].id;
}

/**
 * Update client information
 */
export async function updateClient(id: number, updates: Partial<Client>): Promise<void> {
  const allowedFields = [
    'business_name', 'business_type', 'email', 'phone', 
    'address', 'city', 'state', 'pincode', 'industry', 'status'
  ];

  const setClause: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  Object.entries(updates).forEach(([key, value]) => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (allowedFields.includes(snakeKey)) {
      setClause.push(`${snakeKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  });

  if (setClause.length === 0) {
    return;
  }

  values.push(id);
  await pool.query(
    `UPDATE clients 
     SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramIndex}`,
    values
  );
}

/**
 * Get all clients (admin function)
 */
export async function getAllClients(filters?: {
  status?: string;
  businessType?: string;
  limit?: number;
  offset?: number;
}): Promise<Client[]> {
  let query = `
    SELECT 
      id, user_id, business_name, business_type, gstin, pan,
      email, phone, address, city, state, pincode, industry,
      incorporation_date, status, created_at, updated_at
    FROM clients
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.status) {
    query += ` AND status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters?.businessType) {
    query += ` AND business_type = $${paramIndex}`;
    params.push(filters.businessType);
    paramIndex++;
  }

  query += ' ORDER BY created_at DESC';

  if (filters?.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  if (filters?.offset) {
    query += ` OFFSET $${paramIndex}`;
    params.push(filters.offset);
  }

  const result = await pool.query(query, params);

  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    businessName: row.business_name,
    businessType: row.business_type,
    gstin: row.gstin,
    pan: row.pan,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    industry: row.industry,
    incorporationDate: row.incorporation_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}
