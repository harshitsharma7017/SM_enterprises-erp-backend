import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { authService } from '../services/auth.service.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing or invalid token'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing token'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Verify user still exists and is active using service layer
    const user = await authService.getCurrentUser(decoded.id);

    // Attach user to request
    req.user = user;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Unauthorized: Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token signature' });
    }
    
    // For service errors (like user not found or inactive), pass down the status
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    next(error);
  }
};
