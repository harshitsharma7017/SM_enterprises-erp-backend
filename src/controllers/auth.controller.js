import { authService } from '../services/auth.service.js';

export const authController = {
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  me: async (req, res, next) => {
    try {
      // req.user is verified and attached by the middleware
      res.status(200).json({
        success: true,
        message: 'Current user retrieved successfully',
        data: { user: req.user }
      });
    } catch (error) {
      next(error);
    }
  },

  logout: async (req, res, next) => {
    try {
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }
};
