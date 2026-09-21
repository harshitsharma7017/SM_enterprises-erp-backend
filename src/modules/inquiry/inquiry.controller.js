import { inquiryService } from './inquiry.service.js';
import { writeSimplePdf } from '../../utils/pdf-writer.js';
import { writeSimpleXlsx } from '../../utils/xlsx-writer.js';

// "INQ/2026-27/001.pdf" -> "INQ-2026-27-001.pdf" — matches
// InquiryController::documentFilename() exactly.
const documentFilename = (inquiry, ext) => `${String(inquiry.inquiry_no).replace(/\//g, '-')}.${ext}`;

const buildDocumentLines = (inquiry) => {
  const lines = [];
  lines.push(`Inquiry ${inquiry.inquiry_no}`);
  lines.push(`Financial Year: ${inquiry.financial_year}`);
  lines.push('');
  lines.push(`Date: ${inquiry.inquiry_date ? String(inquiry.inquiry_date).slice(0, 10) : ''}`);
  lines.push(`Status: ${inquiry.status}`);
  lines.push(`Buyer: ${inquiry.buyer_company_name || ''} ${inquiry.buyer_display_code ? `(${inquiry.buyer_display_code})` : ''}`);
  lines.push(`Buyer Ref: ${inquiry.buyer_ref || ''}`);
  lines.push(`Category: ${inquiry.category_name || ''}`);
  lines.push(`Order Format: ${inquiry.format_name || ''}`);
  lines.push(`Agent: ${inquiry.agent_name || ''}`);
  lines.push(`Currency: ${inquiry.currency_iso_code || ''}`);
  lines.push(`Source: ${inquiry.source_name || ''}`);
  lines.push('');
  lines.push('Delivery Details:');
  lines.push(inquiry.delivery_details || '-');
  lines.push('Packing Details:');
  lines.push(inquiry.packing_details || '-');
  lines.push('');
  lines.push('Items:');
  lines.push('-'.repeat(90));
  (inquiry.items || []).forEach((item, idx) => {
    lines.push(
      `${idx + 1}. ${item.design_no || ''}  Product: ${item.product_name || ''}  Supplier: ${item.supplier_company_name || ''}`
    );
    lines.push(
      `   Unit: ${item.unit || ''}  Price: ${item.price ?? ''}  Qty: ${item.qty ?? 0}  Amount: ${item.amount ?? 0}  Status: ${item.status}`
    );
    (item.colours || []).forEach((colour) => {
      const sizeSummary = (colour.sizes || []).map((s) => `${s.size}:${s.qty}`).join(', ');
      lines.push(`     Colour: ${colour.colour || '-'}  Sizes: ${sizeSummary || '-'}`);
    });
  });
  lines.push('-'.repeat(90));
  lines.push('');
  lines.push('Follow-ups:');
  (inquiry.follow_ups || []).forEach((f) => {
    lines.push(`- ${String(f.follow_up_date).slice(0, 10)} (${f.creator_name || ''}): ${f.comment}`);
  });
  if (inquiry.remarks) {
    lines.push('');
    lines.push(`Remarks: ${inquiry.remarks}`);
  }
  return lines;
};

const buildDocumentRows = (inquiry) => {
  const rows = [];
  rows.push(['Inquiry No', inquiry.inquiry_no]);
  rows.push(['Financial Year', inquiry.financial_year]);
  rows.push(['Date', inquiry.inquiry_date ? String(inquiry.inquiry_date).slice(0, 10) : '']);
  rows.push(['Status', inquiry.status]);
  rows.push(['Buyer', inquiry.buyer_company_name || '']);
  rows.push(['Category', inquiry.category_name || '']);
  rows.push(['Order Format', inquiry.format_name || '']);
  rows.push(['Currency', inquiry.currency_iso_code || '']);
  rows.push([]);
  rows.push(['#', 'Design No', 'Product', 'Supplier', 'Unit', 'Price', 'Qty', 'Amount', 'Status']);
  (inquiry.items || []).forEach((item, idx) => {
    rows.push([
      idx + 1, item.design_no || '', item.product_name || '', item.supplier_company_name || '',
      item.unit || '', item.price === null ? '' : Number(item.price),
      Number(item.qty || 0), Number(item.amount || 0), item.status
    ]);
  });
  return rows;
};

