import { materialIssueService } from './material-issue.service.js';
import { materialIssueRepository } from './material-issue.repository.js';
import { processingService } from './processing.service.js';
import { processingRepository } from './processing.repository.js';

const pick = (query, keys) => Object.fromEntries(keys.map((k) => [k, query[k]]));
const list = (res, result) => res.json({ success: true, data: result.rows, meta: { total: result.total, page: result.page, limit: result.limit } });
const FILTERS = ['company_id', 'status', 'location_id', 'product_id', 'lot_id', 'lot', 'date_from', 'date_to', 'search', 'page', 'limit'];

// Wraps a handler so errors reach the global error handler.
const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (error) {
    next(error);
  }
};

const sendIssue = async (res, id, status, message) => {
  const issue = await materialIssueRepository.findById(id);
  if (!issue) return res.status(404).json({ success: false, message: 'Material issue not found' });
  res.status(status).json({ success: true, message: message?.(issue), data: issue });
};

const sendRecord = async (res, id, status, message) => {
  const record = await processingRepository.findById(id);
  if (!record) return res.status(404).json({ success: false, message: 'Processing record not found' });
  res.status(status).json({ success: true, message: message?.(record), data: record });
};

export const productionController = {
  // ---------------- Material issues ----------------
  issues: handle(async (req, res) => list(res, await materialIssueRepository.findAll(pick(req.query, FILTERS)))),
  issueFormData: handle(async (req, res) => res.json({ success: true, data: await materialIssueService.formData(req.query) })),
  issue: handle(async (req, res) => sendIssue(res, req.params.id, 200)),
  createIssue: handle(async (req, res) => {
    const id = await materialIssueService.create(req.body, req.user.id);
    await sendIssue(res, id, 201, (i) => `Material issue ${i.issue_no} saved as draft.`);
  }),
  updateIssue: handle(async (req, res) => {
    await materialIssueService.update(req.params.id, req.body, req.user.id);
    await sendIssue(res, req.params.id, 200, () => 'Material issue updated.');
  }),
  postIssue: handle(async (req, res) => {
    await materialIssueService.post(req.params.id, req.user.id);
    await sendIssue(res, req.params.id, 200, (i) => `Material issue ${i.issue_no} issued — stock reduced.`);
  }),
  cancelIssue: handle(async (req, res) => {
    await materialIssueService.cancel(req.params.id, req.user.id);
    await sendIssue(res, req.params.id, 200, (i) => `Material issue ${i.issue_no} cancelled.`);
  }),

  // ---------------- Processing ----------------
  records: handle(async (req, res) => list(res, await processingRepository.findAll(pick(req.query, FILTERS)))),
  recordFormData: handle(async (req, res) => {
    const companyId = Number(req.query.company_id);
    if (!Number.isInteger(companyId) || companyId <= 0) {
      return res.status(422).json({ success: false, message: 'company_id is required' });
    }
    res.json({ success: true, data: await processingService.outputOptions(companyId) });
  }),
  record: handle(async (req, res) => sendRecord(res, req.params.id, 200)),
  createRecord: handle(async (req, res) => {
    const id = await processingService.create(req.body, req.user.id);
    await sendRecord(res, id, 201, (r) => `Processing ${r.processing_no} started.`);
  }),
  updateRecord: handle(async (req, res) => {
    await processingService.update(req.params.id, req.body, req.user.id);
    await sendRecord(res, req.params.id, 200, () => 'Processing record updated.');
  }),
  completeRecord: handle(async (req, res) => {
    await processingService.complete(req.params.id, req.body, req.user.id);
    await sendRecord(res, req.params.id, 200, (r) => `Processing ${r.processing_no} completed.`);
  }),
};
