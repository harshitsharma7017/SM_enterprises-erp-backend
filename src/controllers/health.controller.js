import { pool } from '../config/database.js';

export const checkHealth = async (req, res, next) => {
  try {
    // Simple connection test
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    
    res.json({
      success: true,
      message: 'Garment ERP API is running',
      database: 'connected'
    });
  } catch (error) {
    next(error);
  }
};
