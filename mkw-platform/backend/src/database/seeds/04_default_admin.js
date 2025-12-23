/**
 * Seed Default Admin User
 * Creates the initial super admin user for system setup
 */

const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
  // Clear existing entries
  await knex('system_users').del();
  
  // Get super_admin role
  const superAdminRole = await knex('roles').where('name', 'super_admin').first();
  
  if (!superAdminRole) {
    throw new Error('Super admin role not found. Please run roles seed first.');
  }
  
  // Hash default password
  const defaultPassword = 'MKW@Admin2024';
  const passwordHash = await bcrypt.hash(defaultPassword, 12);
  
  // Create default admin users
  const adminUsers = [
    {
      username: 'admin',
      email: 'admin@mkwadvisors.com',
      password_hash: passwordHash,
      first_name: 'System',
      last_name: 'Administrator',
      phone: '+91-99999-99999',
      employee_id: 'MKW001',
      department: 'Administration',
      designation: 'System Administrator',
      role_id: superAdminRole.id,
      status: 'active',
      timezone: 'Asia/Kolkata',
      language: 'en',
      preferences: JSON.stringify({
        theme: 'light',
        notifications: {
          email: true,
          browser: true,
          mobile: false
        },
        dashboard: {
          default_view: 'overview',
          refresh_interval: 300
        }
      })
    }
  ];
  
  // Get other roles for additional users
  const adminRole = await knex('roles').where('name', 'admin').first();
  const opsManagerRole = await knex('roles').where('name', 'operations_manager').first();
  const qualityRole = await knex('roles').where('name', 'quality_reviewer').first();
  
  // Add additional default users if roles exist
  if (adminRole) {
    adminUsers.push({
      username: 'mkwadmin',
      email: 'operations@mkwadvisors.com',
      password_hash: await bcrypt.hash('MKW@Ops2024', 12),
      first_name: 'MKW',
      last_name: 'Operations',
      phone: '+91-88888-88888',
      employee_id: 'MKW002',
      department: 'Operations',
      designation: 'Operations Head',
      role_id: adminRole.id,
      status: 'active',
      timezone: 'Asia/Kolkata',
      language: 'en',
      preferences: JSON.stringify({
        theme: 'light',
        notifications: {
          email: true,
          browser: true,
          mobile: true
        }
      })
    });
  }
  
  if (opsManagerRole) {
    adminUsers.push({
      username: 'opsmanager',
      email: 'manager@mkwadvisors.com',
      password_hash: await bcrypt.hash('MKW@Mgr2024', 12),
      first_name: 'Operations',
      last_name: 'Manager',
      phone: '+91-77777-77777',
      employee_id: 'MKW003',
      department: 'Operations',
      designation: 'Operations Manager',
      role_id: opsManagerRole.id,
      status: 'active',
      timezone: 'Asia/Kolkata',
      language: 'en',
      preferences: JSON.stringify({
        theme: 'light',
        notifications: {
          email: true,
          browser: true,
          mobile: true
        }
      })
    });
  }
  
  if (qualityRole) {
    adminUsers.push({
      username: 'qcreviewer',
      email: 'quality@mkwadvisors.com',
      password_hash: await bcrypt.hash('MKW@QC2024', 12),
      first_name: 'Quality',
      last_name: 'Controller',
      phone: '+91-66666-66666',
      employee_id: 'MKW004',
      department: 'Quality Control',
      designation: 'Quality Reviewer',
      role_id: qualityRole.id,
      status: 'active',
      timezone: 'Asia/Kolkata',
      language: 'en',
      preferences: JSON.stringify({
        theme: 'light',
        notifications: {
          email: true,
          browser: false,
          mobile: true
        }
      })
    });
  }
  
  // Insert admin users
  await knex('system_users').insert(adminUsers);
  
  console.log(`✅ Seeded ${adminUsers.length} default admin users`);
  console.log('\n🔐 DEFAULT LOGIN CREDENTIALS:');
  console.log('Super Admin: admin@mkwadvisors.com / MKW@Admin2024');
  console.log('Operations: operations@mkwadvisors.com / MKW@Ops2024');
  console.log('Manager: manager@mkwadvisors.com / MKW@Mgr2024');
  console.log('Quality: quality@mkwadvisors.com / MKW@QC2024');
  console.log('\n⚠️  IMPORTANT: Change these passwords after first login!\n');
};