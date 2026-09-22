import { pool } from '../../config/database.js';
import Joi from 'joi';

const validator = Joi.object({
  name: Joi.string().max(255).required()
});

// Original ERP: config('permissions.roles') keys — every role seeded ahead
// of time (rbac-seed.json's `roles` list). Route middleware and Gate checks
// refer to these by name, so they can't be renamed or deleted through the
// UI; only a role created afterward through this screen can be.
const SYSTEM_ROLES = [
  'Super Admin',
  'Admin',
  'Merchandising & Manufacturing',
  'Accounts',
  'Export Documentation & Foreign Payment',
  'Packing',
  'Quality Checker',
  'Jobworker'
];

export const roleController = {
  index: async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM roles ORDER BY id ASC');
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  },

  show: async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM roles WHERE id = ?', [req.params.role]);
      if (rows.length === 0) return res.status(404).json({ error: 'Role not found' });

      const role = rows[0];
      const [permissions] = await pool.query(`
        SELECT p.id, p.name, p.group_name
        FROM permissions p
        INNER JOIN role_permissions rp ON rp.permission_id = p.id
        WHERE rp.role_id = ?
      `, [role.id]);

      role.permissions = permissions;
      res.json({ data: role });
    } catch (error) {
      next(error);
    }
  },

  store: async (req, res, next) => {
    try {
      const { error, value } = validator.validate(req.body);
      if (error) return res.status(422).json({ error: error.message });

      const [resDb] = await pool.query('INSERT INTO roles (name, created_at, updated_at) VALUES (?, NOW(), NOW())', [value.name]);
      res.status(201).json({ message: 'Role created', data: { id: resDb.insertId } });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const { error, value } = validator.validate(req.body);
      if (error) return res.status(422).json({ error: error.message });

      const [rows] = await pool.query('SELECT id, name FROM roles WHERE id = ?', [req.params.role]);
      if (rows.length === 0) return res.status(404).json({ error: 'Role not found' });

      // Original ERP: UpdateRoleRequest::withValidator() — a system role's
      // name is fixed because route middleware/Gate checks reference it.
      if (SYSTEM_ROLES.includes(rows[0].name) && value.name !== rows[0].name) {
        return res.status(422).json({ error: `"${rows[0].name}" is a system role and cannot be renamed.` });
      }

      await pool.query('UPDATE roles SET name = ?, updated_at = NOW() WHERE id = ?', [value.name, req.params.role]);
      res.json({ message: 'Role updated' });
    } catch (error) {
      next(error);
    }
  },

  destroy: async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT name FROM roles WHERE id = ?', [req.params.role]);
      if (rows.length === 0) return res.status(404).json({ error: 'Role not found' });

      // Original ERP: RoleService::canDelete() — system-role check first,
      // then the assigned-user check.
      if (SYSTEM_ROLES.includes(rows[0].name)) {
        return res.status(422).json({ error: `"${rows[0].name}" is a system role and cannot be deleted.` });
      }

      const [users] = await pool.query('SELECT user_id FROM user_roles WHERE role_id = ? LIMIT 1', [req.params.role]);
      if (users.length > 0) {
        return res.status(422).json({ error: 'Role is currently assigned to users and cannot be deleted' });
      }
      await pool.query('DELETE FROM roles WHERE id = ?', [req.params.role]);
      res.json({ message: 'Role deleted' });
    } catch (error) {
      next(error);
    }
  },

  permissions: async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM permissions ORDER BY group_name, name');
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  },

  syncPermissions: async (req, res, next) => {
    let connection;
    try {
      const { role_id, permission_ids } = req.body;
      if (!role_id || !Array.isArray(permission_ids)) {
        return res.status(422).json({ error: 'role_id and permission_ids (array) are required' });
      }

      const [rows] = await pool.query('SELECT name FROM roles WHERE id = ?', [role_id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Role not found' });

      // Original ERP: RoleService::update() — Super Admin's permissions come
      // from the Gate::before bypass, not the pivot table, so editing them
      // here would be misleading.
      if (rows[0].name === 'Super Admin') {
        return res.status(422).json({ error: 'Super Admin permissions are fixed and cannot be edited.' });
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();

      await connection.query('DELETE FROM role_permissions WHERE role_id = ?', [role_id]);
      for (const pId of permission_ids) {
        await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [role_id, pId]);
      }

      await connection.commit();
      res.json({ message: 'Permissions synced successfully' });
    } catch (error) {
      if (connection) await connection.rollback();
      next(error);
    } finally {
      if (connection) connection.release();
    }
  }
};
