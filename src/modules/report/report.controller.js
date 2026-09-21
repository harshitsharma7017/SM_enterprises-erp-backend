import { reportRepository } from './report.repository.js';

const getPagination = (req) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 15;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const sendPaginatedResponse = (res, result, page, limit) => {
  res.json({
    data: result.data,
    meta: {
      current_page: page,
      per_page: limit,
      total: result.total,
      last_page: Math.ceil(result.total / limit)
    }
  });
};

export const reportController = {
  index: async (req, res, next) => {
    try {
      const { page, limit, offset } = getPagination(req);
      const result = await reportRepository.getIndex(req.query, limit, offset);
      sendPaginatedResponse(res, result, page, limit);
    } catch (error) {
      next(error);
    }
  },

  outstanding: async (req, res, next) => {
    try {
      const { page, limit, offset } = getPagination(req);
      const result = await reportRepository.getOutstanding(req.query, limit, offset);
      sendPaginatedResponse(res, result, page, limit);
    } catch (error) {
      next(error);
    }
  }
};
