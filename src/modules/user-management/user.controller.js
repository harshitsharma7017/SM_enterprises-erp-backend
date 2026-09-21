import { userRepository } from './user.repository.js';
import { pool } from '../../config/database.js';
import Joi from 'joi';

const createValidator = Joi.object({
  name: Joi.string().max(255).required(),
  username: Joi.string().max(255).required(),
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(8).required(),
  is_active: Joi.boolean().default(true),
  role_ids: Joi.array().items(Joi.number().integer().positive()).allow(null)
});

const updateValidator = Joi.object({
  name: Joi.string().max(255).required(),
  username: Joi.string().max(255).required(),
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(8).allow(null, ''),
  is_active: Joi.boolean().required(),
  role_ids: Joi.array().items(Joi.number().integer().positive()).allow(null)
});

export const userController = {
  index: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 15;
      const offset = (page - 1) * limit;

      const result = await userRepository.findAll(limit, offset);
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
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ? OR username = ?', [value.email, value.username]);
      if (existing.length > 0) {
        return res.status(422).json({ error: 'Email or Username already exists' });
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

      // Check unique constraints
      const [existing] = await pool.query('SELECT id FROM users WHERE (email = ? OR username = ?) AND id != ?', [value.email, value.username, userId]);
      if (existing.length > 0) {
        return res.status(422).json({ error: 'Email or Username already exists' });
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
      await userRepository.toggleStatus(req.params.user);
      res.json({ message: 'User status toggled successfully' });
    } catch (error) {
      next(error);
    }
  },

  destroy: async (req, res, next) => {
    try {
      await userRepository.delete(req.params.user);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};
