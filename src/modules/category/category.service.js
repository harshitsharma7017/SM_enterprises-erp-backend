import { pool } from '../../config/database.js';
import { categoryRepository } from './category.repository.js';
import { numberSeriesService } from '../../services/number-series.service.js';

export const categoryService = {
  
  findAll: async (filters) => {
    return await categoryRepository.findAll(filters);
  },

  findById: async (id) => {
    return await categoryRepository.findByIdIncludingRequiredRelations(id);
  },

  create: async (data, userId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Get the next code through the shared NumberSeriesService
      const code = await numberSeriesService.next(connection, 'category');

      // Prepare payload (ignoring unsupported fields implicitly)
      const payload = {
        code,
        name: data.name,
        status: data.status,
        remarks: data.remarks || null,
        created_by: userId,
        updated_by: userId
      };

      const categoryId = await categoryRepository.create(connection, payload);

      // Sync format_ids if provided
      await categoryRepository.syncFormats(connection, categoryId, data.format_ids || []);

      await connection.commit();
      
      return await categoryRepository.findByIdIncludingRequiredRelations(categoryId);
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  update: async (categoryId, data, userId) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const existing = await categoryRepository.findById(categoryId);
      if (!existing) {
        throw { status: 404, message: 'Category not found' };
      }

      // Code is implicitly ignored by not including it in the payload.
      // Description is strictly dropped as it wasn't validated by the rules.
      const payload = {
        name: data.name,
        status: data.status,
        remarks: data.remarks || null,
        updated_by: userId
      };

      await categoryRepository.update(connection, categoryId, payload);
      
      // Sync format_ids: if missing or [], will clear relations
      await categoryRepository.syncFormats(connection, categoryId, data.format_ids || []);

      await connection.commit();

      return await categoryRepository.findByIdIncludingRequiredRelations(categoryId);
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  },

  canDelete: async (categoryId) => {
    const productCount = await categoryRepository.countProducts(categoryId);
    if (productCount > 0) {
      return {
        allowed: false,
        reason: `This category is used by ${productCount} product(s). Reassign or delete them first.`
      };
    }

    const buyerCount = await categoryRepository.countBuyers(categoryId);
    if (buyerCount > 0) {
      return {
        allowed: false,
        reason: `This category is used by ${buyerCount} buyer(s). Remove it from them first.`
      };
    }

    const supplierCount = await categoryRepository.countSuppliers(categoryId);
    if (supplierCount > 0) {
      return {
        allowed: false,
        reason: `This category is used by ${supplierCount} supplier(s). Remove it from them first.`
      };
    }

    return { allowed: true, reason: null };
  },

  delete: async (categoryId) => {
    const existing = await categoryRepository.findById(categoryId);
    if (!existing) {
      throw { status: 404, message: 'Category not found' };
    }

    const check = await categoryService.canDelete(categoryId);
    if (!check.allowed) {
      throw { status: 400, message: check.reason };
    }

    await categoryRepository.softDelete(categoryId);
  },

  toggleStatus: async (categoryId, userId) => {
    const existing = await categoryRepository.findById(categoryId);
    if (!existing) {
      throw { status: 404, message: 'Category not found' };
    }

    const newStatus = existing.status === 'active' ? 'inactive' : 'active';
    await categoryRepository.toggleStatus(categoryId, newStatus, userId);
    
    return await categoryRepository.findByIdIncludingRequiredRelations(categoryId);
  }
};
