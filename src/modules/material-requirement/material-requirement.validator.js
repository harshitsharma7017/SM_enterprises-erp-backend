const reject = (res, errors) => res.status(400).json({ success: false, message: 'Validation failed', errors });

export const materialRequirementValidator = {
  // POST /generate — { brand_projection_id }
  validateGenerate: (req, res, next) => {
    const id = Number(req.body?.brand_projection_id);
    if (!Number.isInteger(id) || id <= 0) return reject(res, ['A brand projection is required']);
    req.body.brand_projection_id = id;
    next();
  },

  // POST /:id/close — { remarks? }
  validateClose: (req, res, next) => {
    const remarks = req.body?.remarks;
    if (remarks !== undefined && remarks !== null && (typeof remarks !== 'string' || remarks.length > 2000)) {
      return reject(res, ['Remarks cannot exceed 2000 characters']);
    }
    next();
  },
};
