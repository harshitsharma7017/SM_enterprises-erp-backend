import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { config } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import healthRoutes from './routes/health.routes.js';

import authRoutes from './routes/auth.routes.js';
import categoryRoutes from './modules/category/category.routes.js';
import orderFormatRoutes from './modules/order-format/order-format.routes.js';
import productRoutes from './modules/product/product.routes.js';
import buyerRoutes from './modules/buyer/buyer.routes.js';
import supplierRoutes from './modules/supplier/supplier.routes.js';
import jobberRoutes from './modules/jobber/jobber.routes.js';
import agentRoutes from './modules/agent/agent.routes.js';
import fobValueRoutes from './modules/fob-value/fob-value.routes.js';
import markupRoutes from './modules/markup/markup.routes.js';
import brandRoutes from './modules/brand/brand.routes.js';
import materialTypeRoutes from './modules/material-type/material-type.routes.js';
import uomRoutes from './modules/uom/uom.routes.js';
import inquiryRoutes from './modules/inquiry/inquiry.routes.js';
import orderConfirmationRoutes from './modules/order-confirmation/order-confirmation.routes.js';
import purchaseOrderRoutes from './modules/purchase-order/purchase-order.routes.js';
import inwardEntryRoutes from './modules/inward-entry/inward-entry.routes.js';
import exportDocumentRoutes from './modules/export-document/export-document.routes.js';

// Phase 21 & 22 Imports
import packingRoutes from './modules/packing/packing.routes.js';
import financeRoutes from './modules/finance/finance.routes.js';
import reportRoutes from './modules/report/report.routes.js';
import companyProfileRoutes from './modules/company-profile/company-profile.routes.js';
import userRoutes from './modules/user-management/user.routes.js';
import roleRoutes from './modules/user-management/role.routes.js';
import companyRoutes from './modules/company/company.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());
app.use(morgan('dev'));

// Static file serving for uploads (matches Laravel public disk structure).
// helmet()'s default Cross-Origin-Resource-Policy: same-origin blocks the
// frontend (a different origin/port) from embedding these files directly —
// e.g. <img src> for the Company Profile logo preview. Files served under
// /storage are meant to be loaded cross-origin by design, so that one
// header is relaxed here; the JSON API's helmet() protection elsewhere is
// untouched.
app.use('/storage', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../public/storage')));

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/masters/categories', categoryRoutes);
app.use('/api/masters/formats', orderFormatRoutes);
app.use('/api/masters/products', productRoutes);
app.use('/api/masters/buyers', buyerRoutes);
app.use('/api/masters/suppliers', supplierRoutes);
app.use('/api/masters/jobbers', jobberRoutes);
app.use('/api/masters/agents', agentRoutes);
app.use('/api/masters/fob-values', fobValueRoutes);
app.use('/api/masters/markups', markupRoutes);
app.use('/api/masters/brands', brandRoutes);
app.use('/api/masters/material-types', materialTypeRoutes);
app.use('/api/masters/uoms', uomRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/sales/order-confirmations', orderConfirmationRoutes);
app.use('/api/procurement/purchase-orders', purchaseOrderRoutes);
app.use('/api/procurement/inward-entries', inwardEntryRoutes);
app.use('/api/export/documents', exportDocumentRoutes);

// Phase 21 & 22 Routes
app.use('/api/export/packing', packingRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/user-management/company-profile', companyProfileRoutes);
app.use('/api/user-management/users', userRoutes);
app.use('/api/user-management', roleRoutes);
app.use('/api/administration/companies', companyRoutes);

// Centralized error handling
app.use(errorHandler);

export default app;
