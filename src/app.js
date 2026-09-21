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

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());
app.use(morgan('dev'));

// Static file serving for uploads (matches Laravel public disk structure)
app.use('/storage', express.static(path.join(__dirname, '../public/storage')));

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


// Centralized error handling
app.use(errorHandler);

export default app;
