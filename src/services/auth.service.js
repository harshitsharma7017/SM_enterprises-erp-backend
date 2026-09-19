import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authRepository } from '../repositories/auth.repository.js';
import { config } from '../config/env.js';

export const authService = {
  login: async (email, password) => {
    const user = await authRepository.findUserByEmail(email);

    if (!user) {
      const error = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }

    if (!user.is_active) {
      const error = new Error('Account is inactive');
      error.status = 403;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.status = 401;
      throw error;
    }

    const payload = {
      id: user.id,
      email: user.email
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_active: user.is_active
      }
    };
  },

  getCurrentUser: async (userId) => {
    const user = await authRepository.findUserById(userId);
    
    if (!user) {
      const error = new Error('User not found');
      error.status = 404;
      throw error;
    }
    
    if (!user.is_active) {
      const error = new Error('Account is inactive');
      error.status = 403;
      throw error;
    }
    
    return user;
  }
};
