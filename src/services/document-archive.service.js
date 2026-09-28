/**
 * Frozen copies of issued documents (requirement 18). capture() renders the
 * record's PDF with the same builder as its /document endpoint and keeps it in
 * the storage layer (documents/<entity>/<number>-<timestamp>.pdf) with a row in
 * document_archive. It runs after the posting transaction has committed and
 * never throws: a failed archive is logged and the posting still stands (the
 * live document can always be regenerated).
 */
import crypto from 'crypto';
import { pool } from '../config/database.js';
import { storage } from './storage.service.js';
import { companyScope } from './company-scope.service.js';
import { operationalDocuments, commercialDocuments } from './operational-documents.js';

/** entity type → document label, builder, and how to read company / number. */
export const ARCHIVED_DOCUMENTS = {
  purchase_order: { label: 'Purchase Order', build: (id) => operationalDocuments.purchaseOrder(id), table: 'purchase_orders', number: 'po_num', permission: 'purchase-order.view', path: '/procurement/purchase-orders' },
  grn: { label: 'Goods Receipt Note', build: (id) => operationalDocuments.grn(id), table: 'inward_entries', number: 'inward_no', permission: 'inward-entry.view', path: '/procurement/grn' },
  quality_inspection: { label: 'Quality Inspection Report', build: (id) => operationalDocuments.qualityInspection(id), table: 'quality_inspections', number: 'qc_no', permission: 'inward-entry.view', path: '/quality-control' },
  supplier_return: { label: 'Return Challan', build: (id) => operationalDocuments.supplierReturn(id), table: 'supplier_returns', number: 'return_no', permission: 'supplier-return.view', path: '/procurement/returns' },
  debit_note: { label: 'Debit Note', build: (id) => operationalDocuments.debitNote(id), table: 'debit_notes', number: 'debit_note_no', permission: 'debit-note.view', path: '/finance/debit-notes' },
  material_issue: { label: 'Material Issue Slip', build: (id) => operationalDocuments.materialIssue(id), table: 'material_issues', number: 'issue_no', permission: 'material-issue.view', path: '/production/material-issues' },
  processing_record: { label: 'Processing Record', build: (id) => operationalDocuments.processing(id), table: 'processing_records', number: 'processing_no', permission: 'processing.view', path: '/production/processing' },
  proforma_invoice: { label: 'Proforma Invoice', build: (id) => commercialDocuments.proformaInvoice(id), table: 'proforma_invoices', number: 'pi_no', permission: 'proforma-invoice.view', path: '/finance/proforma-invoices' },
  dispatch: { label: 'Delivery Challan', build: (id) => operationalDocuments.deliveryChallan(id), table: 'dispatches', number: 'dispatch_no', permission: 'dispatch.view', path: '/dispatch' },
  invoice: { label: 'Invoice', build: (id) => commercialDocuments.invoice(id), table: 'invoices', number: 'invoice_no', permission: 'invoice.view', path: '/finance/invoices' },
};

const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const safe = (s) => String(s).replace(/[^A-Za-z0-9._-]+/g, '-');

const ROW_SELECT = `
  SELECT d.id, d.company_id, d.entity_type, d.entity_id, d.document_type, d.document_no, d.event, d.file_name,
         d.file_size, d.sha256, d.created_by, d.created_at, u.name AS creator_name,
         cmp.code AS company_code, COALESCE(cmp.short_name, cmp.name) AS company_label
  FROM document_archive d
  LEFT JOIN users u ON u.id = d.created_by
  LEFT JOIN companies cmp ON cmp.id = d.company_id
`;

export const documentArchive = {
  /** Archives the record's current PDF; logs and returns null on any failure. */
  capture: async (entityType, entityId, event, userId) => {
    const def = ARCHIVED_DOCUMENTS[entityType];
    if (!def) return null;
    try {
      const doc = await def.build(entityId);
      if (!doc) return null;
      const [[record]] = await pool.query(`SELECT company_id, ${def.number} AS number FROM ${def.table} WHERE id = ?`, [entityId]);
      const documentNo = record?.number || `${entityType}-${entityId}`;
      const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
      const key = `documents/${entityType}/${safe(documentNo)}-${stamp}.pdf`;
      await storage.put(key, doc.buffer, 'application/pdf');
      const [result] = await pool.query(`
        INSERT INTO document_archive (company_id, entity_type, entity_id, document_type, document_no, event, storage_key,
          file_name, file_size, sha256, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [record?.company_id ?? null, entityType, entityId, def.label, documentNo, event, key, doc.filename, doc.buffer.length,
        crypto.createHash('sha256').update(doc.buffer).digest('hex'), userId || null]);
      return result.insertId;
    } catch (error) {
      console.error(`[document-archive] ${entityType} ${entityId} (${event}) not archived:`, error.message);
      return null;
    }
  },

  list: async (filters = {}) => {
    let query = `${ROW_SELECT} WHERE 1 = 1`;
    const params = [];
    if (ARCHIVED_DOCUMENTS[filters.entity_type]) {
      query += ' AND d.entity_type = ?';
      params.push(filters.entity_type);
    }
    if (!blank(filters.entity_id)) {
      query += ' AND d.entity_id = ?';
      params.push(Number(filters.entity_id));
    }
    if (!blank(filters.date_from)) {
      query += ' AND d.created_at >= ?';
      params.push(`${filters.date_from} 00:00:00`);
    }
    if (!blank(filters.date_to)) {
      query += ' AND d.created_at <= ?';
      params.push(`${filters.date_to} 23:59:59`);
    }
    if (!blank(filters.search)) {
      query += ' AND (d.document_no LIKE ? OR d.document_type LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    const cf = companyScope.filterSql('d.company_id', companyScope.parseFilter(filters.company_id));
    query += `${cf.sql} ORDER BY d.id DESC`;
    params.push(...cf.params);
    const page = parseInt(filters.page, 10) > 0 ? parseInt(filters.page, 10) : 1;
    const limit = parseInt(filters.limit, 10) > 0 ? Math.min(parseInt(filters.limit, 10), 200) : 25;
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM (${query}) AS sub`, params);
    const [rows] = await pool.query(`${query} LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
    return { data: rows.map((r) => ({ ...r, record_path: ARCHIVED_DOCUMENTS[r.entity_type]?.path })), total, page, limit };
  },

  /** The archived file of one row (bytes + name), or null. */
  read: async (id) => {
    const [[row]] = await pool.query('SELECT * FROM document_archive WHERE id = ?', [id]);
    if (!row) return null;
    const buffer = await storage.get(row.storage_key);
    return { row, buffer };
  },
};
