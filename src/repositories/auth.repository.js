import { pool } from '../config/database.js';

export const authRepository = {
  findUserByEmail: async (email) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  },

  findUserById: async (id) => {
    const [rows] = await pool.query('SELECT id, name, email, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  // Used by GET /auth/me — the frontend's useAuth() hook derives all client-side
  // permission gating (sidebar, buttons) from `user.roles[].permissions[]`, which
  // this project's RBAC tables support (roles / permissions / role_permissions /
  // user_roles) but nothing previously queried for this endpoint.
  findUserWithRolesAndPermissions: async (id) => {
    const [rows] = await pool.query(
      'SELECT id, name, email, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    const user = rows[0];
    if (!user) return null;

    const [roles] = await pool.query(
      `SELECT r.id, r.name FROM roles r
       INNER JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [id]
    );

    for (const role of roles) {
      const [permissions] = await pool.query(
        `SELECT p.id, p.name FROM permissions p
         INNER JOIN role_permissions rp ON rp.permission_id = p.id
         WHERE rp.role_id = ?`,
        [role.id]
      );
      role.permissions = permissions;
    }

    user.roles = roles;
    return user;
  }
};
