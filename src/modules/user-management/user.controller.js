import { userRepository } from './user.repository.js';
import { pool } from '../../config/database.js';
import { config } from '../../config/env.js';
import Joi from 'joi';

// Original ERP: StoreUserRequest/UpdateUserRequest — 'phone' is a plain
// optional field validated against the same digits/+/-/space/() pattern;
// 'password' is Password::min(8)->letters()->numbers() with confirmation;
// 'roles' is required with at least one entry. There is no 'username' field
// anywhere in the original app or the users table — it was a copy-paste
// artifact from a generic scaffold and is removed here, not replaced.
const phoneValidator = Joi.string().max(20).pattern(/^[0-9+\-\s()]+$/).messages({
  'string.pattern.base': 'Phone number may contain digits, spaces and + - ( ) only.'
});
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).+$/;

const createValidator = Joi.object({
  name: Joi.string().max(255).required(),
  email: Joi.string().email().max(255).required(),
  phone: phoneValidator.allow(null, ''),
  password: Joi.string().min(8).pattern(passwordPattern).required().messages({
    'string.pattern.base': 'Password must contain letters and numbers.',
    'string.min': 'Password must be at least 8 characters.'
  }),
  password_confirmation: Joi.any().valid(Joi.ref('password')).required().messages({
    'any.only': 'Password confirmation does not match.'
  }),
  is_active: Joi.boolean().default(true),
  role_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required().messages({
    'array.min': 'Assign at least one role to the user.'
  })
});

const updateValidator = Joi.object({
  name: Joi.string().max(255).required(),
  email: Joi.string().email().max(255).required(),
  phone: phoneValidator.allow(null, ''),
  password: Joi.string().min(8).pattern(passwordPattern).allow(null, '').messages({
    'string.pattern.base': 'Password must contain letters and numbers.',
    'string.min': 'Password must be at least 8 characters.'
  }),
  password_confirmation: Joi.any().valid(Joi.ref('password')).when('password', {
    is: Joi.string().min(1).required(),
    then: Joi.required(),
    otherwise: Joi.optional().allow(null, '')
  }).messages({
    'any.only': 'Password confirmation does not match.'
  }),
  is_active: Joi.boolean().required(),
  role_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required().messages({
    'array.min': 'Assign at least one role to the user.'
  })
});

// Original ERP: User::isProtected() — the one configured Super Admin
// account, not "whoever currently holds the Super Admin role".
const isProtectedEmail = (email) => email === config.superAdminEmail;

export const userController = {
  index: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 15;
      const offset = (page - 1) * limit;

      const result = await userRepository.findAll(
        { search: req.query.search, role: req.query.role, status: req.query.status },
        limit,
        offset
      );
      res.json({
        data: result.data,
        meta: {
          current_page: page,
          per_page: limit,
          total: result.total,
          last_page: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  show: async (req, res, next) => {
    try {
      const user = await userRepository.findById(req.params.user);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  },

  store: async (req, res, next) => {
    let connection;
    try {
      const { error, value } = createValidator.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        return res.status(422).json({
          message: 'Validation failed',
          errors: error.details.reduce((acc, curr) => ({ ...acc, [curr.path[0]]: curr.message }), {})
        });
      }

      // Check unique constraints
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [value.email]);
      if (existing.length > 0) {
        return res.status(422).json({ error: 'Email already exists' });
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();

      const id = await userRepository.create(connection, value);
      
      await connection.commit();
      res.status(201).json({ message: 'User created successfully', data: { id } });
    } catch (error) {
      if (connection) await connection.rollback();
      next(error);
    } finally {
      if (connection) connection.release();
    }
  },

  update: async (req, res, next) => {
    let connection;
    try {
      const userId = req.params.user;
      const { error, value } = updateValidator.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        return res.status(422).json({
          message: 'Validation failed',
          errors: error.details.reduce((acc, curr) => ({ ...acc, [curr.path[0]]: curr.message }), {})
        });
      }

      const target = await userRepository.findById(userId);
      if (!target) return res.status(404).json({ error: 'User not found' });

      // Original ERP: UpdateUserRequest::withValidator() — the protected
      // account may not lose its Super Admin role or be deactivated, and
      // nobody may deactivate their own account, even via this form.
      const protectionErrors = {};
      if (isProtectedEmail(target.email)) {
        const [[superAdminRole]] = await pool.query("SELECT id FROM roles WHERE name = 'Super Admin' LIMIT 1");
        if (!superAdminRole || !value.role_ids.includes(superAdminRole.id)) {
          protectionErrors.role_ids = 'The Super Admin role cannot be removed from this account.';
        }
        if (!value.is_active) {
          protectionErrors.is_active = 'This account cannot be deactivated.';
        }
      }
      if (Number(target.id) === Number(req.user.id) && !value.is_active) {
        protectionErrors.is_active = 'You cannot deactivate your own account.';
      }
      if (Object.keys(protectionErrors).length > 0) {
        return res.status(422).json({ message: 'Validation failed', errors: protectionErrors });
      }

      // Check unique constraints
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [value.email, userId]);
      if (existing.length > 0) {
        return res.status(422).json({ error: 'Email already exists' });
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();

      await userRepository.update(connection, userId, value);

      await connection.commit();
      res.json({ message: 'User updated successfully' });
    } catch (error) {
      if (connection) await connection.rollback();
      next(error);
    } finally {
      if (connection) connection.release();
    }
  },

  toggleStatus: async (req, res, next) => {
    try {
      const userId = req.params.user;
      const target = await userRepository.findById(userId);
      if (!target) return res.status(404).json({ error: 'User not found' });

      if (isProtectedEmail(target.email)) {
        return res.status(422).json({ error: 'The Super Admin account cannot be deactivated.' });
      }
      if (Number(target.id) === Number(req.user.id)) {
        return res.status(422).json({ error: 'You cannot deactivate your own account.' });
      }

      await userRepository.toggleStatus(userId);
      res.json({ message: 'User status toggled successfully' });
    } catch (error) {
      next(error);
    }
  },

  destroy: async (req, res, next) => {
    try {
      const userId = req.params.user;
      const target = await userRepository.findById(userId);
      if (!target) return res.status(404).json({ error: 'User not found' });

      if (isProtectedEmail(target.email)) {
        return res.status(422).json({ error: 'The Super Admin account cannot be deleted.' });
      }
      if (Number(target.id) === Number(req.user.id)) {
        return res.status(422).json({ error: 'You cannot delete your own account.' });
      }

      await userRepository.delete(userId);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};
