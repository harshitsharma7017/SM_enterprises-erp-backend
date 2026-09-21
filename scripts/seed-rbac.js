import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  const seedFilePath = path.join(__dirname, '../src/config/rbac-seed.json');
  
  if (!fs.existsSync(seedFilePath)) {
    console.error('❌ Validation Failed: Seed file not found at', seedFilePath);
    process.exit(1);
  }

  const seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf-8'));

  // 1. Validation
  const roles = seedData.roles || [];
  const permissions = seedData.permissions || [];
  const mappings = seedData.mappings || {};
  
  if (!Array.isArray(roles) || !Array.isArray(permissions)) {
    console.error('❌ Validation Failed: roles and permissions must be arrays.');
    process.exit(1);
  }

  // Validate non-empty strings
  const isValidString = (s) => typeof s === 'string' && s.trim().length > 0;
  if (!roles.every(isValidString) || !permissions.every(isValidString)) {
    console.error('❌ Validation Failed: Role and permission names must be non-empty strings.');
    process.exit(1);
  }

  // Validate uniqueness
  const uniqueRoles = new Set(roles);
  const uniquePerms = new Set(permissions);
  if (uniqueRoles.size !== roles.length) {
    console.error('❌ Validation Failed: Duplicate role names found in source.');
    process.exit(1);
  }
  if (uniquePerms.size !== permissions.length) {
    console.error('❌ Validation Failed: Duplicate permission names found in source.');
    process.exit(1);
  }

  // Validate mappings
  for (const [roleName, perms] of Object.entries(mappings)) {
    if (!uniqueRoles.has(roleName)) {
      console.error(`❌ Validation Failed: Mapping references unknown role '${roleName}'.`);
      process.exit(1);
    }
    const uniqueMappingPerms = new Set(perms);
    if (uniqueMappingPerms.size !== perms.length) {
      console.error(`❌ Validation Failed: Duplicate permissions found in mapping for role '${roleName}'.`);
      process.exit(1);
    }
    for (const perm of perms) {
      if (!uniquePerms.has(perm)) {
        console.error(`❌ Validation Failed: Mapping for role '${roleName}' references unknown permission '${perm}'.`);
        process.exit(1);
      }
    }
  }

  console.log('✅ Source data validated successfully.');

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const roleIdMap = {};
    const permIdMap = {};
    let rolesProcessed = 0;
    let permsProcessed = 0;
    let rpProcessed = 0;

    // 2. Seed Roles
    for (const role of roles) {
      const [rows] = await connection.query('SELECT id FROM roles WHERE name = ?', [role]);
      if (rows.length > 0) {
        roleIdMap[role] = rows[0].id;
      } else {
        const [result] = await connection.query('INSERT INTO roles (name) VALUES (?)', [role]);
        roleIdMap[role] = result.insertId;
        rolesProcessed++;
      }
    }

    // 3. Seed Permissions
    for (const perm of permissions) {
      const [rows] = await connection.query('SELECT id FROM permissions WHERE name = ?', [perm]);
      if (rows.length > 0) {
        permIdMap[perm] = rows[0].id;
      } else {
        const [result] = await connection.query('INSERT INTO permissions (name) VALUES (?)', [perm]);
        permIdMap[perm] = result.insertId;
        permsProcessed++;
      }
    }

    // 4. Seed Role Permissions
    for (const [roleName, perms] of Object.entries(mappings)) {
      const roleId = roleIdMap[roleName];
      for (const permName of perms) {
        const permId = permIdMap[permName];
        
        const [rows] = await connection.query(
          'SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?', 
          [roleId, permId]
        );
        
        if (rows.length === 0) {
          await connection.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', 
            [roleId, permId]
          );
          rpProcessed++;
        }
      }
    }

    // 5. Seed user_roles (if explicit in source)
    let userRolesProcessed = 0;
    if (seedData.user_roles && Array.isArray(seedData.user_roles)) {
      for (const ur of seedData.user_roles) {
        const [rows] = await connection.query(
          'SELECT 1 FROM user_roles WHERE user_id = ? AND role_id = ?',
          [ur.user_id, roleIdMap[ur.role]]
        );
        if (rows.length === 0) {
          await connection.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
            [ur.user_id, roleIdMap[ur.role]]
          );
          userRolesProcessed++;
        }
      }
    }

    await connection.commit();
    console.log('✅ Transaction committed successfully.');
    console.log(`- Roles inserted: ${rolesProcessed}`);
    console.log(`- Permissions inserted: ${permsProcessed}`);
    console.log(`- Role-Permission mappings inserted: ${rpProcessed}`);
    console.log(`- User-Role mappings inserted: ${userRolesProcessed}`);

  } catch (error) {
    if (connection) {
      await connection.rollback();
      console.error('❌ Transaction rolled back due to error.');
    }
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    if (connection) {
      connection.release();
    }
    // Exit gracefully to close pool
    process.exit(0);
  }
}

runSeed();
