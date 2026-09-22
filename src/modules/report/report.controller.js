import { reportRepository } from './report.repository.js';

// Original ERP: neither ReportsController::index() nor ::outstanding() are
// paginated lists — index() returns dashboard stat counts, outstanding()
// returns the full (unpaginated) Purchase Order / Export Document sets with
// computed totals. Matches that shape rather than the generic list envelope.
export const reportController = {
  index: async (req, res, next) => {
    try {
      const data = await reportRepository.getIndex();
      res.json({ data });
    } catch (error) {
      next(error);
    }
  },

  outstanding: async (req, res, next) => {
    try {
      const data = await reportRepository.getOutstanding();
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
};