export const inquiryController = {
  index: async (req, res, next) => {
    try {
      const filters = {
        search: req.query.search,
        status: req.query.status,
        buyer_id: req.query.buyer_id,
        sort: req.query.sort,
        direction: req.query.direction,
        page: req.query.page || 1,
        limit: req.query.limit || 15
      };

      const result = await inquiryService.findAll(filters);

      res.status(200).json({
        success: true,
        message: 'Inquiries retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      const formData = await inquiryService.getFormData();
      res.status(200).json({
        success: true,
        message: 'Inquiry form data retrieved successfully',
        data: formData
      });
    } catch (error) {
      next(error);
    }
  },

  store: async (req, res, next) => {
    try {
      const inquiry = await inquiryService.create(req.body, req.user.id);
      res.status(201).json({
        success: true,
        message: `Inquiry "${inquiry.inquiry_no}" created successfully.`,
        data: { inquiry }
      });
    } catch (error) {
      next(error);
    }
  },

  show: async (req, res, next) => {
    try {
      const inquiry = await inquiryService.findById(req.params.id);
      if (!inquiry) {
        return res.status(404).json({ success: false, message: 'Inquiry not found' });
      }
      res.status(200).json({
        success: true,
        message: 'Inquiry retrieved successfully',
        data: { inquiry }
      });
    } catch (error) {
      next(error);
    }
  },

  edit: async (req, res, next) => {
    try {
      const inquiry = await inquiryService.findById(req.params.id);
      if (!inquiry) {
        return res.status(404).json({ success: false, message: 'Inquiry not found' });
      }
      const formData = await inquiryService.getFormData();
      res.status(200).json({
        success: true,
        message: 'Inquiry form data retrieved successfully',
        data: { inquiry, ...formData }
      });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const inquiry = await inquiryService.update(req.params.id, req.body, req.user.id);
      res.status(200).json({
        success: true,
        message: `Inquiry "${inquiry.inquiry_no}" updated successfully.`,
        data: { inquiry }
      });
    } catch (error) {
      if (error.status === 404) {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  },

  destroy: async (req, res, next) => {
    try {
      const existing = await inquiryService.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Inquiry not found' });
      }
      const inquiryNo = existing.inquiry_no;

      await inquiryService.delete(req.params.id);

      res.status(200).json({
        success: true,
        message: `Inquiry "${inquiryNo}" deleted successfully.`
      });
    } catch (error) {
      if (error.status === 404) {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  },

  pdf: async (req, res, next) => {
    try {
      const inquiry = await inquiryService.findById(req.params.id);
      if (!inquiry) {
        return res.status(404).json({ success: false, message: 'Inquiry not found' });
      }

      const buffer = writeSimplePdf({ lines: buildDocumentLines(inquiry) });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${documentFilename(inquiry, 'pdf')}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  },

  xlsx: async (req, res, next) => {
    try {
      const inquiry = await inquiryService.findById(req.params.id);
      if (!inquiry) {
        return res.status(404).json({ success: false, message: 'Inquiry not found' });
      }

      const buffer = writeSimpleXlsx({ sheetName: 'Inquiry', rows: buildDocumentRows(inquiry) });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${documentFilename(inquiry, 'xlsx')}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  },

  storeSource: async (req, res, next) => {
    try {
      const source = await inquiryService.storeSource(req.body.name);
      res.status(200).json({ id: source.id, name: source.name });
    } catch (error) {
      next(error);
    }
  },

  products: async (req, res, next) => {
    try {
      const products = await inquiryService.products(req.query.category_id);
      res.status(200).json(products);
    } catch (error) {
      next(error);
    }
  },

  suppliers: async (req, res, next) => {
    try {
      const suppliers = await inquiryService.suppliers(req.query.category_id);
      res.status(200).json(suppliers);
    } catch (error) {
      next(error);
    }
  }
};
