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
      COALESCE(be.contact_email, u.email) as email,
      COALESCE(be.contact_phone, u.phone) as phone,
      be.address, be.city, be.state, be.pincode,
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
    pincode: row.pincode,
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
      be.id, be.owner_id as user_id, be.name as business_name,
      be.entity_type as business_type, be.gstin, be.pan,
      COALESCE(be.contact_email, u.email) as email,
      COALESCE(be.contact_phone, u.phone) as phone,
      be.address, be.city, be.state, be.pincode,
      be.industry_type as industry, be.registration_date as incorporation_date,
      be.client_status as status, be.created_at, be.updated_at
    FROM business_entities be
    LEFT JOIN users u ON be.owner_id = u.id
    WHERE be.id = $1`,
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

  const ownerId = Number(clientData.userId);
  if (!Number.isFinite(ownerId)) {
    throw new Error('Invalid owner user ID');
  }

  const lastResult = await pool.query(
    'SELECT client_id FROM business_entities ORDER BY id DESC LIMIT 1'
  );
  const lastClientId = lastResult.rows[0]?.client_id as string | undefined;
  const lastNumber = lastClientId ? parseInt(lastClientId.replace(/\D+/g, ''), 10) : 0;
  const nextClientId = `C${String((Number.isFinite(lastNumber) ? lastNumber : 0) + 1).padStart(4, '0')}`;

  const result = await pool.query(
    `INSERT INTO business_entities
     (owner_id, client_id, name, entity_type, gstin, pan, contact_email, contact_phone, address,
      city, state, pincode, industry_type, registration_date, client_status, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING id`,
    [
      ownerId,
      nextClientId,
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
      clientData.status || 'active',
      clientData.status ? clientData.status === 'active' : true,
    ]
  );

  return result.rows[0].id;
}

/**
 * Update client information
 */
export async function updateClient(id: number, updates: Partial<Client>): Promise<void> {
  const fieldMap: Record<string, string> = {
    businessName: 'name',
    businessType: 'entity_type',
    email: 'contact_email',
    phone: 'contact_phone',
    address: 'address',
    city: 'city',
    state: 'state',
    pincode: 'pincode',
    industry: 'industry_type',
    status: 'client_status',
  };

  const setClause: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  Object.entries(updates).forEach(([key, value]) => {
    const mappedKey = fieldMap[key];
    if (mappedKey) {
      setClause.push(`${mappedKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  });

  if (setClause.length === 0) {
    return;
  }

  values.push(id);
  await pool.query(
    `UPDATE business_entities
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
      be.id, be.owner_id as user_id, be.name as business_name,
      be.entity_type as business_type, be.gstin, be.pan,
      COALESCE(be.contact_email, u.email) as email,
      COALESCE(be.contact_phone, u.phone) as phone,
      be.address, be.city, be.state, be.pincode,
      be.industry_type as industry, be.registration_date as incorporation_date,
      be.client_status as status, be.created_at, be.updated_at
    FROM business_entities be
    LEFT JOIN users u ON be.owner_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.status) {
    query += ` AND be.client_status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters?.businessType) {
    query += ` AND be.entity_type = $${paramIndex}`;
    params.push(filters.businessType);
    paramIndex++;
  }

  query += ' ORDER BY be.created_at DESC';

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
