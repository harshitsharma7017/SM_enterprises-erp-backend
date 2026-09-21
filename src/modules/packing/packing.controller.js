import { pool } from '../../config/database.js';
import { exportDocumentRepository } from '../export-document/export-document.repository.js';

export const packingController = {
  index: async (req, res, next) => {
    try {
      // Packing view usually just lists Export Documents that can have packing.
      // We will mimic Export Document index but maybe with some specific joins if needed.
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 15;
      const offset = (page - 1) * limit;

      const [countResult] = await pool.query('SELECT COUNT(*) as total FROM export_documents WHERE deleted_at IS NULL');
      const total = countResult[0].total;

      const [rows] = await pool.query(`
        SELECT ed.*, 
               b.company_name as buyer_name,
               c.iso_code as currency_code
        FROM export_documents ed
        LEFT JOIN buyers b ON b.id = ed.buyer_id
        LEFT JOIN currencies c ON c.id = ed.currency_id
        WHERE ed.deleted_at IS NULL
        ORDER BY ed.id DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      res.json({
        data: rows,
        meta: {
          current_page: page,
          per_page: limit,
          total: total,
          last_page: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  show: async (req, res, next) => {
    try {
      const document = await exportDocumentRepository.findById(req.params.id);
      if (!document) {
        return res.status(404).json({ error: 'Export Document not found' });
      }

      // Return the export document with its nested cartons payload
      res.json({ data: document });
    } catch (error) {
      next(error);
    }
  }
};
